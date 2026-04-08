"use client"

import { useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"

const UNITS_CONCRETE = [
  { value: "M3", label: "Metri cubi (M3)" },
  { value: "TON", label: "Tone (TON)" },
]

const CURRENCIES = [
  { value: "RON", label: "RON" },
  { value: "EUR", label: "EUR" },
]

interface CategoryOption {
  id: number
  name: string
}

interface Props {
  form: WizardFormState
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>
  categories: CategoryOption[]
}

/** Step 2 for concrete: pickup + geocode, transport modes, min order, price. */
export function WizardStepDetailsConcrete({ form, setForm, categories }: Props) {
  const [geocoding, setGeocoding] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)

  async function runGeocode() {
    const q = form.pickupAddress.trim()
    if (q.length < 3) {
      setGeoHint("Introduceti o adresa mai detaliata.")
      return
    }
    setGeocoding(true)
    setGeoHint(null)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setGeoHint(data.error ?? "Geocodare esuata.")
        return
      }
      if (data.lat == null || data.lng == null) {
        setGeoHint("Nu am gasit coordonate. Completati manual lat / long sau rafinati adresa.")
        return
      }
      setForm((f) => ({
        ...f,
        pickupLat: data.lat,
        pickupLng: data.lng,
      }))
      setGeoHint(data.displayName ? `Gasit: ${data.displayName}` : "Coordonate setate.")
    } catch {
      setGeoHint("Eroare de retea. Incercati din nou.")
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Punct de incarcare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Adresa completa incarcare *</Label>
            <Textarea
              value={form.pickupAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, pickupAddress: e.target.value }))
              }
              placeholder="Strada, numar, localitate, judet"
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="secondary"
              onClick={runGeocode}
              disabled={geocoding}
            >
              {geocoding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Geocodeaza adresa
            </Button>
            {form.pickupLat != null && form.pickupLng != null && (
              <span className="text-sm text-emerald-600">
                Coordonate: {form.pickupLat.toFixed(5)}, {form.pickupLng.toFixed(5)}
              </span>
            )}
          </div>
          {geoHint && (
            <p className="text-sm text-muted-foreground">{geoHint}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Latitudine (manual, optional)</Label>
              <Input
                type="number"
                step="any"
                value={form.pickupLat ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    pickupLat: v === "" ? null : Number(v),
                  }))
                }}
                placeholder="ex: 44.4268"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Longitudine (manual, optional)</Label>
              <Input
                type="number"
                step="any"
                value={form.pickupLng ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    pickupLng: v === "" ? null : Number(v),
                  }))
                }}
                placeholder="ex: 26.1025"
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Furtunul, pompa si tarifele aferente se calculeaza la cumparator in calculatorul de
            comanda, conform regulilor platformei.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moduri de transport *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.transportCifa}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, transportCifa: c === true }))
                }
              />
              CIFA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.transportPompa}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, transportPompa: c === true }))
                }
              />
              POMPĂ
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.transportVrac}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, transportVrac: c === true }))
                }
              />
              VRAC
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalii pret si stoc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Titlu anunt *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1"
                placeholder="ex: Beton C25/30 — livrare CIFA"
              />
            </div>
            <div>
              <Label>Categorie</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecteaza" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Comanda minima *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.minOrderQty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minOrderQty: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unitate comanda *</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_CONCRETE.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Pret per unitate *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, currency: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantitate disponibila *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.availableQty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableQty: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Descriere (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
