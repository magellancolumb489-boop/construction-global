"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  CONCRETE_CLASS_CATALOG,
  CONCRETE_CLASS_ORDER,
  CONSISTENCY_LABELS,
  type ConcreteClassCode,
  type ConcreteClassSelection,
  type ConcreteConsistency,
} from "@/lib/listing-wizard-types"

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

function selectionForClass(
  rows: ConcreteClassSelection[],
  code: ConcreteClassCode,
): ConcreteClassSelection | undefined {
  return rows.find((r) => r.classCode === code)
}

function upsertSelection(
  rows: ConcreteClassSelection[],
  code: ConcreteClassCode,
  patch: Partial<ConcreteClassSelection>,
): ConcreteClassSelection[] {
  const idx = rows.findIndex((r) => r.classCode === code)
  const base: ConcreteClassSelection =
    idx >= 0
      ? { ...rows[idx], ...patch }
      : { classCode: code, consistencies: [], consistencyPrices: {}, ...patch }
  if (idx >= 0) {
    const next = [...rows]
    next[idx] = base
    return next
  }
  return [...rows, base]
}

function removeSelection(rows: ConcreteClassSelection[], code: ConcreteClassCode) {
  return rows.filter((r) => r.classCode !== code)
}

/** Step 2 for concrete: beton classes, pickup + geocode, transport modes, min order, pricing grid. */
export function WizardStepDetailsConcrete({ form, setForm, categories }: Props) {
  const [geocoding, setGeocoding] = useState(false)
  const [geoHint, setGeoHint] = useState<string | null>(null)
  const didDefaultCifa = useRef(false)

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

  const hasPompabilSelection = useMemo(
    () => form.concreteClasses.some((c) => c.consistencies.includes("pompabil")),
    [form.concreteClasses],
  )

  // Default CIFA on first paint when both transport toggles are off (new listing UX).
  useEffect(() => {
    if (didDefaultCifa.current) return
    if (!form.transportCifa && !form.transportPompa) {
      didDefaultCifa.current = true
      setForm((f) => ({ ...f, transportCifa: true }))
    }
  }, [form.transportCifa, form.transportPompa, setForm])

  // Auto-check POMPA when any class includes "pompabil", until the seller touches POMPA manually.
  useEffect(() => {
    if (form.transportPompaUserTouched) return
    setForm((f) => ({ ...f, transportPompa: hasPompabilSelection }))
  }, [hasPompabilSelection, form.transportPompaUserTouched, setForm])

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

      {/* Beton catalogue: appears before transport modes per product spec */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-snug">
            Betoane (clase standard) / Betoane după consistență *
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Selectati clasele oferite si consistentele (S3 D16 implicit pe eticheta). Pentru fiecare
            consistenta bifata introduceti un pret separat (ex. Vârtos si Semivârtos pot avea preturi
            diferite). Puteti bifa mai multe clase pe acelasi anunt.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CONCRETE_CLASS_ORDER.map((code) => {
              const meta = CONCRETE_CLASS_CATALOG[code]
              const row = selectionForClass(form.concreteClasses, code)
              const active = Boolean(row)
              const subtitle = [
                "S3 D16",
                meta.bMark ? `(${meta.bMark})` : null,
              ]
                .filter(Boolean)
                .join(" ")

              return (
                <div
                  key={code}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={active}
                      onCheckedChange={(c) => {
                        const on = c === true
                        setForm((f) => ({
                          ...f,
                          concreteClasses: on
                            ? upsertSelection(f.concreteClasses, code, {
                                consistencies: [],
                                consistencyPrices: {},
                              })
                            : removeSelection(f.concreteClasses, code),
                        }))
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <span className="font-semibold text-foreground">{meta.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{subtitle}</span>
                      </div>
                      {active && (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {meta.consistencies.map((cons) => {
                              const checked = row!.consistencies.includes(cons)
                              return (
                                <label
                                  key={cons}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium has-checked:border-primary has-checked:bg-primary/10"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) => {
                                      const nextOn = c === true
                                      setForm((f) => {
                                        const cur = selectionForClass(f.concreteClasses, code)
                                        if (!cur) return f
                                        const set = new Set(cur.consistencies)
                                        const nextPrices = { ...cur.consistencyPrices }
                                        if (nextOn) {
                                          set.add(cons)
                                          if (nextPrices[cons] === undefined) {
                                            nextPrices[cons] = ""
                                          }
                                        } else {
                                          set.delete(cons)
                                          delete nextPrices[cons]
                                        }
                                        return {
                                          ...f,
                                          concreteClasses: upsertSelection(
                                            f.concreteClasses,
                                            code,
                                            {
                                              consistencies: [...set] as ConcreteConsistency[],
                                              consistencyPrices: nextPrices,
                                            },
                                          ),
                                        }
                                      })
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  {CONSISTENCY_LABELS[cons]}
                                </label>
                              )
                            })}
                          </div>
                          <div className="space-y-3">
                            {meta.consistencies.map((cons) => {
                              if (!row!.consistencies.includes(cons)) return null
                              return (
                                <div key={`${code}-${cons}`}>
                                  <Label className="text-xs">
                                    Preț / {form.unit} — {CONSISTENCY_LABELS[cons]} *
                                  </Label>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    disabled={!active}
                                    value={row?.consistencyPrices[cons] ?? ""}
                                    onChange={(e) =>
                                      setForm((f) => {
                                        const cur = selectionForClass(f.concreteClasses, code)
                                        if (!cur) return f
                                        return {
                                          ...f,
                                          concreteClasses: upsertSelection(
                                            f.concreteClasses,
                                            code,
                                            {
                                              consistencyPrices: {
                                                ...cur.consistencyPrices,
                                                [cons]: e.target.value,
                                              },
                                            },
                                          ),
                                        }
                                      })
                                    }
                                    className="mt-1 min-h-11"
                                    placeholder="ex: 420"
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Moduri de transport *</CardTitle>
          <p className="text-sm text-muted-foreground">
            CIFA este optiunea principala. Daca oferiti beton pompabil, bifati si POMPA (sau lasati
            bifarea automata activa).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-6">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={form.transportCifa}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, transportCifa: c === true }))
                }
              />
              CIFA
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={form.transportPompa}
                onCheckedChange={(c) =>
                  setForm((f) => ({
                    ...f,
                    transportPompa: c === true,
                    transportPompaUserTouched: true,
                  }))
                }
              />
              POMPĂ
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <p className="text-xs text-muted-foreground">
            Pretul afisat in magazin va fi minimul dintre preturile pe clase selectate (de la …
            {form.currency} / {form.unit}).
          </p>
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
