"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Save, Send, Loader2, Upload, X } from "lucide-react"

interface CategoryOption {
  id: number
  name: string
}

interface AuctionFormProps {
  categories: CategoryOption[]
}

const STEPS = [
  { num: 1, label: "Detalii" },
  { num: 2, label: "Descriere & Imagini" },
  { num: 3, label: "Pret & Termen" },
]

// Shell wizard only — auction persistence removed until DB feature relaunch.
export function AuctionForm({ categories }: AuctionFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    description: "",
    startingPrice: "",
    reservePrice: "",
    bidIncrement: "100",
    currency: "EUR" as "EUR" | "RON",
    startsAt: "",
    endsAt: "",
  })

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

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

  async function submit(_asDraft: boolean) {
    const e = validate()
    setErrors(e)
    setGlobalError(null)
    if (Object.keys(e).length > 0) return
    setSaving(true)
    void _asDraft
    void newFiles.length
    await new Promise((r) => setTimeout(r, 300))
    setGlobalError(
      "Publicarea licitatiilor este temporar indisponibila. Formularul este doar demonstrativ — nu se salveaza in baza de date.",
    )
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        Mod demonstrativ: pasii si validarile functioneaza local; nu exista persistare Supabase pentru licitatii pana la relansarea feature-ului.
      </div>

      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {s.num}
            </div>
            <span className={`hidden text-sm sm:inline ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {idx < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-border sm:mx-2 sm:w-8" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 ? "Detalii de baza" : step === 2 ? "Descriere & Imagini" : "Pret & Termen Limita"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="title">Titlu licitatie *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="ex: Macara Turn Liebherr 200 EC-H"
                  className="mt-1"
                />
                {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
              </div>
              <div>
                <Label>Categorie *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selectati categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="mt-1 text-sm text-destructive">{errors.categoryId}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="description">Descriere detaliata *</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrieti echipamentul, starea, specificatiile tehnice..."
                  className="mt-1"
                />
                {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description}</p>}
              </div>

              {newPreviews.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Previzualizare imagini</p>
                  <div className="flex flex-wrap gap-3">
                    {newPreviews.map((url, i) => (
                      <div key={i} className="group relative h-24 w-32 overflow-hidden rounded-lg border">
                        <Image src={url} alt={`Preview ${i + 1}`} fill className="object-cover" sizes="128px" />
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="absolute right-1 top-1 rounded-full bg-destructive/80 p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startingPrice">Pret de start *</Label>
                  <Input
                    id="startingPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.startingPrice}
                    onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
                    placeholder="0"
                    className="mt-1"
                  />
                  {errors.startingPrice && <p className="mt-1 text-sm text-destructive">{errors.startingPrice}</p>}
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as "EUR" | "RON" })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    id="reservePrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.reservePrice}
                    onChange={(e) => setForm({ ...form, reservePrice: e.target.value })}
                    placeholder="Pretul minim acceptat"
                    className="mt-1"
                  />
                  {errors.reservePrice && <p className="mt-1 text-sm text-destructive">{errors.reservePrice}</p>}
                </div>
                <div>
                  <Label htmlFor="bidIncrement">Increment oferta *</Label>
                  <Input
                    id="bidIncrement"
                    type="number"
                    min={1}
                    step="1"
                    value={form.bidIncrement}
                    onChange={(e) => setForm({ ...form, bidIncrement: e.target.value })}
                    placeholder="100"
                    className="mt-1"
                  />
                  {errors.bidIncrement && <p className="mt-1 text-sm text-destructive">{errors.bidIncrement}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startsAt">Incepe la (optional)</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endsAt">Termen limita *</Label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="mt-1"
                  />
                  {errors.endsAt && <p className="mt-1 text-sm text-destructive">{errors.endsAt}</p>}
                </div>
              </div>
            </>
          )}

          {globalError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {globalError}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Inapoi
            </Button>

            <div className="ml-auto flex gap-2">
              {step === 3 && (
                <>
                  <Button variant="outline" onClick={() => submit(true)} disabled={saving}>
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Salveaza Ciorna
                  </Button>
                  <Button
                    onClick={() => submit(false)}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                    Publica
                  </Button>
                </>
              )}
              {step < 3 && (
                <Button onClick={nextStep} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Urmatorul <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
