"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  createListing, updateListing, deleteListing,
  uploadListingImage, deleteListingImage, checkSlugAvailable,
  getImagePublicUrl,
  type Listing,
} from "@/lib/api/listings-client"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Upload, X, Trash2 } from "lucide-react"

const UNITS = [
  { value: "TON", label: "Tone (TON)" },
  { value: "KG", label: "Kilograme (KG)" },
  { value: "M3", label: "Metri cubi (M3)" },
  { value: "BUC", label: "Bucati (BUC)" },
  { value: "ML", label: "Metri liniari (ML)" },
]

const CURRENCIES = [
  { value: "RON", label: "RON" },
  { value: "EUR", label: "EUR" },
]

interface CategoryOption {
  id: number
  name: string
}

// Existing image from DB (edit mode)
interface ExistingImage {
  id: number
  storage_path: string
  display_order: number
}

interface ListingFormProps {
  categories: CategoryOption[]
  // Edit mode props
  editMode?: boolean
  listing?: Listing
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

export function ListingForm({ categories, editMode = false, listing, existingImages = [] }: ListingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: listing?.title ?? "",
    categoryId: listing?.category_id ? String(listing.category_id) : "",
    description: listing?.description ?? "",
    price: listing?.price ? String(listing.price) : "",
    unit: listing?.unit ?? "TON",
    currency: listing?.currency ?? "RON",
    availableQty: listing?.available_qty ? String(listing.available_qty) : "0",
    location: listing?.location ?? "",
    isActive: listing?.is_active ?? true,
  })

  // New files selected by the user (not yet uploaded)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  // Existing images that have been marked for deletion
  const [deletedImageIds, setDeletedImageIds] = useState<Set<number>>(new Set())

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingExisting = existingImages.filter((img) => !deletedImageIds.has(img.id))

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setNewFiles((prev) => [...prev, ...files])
    const previews = files.map((f) => URL.createObjectURL(f))
    setNewPreviews((prev) => [...prev, ...previews])

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
    if (!slug) slug = "anunt"

    const available = await checkSlugAvailable(slug)
    if (available) return slug

    // Append random suffix if collision
    const suffix = Math.random().toString(36).substring(2, 7)
    return `${slug}-${suffix}`
  }

  async function handleSubmit() {
    setError(null)

    if (!form.title.trim()) { setError("Titlul este obligatoriu."); return }
    if (!form.price || Number(form.price) < 0) { setError("Pretul este obligatoriu si trebuie sa fie >= 0."); return }

    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Nu esti autentificat."); setSaving(false); return }

      if (editMode && listing) {
        // --- UPDATE flow ---
        const updates: Record<string, unknown> = {
          title: form.title.trim(),
          category_id: form.categoryId ? Number(form.categoryId) : null,
          description: form.description.trim() || null,
          price: Number(form.price),
          unit: form.unit,
          currency: form.currency,
          available_qty: Number(form.availableQty) || 0,
          location: form.location.trim() || null,
          is_active: form.isActive,
        }

        // Re-generate slug if title changed
        if (form.title.trim() !== listing.title) {
          updates.slug = await generateUniqueSlug(form.title.trim())
        }

        const res = await updateListing(listing.id, updates)
        if (!res.success) { setError(res.error ?? "Eroare la actualizare."); setSaving(false); return }

        // Delete removed images
        for (const imgId of deletedImageIds) {
          const img = existingImages.find((i) => i.id === imgId)
          if (img) await deleteListingImage(img.id, img.storage_path)
        }

        // Upload new images
        const baseOrder = remainingExisting.length
        for (let i = 0; i < newFiles.length; i++) {
          await uploadListingImage(listing.id, newFiles[i], baseOrder + i)
        }

        const finalSlug = (updates.slug as string) ?? listing.slug
        router.push(`/products/${finalSlug}-${listing.id}`)
        router.refresh()
      } else {
        // --- CREATE flow ---
        const slug = await generateUniqueSlug(form.title.trim())

        const res = await createListing({
          seller_id: user.id,
          title: form.title.trim(),
          slug,
          category_id: form.categoryId ? Number(form.categoryId) : null,
          description: form.description.trim() || null,
          price: Number(form.price),
          unit: form.unit,
          currency: form.currency,
          available_qty: Number(form.availableQty) || 0,
          location: form.location.trim() || null,
          is_active: form.isActive,
        })

        if (!res.success || !res.data) { setError(res.error ?? "Eroare la creare."); setSaving(false); return }

        // Upload images
        for (let i = 0; i < newFiles.length; i++) {
          await uploadListingImage(res.data.id, newFiles[i], i)
        }

        router.push(`/products/${slug}-${res.data.id}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare neasteptata.")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!listing) return
    setDeleting(true)
    const res = await deleteListing(listing.id)
    if (res.success) {
      router.push("/account?tab=listings")
      router.refresh()
    } else {
      setError(res.error ?? "Eroare la stergere.")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>Detalii Anunt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titlu *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="ex: Beton C25/30 livrat cu autobetoniera"
              className="mt-1"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Categorie</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecteaza" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Locatie</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="ex: Bucuresti"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Descriere</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrie produsul, specificatii, conditii de livrare..."
              rows={5}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader><CardTitle>Pret si Cantitate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Pret *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unitate</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-w-xs">
            <Label>Cantitate Disponibila</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.availableQty}
              onChange={(e) => setForm({ ...form, availableQty: e.target.value })}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader><CardTitle>Imagini</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Existing images (edit mode) */}
          {remainingExisting.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Imagini existente</p>
              <div className="flex flex-wrap gap-3">
                {remainingExisting.map((img) => (
                  <div key={img.id} className="group relative h-24 w-32 overflow-hidden rounded-lg border">
                    <Image
                      src={getImagePublicUrl(img.storage_path)}
                      alt="Imagine anunt"
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                    <button
                      type="button"
                      onClick={() => markExistingForDeletion(img.id)}
                      className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
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
                    <Image
                      src={url}
                      alt={`Preview ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Click pentru a adauga imagini</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 5MB)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={saving || deleting} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editMode ? "Salveaza Modificarile" : "Publica Anuntul"}
          </Button>
          {!editMode && (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => { setForm({ ...form, isActive: false }); setTimeout(handleSubmit, 0) }}
            >
              Salveaza ca Ciorna
            </Button>
          )}
        </div>

        {editMode && listing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={saving || deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-1 h-4 w-4" />
                Sterge Anuntul
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sterge anuntul?</AlertDialogTitle>
                <AlertDialogDescription>
                  Aceasta actiune este ireversibila. Anuntul si toate imaginile asociate vor fi sterse permanent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sterge Definitiv
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
