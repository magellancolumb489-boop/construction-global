"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Truck, Save, Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateSupplierSettingsAction } from "@/app/account/actions"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import type { Profile } from "@/lib/api/profile-client"

interface SellerShippingTabProps {
  profile: Profile | null
}

type TransportMode = "CIFA" | "POMPA" | "VRAC"

interface CapacityRule {
  capacity_m3: number
  rate_per_km: number
  min_fee: number
  min_order: number
  enabled: boolean
}

interface PickupAddress {
  label?: string | null
  line1: string
  city: string
  county?: string | null
  postal_code?: string | null
}

interface SettingsShape {
  pickup_addresses: PickupAddress[]
  defaults: Record<TransportMode, CapacityRule>
  delivery_zones: string[]
}

const EMPTY_RULE: CapacityRule = {
  capacity_m3: 0, rate_per_km: 0, min_fee: 0, min_order: 0, enabled: false,
}

const MODE_LABELS: Record<TransportMode, { label: string; hint: string }> = {
  CIFA: { label: "CIFA", hint: "Autobetoniera" },
  POMPA: { label: "Pompa", hint: "Pompa de beton" },
  VRAC: { label: "Vrac", hint: "Transport materiale vrac" },
}

function readSettings(profile: Profile | null): SettingsShape {
  const raw = (profile?.supplier_settings ?? null) as Partial<SettingsShape> | null
  return {
    pickup_addresses: (raw?.pickup_addresses as PickupAddress[] | undefined) ?? [],
    defaults: {
      CIFA: { ...EMPTY_RULE, ...(raw?.defaults?.CIFA ?? {}) },
      POMPA: { ...EMPTY_RULE, ...(raw?.defaults?.POMPA ?? {}) },
      VRAC: { ...EMPTY_RULE, ...(raw?.defaults?.VRAC ?? {}) },
    },
    delivery_zones: (raw?.delivery_zones as string[] | undefined) ?? [],
  }
}

export function SellerShippingTab({ profile }: SellerShippingTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [settings, setSettings] = useState<SettingsShape>(readSettings(profile))
  const [zoneDraft, setZoneDraft] = useState("")

  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  function updateRule(mode: TransportMode, patch: Partial<CapacityRule>) {
    setSettings((s) => ({
      ...s,
      defaults: { ...s.defaults, [mode]: { ...s.defaults[mode], ...patch } },
    }))
  }

  function addPickup() {
    if (settings.pickup_addresses.length >= 10) return
    setSettings((s) => ({
      ...s,
      pickup_addresses: [...s.pickup_addresses, { label: "", line1: "", city: "" }],
    }))
  }

  function updatePickup(i: number, patch: Partial<PickupAddress>) {
    setSettings((s) => ({
      ...s,
      pickup_addresses: s.pickup_addresses.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    }))
  }

  function removePickup(i: number) {
    setSettings((s) => ({
      ...s,
      pickup_addresses: s.pickup_addresses.filter((_, idx) => idx !== i),
    }))
  }

  function addZone() {
    const z = zoneDraft.trim()
    if (!z || settings.delivery_zones.includes(z)) return
    setSettings((s) => ({ ...s, delivery_zones: [...s.delivery_zones, z] }))
    setZoneDraft("")
  }

  function removeZone(z: string) {
    setSettings((s) => ({ ...s, delivery_zones: s.delivery_zones.filter((x) => x !== z) }))
  }

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updateSupplierSettingsAction(settings)
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Setarile de livrare au fost salvate." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} />}

      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Setari livrare</h2>
            <p className="text-xs text-muted-foreground">
              Valorile implicite folosite de calculator cand nu exista reguli specifice pe anunt.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {(["CIFA", "POMPA", "VRAC"] as TransportMode[]).map((mode) => {
            const rule = settings.defaults[mode]
            const m = MODE_LABELS[mode]
            return (
              <div
                key={mode}
                className="rounded-2xl border border-border/50 p-4"
                aria-labelledby={`mode-${mode}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p id={`mode-${mode}`} className="text-sm font-bold">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(v) => updateRule(mode, { enabled: Boolean(v) })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <Label className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Capacitate (m³)
                    </Label>
                    <Input
                      type="number" min={0} step="0.5"
                      value={rule.capacity_m3}
                      onChange={(e) => updateRule(mode, { capacity_m3: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Tarif/km (RON)
                    </Label>
                    <Input
                      type="number" min={0} step="0.1"
                      value={rule.rate_per_km}
                      onChange={(e) => updateRule(mode, { rate_per_km: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Taxa minima
                    </Label>
                    <Input
                      type="number" min={0} step="10"
                      value={rule.min_fee}
                      onChange={(e) => updateRule(mode, { min_fee: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Comanda min.
                    </Label>
                    <Input
                      type="number" min={0} step="0.5"
                      value={rule.min_order}
                      onChange={(e) => updateRule(mode, { min_order: Number(e.target.value) })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )
          })}

          <div className="rounded-2xl border border-border/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Puncte de ridicare</p>
                <p className="text-[11px] text-muted-foreground">
                  {settings.pickup_addresses.length}/10 adrese.
                </p>
              </div>
              <Button
                onClick={addPickup}
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={settings.pickup_addresses.length >= 10}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Adauga
              </Button>
            </div>
            {settings.pickup_addresses.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                Nu aveti puncte de ridicare adaugate.
              </p>
            ) : (
              <div className="space-y-3">
                {settings.pickup_addresses.map((p, i) => (
                  <div
                    key={i}
                    className="grid gap-2 rounded-xl border border-border/40 p-3 sm:grid-cols-5"
                  >
                    <Input
                      value={p.label ?? ""}
                      onChange={(e) => updatePickup(i, { label: e.target.value })}
                      placeholder="Eticheta"
                      className="h-10 rounded-xl"
                    />
                    <Input
                      value={p.line1}
                      onChange={(e) => updatePickup(i, { line1: e.target.value })}
                      placeholder="Strada, numar"
                      className="h-10 rounded-xl sm:col-span-2"
                    />
                    <Input
                      value={p.city}
                      onChange={(e) => updatePickup(i, { city: e.target.value })}
                      placeholder="Oras"
                      className="h-10 rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={p.county ?? ""}
                        onChange={(e) => updatePickup(i, { county: e.target.value })}
                        placeholder="Judet"
                        className="h-10 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
                        onClick={() => removePickup(i)}
                        aria-label="Sterge punctul de ridicare"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 p-4">
            <p className="mb-3 text-sm font-bold">Zone de livrare</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {settings.delivery_zones.length === 0 && (
                <p className="text-[12px] text-muted-foreground">
                  Adaugati judete/orase in care livrati. Lasati gol pentru toata Romania.
                </p>
              )}
              {settings.delivery_zones.map((z) => (
                <span
                  key={z}
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 px-3 py-1 text-xs"
                >
                  {z}
                  <button
                    type="button"
                    onClick={() => removeZone(z)}
                    className="-mr-1 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                    aria-label={`Sterge ${z}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={zoneDraft}
                onChange={(e) => setZoneDraft(e.target.value)}
                placeholder="Ex: Cluj-Napoca"
                className="h-10 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addZone() }
                }}
              />
              <Button onClick={addZone} variant="outline" className="rounded-xl">
                <Plus className="mr-1 h-4 w-4" /> Adauga
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleSave}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salveaza setari livrare
            </Button>
            {message && (
              <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
