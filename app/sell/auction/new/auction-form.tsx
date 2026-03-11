"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  createAuction, updateAuction, deleteAuction,
  uploadAuctionImage, deleteAuctionImage, checkAuctionSlugAvailable,
  getAuctionImagePublicUrl,
  type AuctionLot,
} from "@/lib/api/auctions-client"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, ArrowRight, Save, Send, Loader2, Upload, X, Trash2 } from "lucide-react"

interface CategoryOption {
  id: number
  name: string
}

interface ExistingImage {
  id: number
  storage_path: string
  sort_order: number
  is_cover: boolean
}

interface AuctionFormProps {
  categories: CategoryOption[]
  editMode?: boolean
  auction?: AuctionLot
  existingImages?: ExistingImage[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80)
}

const STEPS = [
  { num: 1, label: "Detalii" },
  { num: 2, label: "Descriere & Imagini" },
  { num: 3, label: "Pret & Termen" },
]

export function AuctionForm({ categories, editMode = false, auction, existingImages = [] }: AuctionFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: auction?.title ?? "",
    categoryId: auction?.category_id ? String(auction.category_id) : "",
    description: auction?.description ?? "",
    startingPrice: auction?.starting_price ? String(auction.starting_price) : "",
    reservePrice: auction?.reserve_price ? String(auction.reserve_price) : "",
    bidIncrement: auction?.bid_increment ? String(auction.bid_increment) : "100",
    currency: (auction?.currency ?? "EUR") as "EUR" | "RON",
    startsAt: auction?.starts_at ? auction.starts_at.slice(0, 16) : "",
    endsAt: auction?.ends_at ? auction.ends_at.slice(0, 16) : "",
  })

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  const remainingExisting = existingImages.filter((img) => !deletedImageIds.has(img.id))

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = "Titlul este obligatoriu"
    if (!form.categoryId) e.categoryId = "Selectati o categorie"
    if (step >= 2 && !form.description.trim()) e.description = "Descrierea este obligatorie"
    if (step >= 3) {
      const sp = parseFloat(form.startingPrice)
      if (!sp || sp <= 0) e.startingPrice = "Pretul de start trebuie sa fie pozitiv"
      if (form.reservePrice) {
        const rp = parseFloat(form.reservePrice)
        if (rp < sp) e.reservePrice = "Pretul rezerva trebuie sa fie >= pretul de start"
      }
      const bi = parseFloat(form.bidIncrement)
      if (!bi || bi <= 0) e.bidIncrement = "Incrementul trebuie sa fie pozitiv"
      if (!form.endsAt) e.endsAt = "Termenul limita este obligatoriu"
      else if (new Date(form.endsAt) <= new Date()) e.endsAt = "Termenul trebuie sa fie in viitor"
    }
    return e
  }

  function nextStep() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) setStep((s) => Math.min(s + 1, 3))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setNewFiles((prev) => [...prev, ...files])
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newPreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function markExistingForDeletion(imageId: number) {
    setDeletedImageIds((prev) => new Set(prev).add(imageId))
  }

  async function generateUniqueSlug(title: string): Promise<string> {
    let slug = slugify(title)
    if (!slug) slug = "licitatie"
    const available = await checkAuctionSlugAvailable(slug)
    if (available) return slug
    const suffix = Math.random().toString(36).substring(2, 7)
    return `${slug}-${suffix}`
  }

  function computeStatus(asDraft: boolean): string {
    if (asDraft) return "draft"
    const now = new Date()
    const startsAt = form.startsAt ? new Date(form.startsAt) : now
    if (startsAt > now) return "scheduled"
    return "active"
  }

  async function submit(asDraft: boolean) {
    const e = validate()
    setErrors(e)
    setGlobalError(null)
    if (Object.keys(e).length > 0) return
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setGlobalError("Nu esti autentificat."); setSaving(false); return }

      const startingPrice = parseFloat(form.startingPrice)
      const status = computeStatus(asDraft)

      if (editMode && auction) {
        // --- UPDATE flow ---
        const updates: Record<string, unknown> = {
          title: form.title.trim(),
          category_id: form.categoryId ? Number(form.categoryId) : null,
          description: form.description.trim() || null,
          starting_price: startingPrice,
          current_price: auction.current_price === auction.starting_price ? startingPrice : auction.current_price,
          reserve_price: form.reservePrice ? parseFloat(form.reservePrice) : null,
          bid_increment: parseFloat(form.bidIncrement) || 100,
          currency: form.currency,
          starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : auction.starts_at,
          ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : auction.ends_at,
        }

        if (form.title.trim() !== auction.title) {
          updates.slug = await generateUniqueSlug(form.title.trim())
        }

        // Allow status change only from draft/scheduled
        if (auction.status === "draft" || auction.status === "scheduled") {
          updates.status = status
        }

        const res = await updateAuction(auction.id, updates)
        if (!res.success) { setGlobalError(res.error ?? "Eroare la actualizare."); setSaving(false); return }

        // Delete removed images
        for (const imgId of deletedImageIds) {
          const img = existingImages.find((i) => i.id === imgId)
          if (img) await deleteAuctionImage(img.id, img.storage_path)
        }

        // Upload new images
        const baseOrder = remainingExisting.length
        for (let i = 0; i < newFiles.length; i++) {
          await uploadAuctionImage(auction.id, newFiles[i], baseOrder + i, baseOrder + i === 0 && remainingExisting.length === 0)
        }

        const finalSlug = (updates.slug as string) ?? auction.slug
        router.push(`/auctions/${finalSlug}-${auction.id}`)
        router.refresh()
      } else {
        // --- CREATE flow ---
        const slug = await generateUniqueSlug(form.title.trim())

        const res = await createAuction({
          seller_id: user.id,
          title: form.title.trim(),
          slug,
          category_id: form.categoryId ? Number(form.categoryId) : null,
          description: form.description.trim() || null,
          starting_price: startingPrice,
          current_price: startingPrice,
          reserve_price: form.reservePrice ? parseFloat(form.reservePrice) : null,
          bid_increment: parseFloat(form.bidIncrement) || 100,
          currency: form.currency,
          starts_at: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
          ends_at: new Date(form.endsAt).toISOString(),
          status,
        })

        if (!res.success || !res.data) { setGlobalError(res.error ?? "Eroare la creare."); setSaving(false); return }

        // Upload images -- first image is the cover
        for (let i = 0; i < newFiles.length; i++) {
          await uploadAuctionImage(res.data.id, newFiles[i], i, i === 0)
        }

        router.push(`/auctions/${slug}-${res.data.id}`)
        router.refresh()
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Eroare neasteptata.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!auction) return
    setDeleting(true)
    const res = await deleteAuction(auction.id)
    if (res.success) {
      router.push("/account?tab=auctions")
      router.refresh()
    } else {
      setGlobalError(res.error ?? "Eroare la stergere.")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator -- numbers-only on mobile */}
      {!editMode && (
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.num}
              </div>
              <span className={`hidden text-sm sm:inline ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-border sm:mx-2 sm:w-8" />}
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {editMode ? "Editeaza Licitatia" : step === 1 ? "Detalii de baza" : step === 2 ? "Descriere & Imagini" : "Pret & Termen Limita"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 or edit: basic info */}
          {(step === 1 || editMode) && (
            <>
              <div>
                <Label htmlFor="title">Titlu licitatie *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: Macara Turn Liebherr 200 EC-H" className="mt-1" />
                {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
              </div>
              <div>
                <Label>Categorie *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selectati categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="mt-1 text-sm text-destructive">{errors.categoryId}</p>}
              </div>
            </>
          )}

          {/* Step 2 or edit: description + images */}
          {(step === 2 || editMode) && (
            <>
              <div>
                <Label htmlFor="description">Descriere detaliata *</Label>
                <Textarea id="description" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrieti echipamentul, starea, specificatiile tehnice..." className="mt-1" />
                {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Existing images (edit mode) */}
              {remainingExisting.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Imagini existente</p>
                  <div className="flex flex-wrap gap-3">
                    {remainingExisting.map((img) => (
                      <div key={img.id} className="group relative h-24 w-32 overflow-hidden rounded-lg border">
                        <Image src={getAuctionImagePublicUrl(img.storage_path)} alt="Imagine licitatie" fill className="object-cover" sizes="128px" />
                        <button type="button" onClick={() => markExistingForDeletion(img.id)} className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New file previews */}
              {newPreviews.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Imagini noi</p>
                  <div className="flex flex-wrap gap-3">
                    {newPreviews.map((url, i) => (
                      <div key={i} className="group relative h-24 w-32 overflow-hidden rounded-lg border">
                        <Image src={url} alt={`Preview ${i + 1}`} fill className="object-cover" sizes="128px" />
                        <button type="button" onClick={() => removeNewFile(i)} className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload zone */}
              <div onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/30">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click pentru a adauga imagini</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 5MB)</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />
            </>
          )}

          {/* Step 3 or edit: pricing + timing */}
          {(step === 3 || editMode) && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startingPrice">Pret de start *</Label>
                  <Input id="startingPrice" type="number" min={0} step="0.01" value={form.startingPrice} onChange={(e) => setForm({ ...form, startingPrice: e.target.value })} placeholder="0" className="mt-1" />
                  {errors.startingPrice && <p className="mt-1 text-sm text-destructive">{errors.startingPrice}</p>}
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as "EUR" | "RON" })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RON">RON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reservePrice">Pret rezerva (optional)</Label>
                  <Input id="reservePrice" type="number" min={0} step="0.01" value={form.reservePrice} onChange={(e) => setForm({ ...form, reservePrice: e.target.value })} placeholder="Pretul minim acceptat" className="mt-1" />
                  {errors.reservePrice && <p className="mt-1 text-sm text-destructive">{errors.reservePrice}</p>}
                </div>
                <div>
                  <Label htmlFor="bidIncrement">Increment oferta *</Label>
                  <Input id="bidIncrement" type="number" min={1} step="1" value={form.bidIncrement} onChange={(e) => setForm({ ...form, bidIncrement: e.target.value })} placeholder="100" className="mt-1" />
                  {errors.bidIncrement && <p className="mt-1 text-sm text-destructive">{errors.bidIncrement}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startsAt">Incepe la (optional)</Label>
                  <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="endsAt">Termen limita *</Label>
                  <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1" />
                  {errors.endsAt && <p className="mt-1 text-sm text-destructive">{errors.endsAt}</p>}
                </div>
              </div>
            </>
          )}

          {/* Global error */}
          {globalError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {globalError}
            </div>
          )}

          {/* Navigation + Actions */}
          <div className="flex items-center justify-between pt-4">
            {!editMode && (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Inapoi
              </Button>
            )}

            <div className="flex gap-2 ml-auto">
              {(step === 3 || editMode) && (
                <>
                  <Button variant="outline" onClick={() => submit(true)} disabled={saving || deleting}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    {editMode ? "Salveaza" : "Salveaza Ciorna"}
                  </Button>
                  {!editMode && (
                    <Button onClick={() => submit(false)} disabled={saving || deleting} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                      Publica
                    </Button>
                  )}
                </>
              )}
              {!editMode && step < 3 && (
                <Button onClick={nextStep} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Urmatorul <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Delete button (edit mode only) */}
          {editMode && auction && (
            <div className="border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={saving || deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-1 h-4 w-4" />
                    Sterge Licitatia
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sterge licitatia?</AlertDialogTitle>
                    <AlertDialogDescription>Aceasta actiune este ireversibila. Licitatia si toate imaginile asociate vor fi sterse permanent.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sterge Definitiv</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
