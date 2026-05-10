"use client"

import { useMemo } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"
import type { MaterialTransportRowForm } from "@/lib/listing-wizard-form-state"
import {
  MATERIAL_CATEGORY_CODES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  MATERIALS_BY_CATEGORY,
  PAYLOAD_OPTIONS_BY_VEHICLE,
  VEHICLE_CODES,
  VEHICLE_LABELS,
  isBulkAggregateCategory,
  type MaterialCategoryCode,
  type VehicleCode,
} from "@/lib/materials-logistics/catalog"
import type { MaterialLogisticsSpec, TransportOfferRow } from "@/lib/materials-logistics/engine"
import {
  requiresLengthSection,
  requiresPalletSection,
  suggestedVehiclesForListing,
} from "@/lib/materials-logistics/engine"

const UNITS = [
  { value: "TON", label: "Tone (TON)" },
  { value: "KG", label: "Kilograme (KG)" },
  { value: "M3", label: "Metri cubi (M3)" },
  { value: "CUP", label: "Cupa (CUP)" },
  { value: "CAMION", label: "Camion complet (CAMION)" },
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

interface Props {
  form: WizardFormState
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>
  categories: CategoryOption[]
}

/** Construiește specificația pentru motorul de sugestii (preview în wizard). */
function previewSpecFromForm(form: WizardFormState): MaterialLogisticsSpec | null {
  if (!form.materialCategoryCode || !form.materialCode) return null
  return {
    categoryCode: form.materialCategoryCode as MaterialCategoryCode,
    materialCode: form.materialCode,
    maxPieceLengthM: form.materialMaxPieceLengthM.trim()
      ? Number(form.materialMaxPieceLengthM)
      : null,
    palletSacKg: form.materialPalletSacKg.trim()
      ? Number(form.materialPalletSacKg)
      : null,
    palletPieces: form.materialPalletPieces.trim()
      ? Number(form.materialPalletPieces)
      : null,
    palletTotalKg: form.materialPalletTotalKg.trim()
      ? Number(form.materialPalletTotalKg)
      : null,
    macaraAddon: form.materialMacaraAddon,
    macaraFee:
      form.materialMacaraFee.trim() === ""
        ? null
        : Number(form.materialMacaraFee),
    allowNonBulkTransport: form.materialAllowNonBulkTransport,
  }
}

function offersFromRows(rows: MaterialTransportRowForm[]): TransportOfferRow[] {
  const out: TransportOfferRow[] = []
  for (const r of rows) {
    const v = r.vehicleCode.trim().toUpperCase()
    if (!v || r.payloadT === "") continue
    const p = Number(r.payloadT)
    if (!Number.isFinite(p)) continue
    out.push({ vehicleCode: v as VehicleCode, payloadT: p })
  }
  return out
}

/** Pasul 2 materiale: taxonomie RO, paleți, lungimi, transport multi-rând, macara. */
export function WizardStepDetailsMaterials({ form, setForm, categories }: Props) {
  const materialsInCategory = form.materialCategoryCode
    ? [...MATERIALS_BY_CATEGORY[form.materialCategoryCode as MaterialCategoryCode]]
    : []

  const preview = previewSpecFromForm(form)
  const suggestionLabels = useMemo(() => {
    if (!preview) return [] as string[]
    return suggestedVehiclesForListing(preview, offersFromRows(form.materialTransportRows))
  }, [preview, form.materialTransportRows])

  const showPallet = preview ? requiresPalletSection(preview) : false
  const showLength = preview ? requiresLengthSection(preview) : false
  const isBulk = form.materialCategoryCode
    ? isBulkAggregateCategory(form.materialCategoryCode as MaterialCategoryCode)
    : false

  function addTransportRow() {
    setForm((f) => ({
      ...f,
      materialTransportRows: [...f.materialTransportRows, { vehicleCode: "", payloadT: "" }],
    }))
  }

  function removeTransportRow(index: number) {
    setForm((f) => ({
      ...f,
      materialTransportRows: f.materialTransportRows.filter((_, i) => i !== index),
    }))
  }

  function updateTransportRow(index: number, patch: Partial<MaterialTransportRowForm>) {
    setForm((f) => ({
      ...f,
      materialTransportRows: f.materialTransportRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalii produs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titlu *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1"
              placeholder="ex: Ciment Portland saci"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Categorie magazin</Label>
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
            <div>
              <Label>Locatie (optional)</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Oras / judet"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Descriere</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={5}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Pret unitar *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unitate</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Cantitate disponibila *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.availableQty}
                onChange={(e) => setForm((f) => ({ ...f, availableQty: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Cost transport fix per cursa *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.transportFee}
                onChange={(e) => setForm((f) => ({ ...f, transportFee: e.target.value }))}
                className="mt-1"
                placeholder="0 = fara taxa per cursa"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se inmulteste cu numarul de curse alese de cumparator la configurare.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Material (logistica RO)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selectati categoria si produsul exact — acestea determina regulile de transport.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Categorie material *</Label>
            <Select
              value={form.materialCategoryCode || undefined}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  materialCategoryCode: v,
                  materialCode: "",
                }))
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecteaza categoria" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_CATEGORY_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {MATERIAL_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Material *</Label>
            <Select
              value={form.materialCode || undefined}
              disabled={!form.materialCategoryCode}
              onValueChange={(v) => setForm((f) => ({ ...f, materialCode: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecteaza materialul" />
              </SelectTrigger>
              <SelectContent>
                {materialsInCategory.map((code) => (
                  <SelectItem key={code} value={code}>
                    {MATERIAL_LABELS[code] ?? code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showPallet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Paleti (optional)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pentru materiale paletizate: ajuta la estimarea masei si curselor.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Greutate sac (kg)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.materialPalletSacKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, materialPalletSacKg: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Bucati per palet</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={form.materialPalletPieces}
                onChange={(e) =>
                  setForm((f) => ({ ...f, materialPalletPieces: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Greutate totala palet (kg)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.materialPalletTotalKg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, materialPalletTotalKg: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {showLength && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lungime maxima piesa (m) *</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pentru otel lemn plase etc. — limiteaza vehiculele eligibile.
            </p>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min={0.1}
              step="0.1"
              value={form.materialMaxPieceLengthM}
              onChange={(e) =>
                setForm((f) => ({ ...f, materialMaxPieceLengthM: e.target.value }))
              }
              className="max-w-xs"
              placeholder="ex: 6"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Transport disponibil</CardTitle>
            <p className="text-sm text-muted-foreground">
              Puteti lasa gol — platforma propune variante la cumparator. Adaugati un rand per
              vehicul si capacitate (ex. Duba 3.5t si Tir 24t).
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addTransportRow}>
            <Plus className="h-4 w-4" />
            Adauga vehicul
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.materialTransportRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun vehicul bifat — livrare la alegere platforma.</p>
          ) : (
            <ul className="space-y-3">
              {form.materialTransportRows.map((row, index) => (
                <li
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-end"
                >
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Vehicul</Label>
                      <Select
                        value={row.vehicleCode || undefined}
                        onValueChange={(v) =>
                          updateTransportRow(index, {
                            vehicleCode: v,
                            payloadT: "",
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Tip" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_CODES.map((vc) => (
                            <SelectItem key={vc} value={vc}>
                              {VEHICLE_LABELS[vc]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Capacitate (tone)</Label>
                      <Select
                        value={row.payloadT === "" ? undefined : String(row.payloadT)}
                        disabled={!row.vehicleCode}
                        onValueChange={(v) =>
                          updateTransportRow(index, { payloadT: Number(v) })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="t" />
                        </SelectTrigger>
                        <SelectContent>
                          {(row.vehicleCode
                            ? PAYLOAD_OPTIONS_BY_VEHICLE[row.vehicleCode as VehicleCode]
                            : []
                          ).map((p) => (
                            <SelectItem key={p} value={String(p)}>
                              {p} t
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => removeTransportRow(index)}
                    aria-label="Elimina rand"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {isBulk && (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Agregate — prioritate autobasculanta</p>
                <p className="text-xs text-muted-foreground">
                  Pentru a permite si alte vehicule (exceptie manuala), activati comutatorul.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.materialAllowNonBulkTransport}
                  onCheckedChange={(c) =>
                    setForm((f) => ({ ...f, materialAllowNonBulkTransport: c === true }))
                  }
                />
                <span className="text-sm">Permit si alte vehicule</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Macara (optional)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Serviciu suplimentar la santier — nu inlocuieste transportul.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <Checkbox
              checked={form.materialMacaraAddon}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, materialMacaraAddon: c === true }))
              }
            />
            Ofer macara la descarcare
          </label>
          {form.materialMacaraAddon && (
            <div className="max-w-xs">
              <Label>Taxa macara ({form.currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.materialMacaraFee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, materialMacaraFee: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {preview && suggestionLabels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sugestii platforma</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Orientativ pentru cumparatori:{" "}
              <span className="font-medium text-foreground">{suggestionLabels.join(", ")}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
