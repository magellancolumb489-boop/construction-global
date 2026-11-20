"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Tables } from "@/types/supabase"
import { runMaintenanceAction, updatePlatformSettingsAction, upsertPlanAction } from "./actions"

type Settings = Tables<"platform_settings">
type Plan = Tables<"subscription_plans">

function idf(s: Settings, key: string): string {
  const v = (s.platform_identity as Record<string, unknown> | null)?.[key]
  return typeof v === "string" ? v : ""
}

export function SettingsForm({ settings, plans }: { settings: Settings; plans: Plan[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [f, setF] = useState({
    commissionPct: String(Number(settings.commission_rate) * 100),
    commissionOnTransport: settings.commission_on_transport,
    vatPct: String(Number(settings.vat_rate) * 100),
    paymentsMode: settings.payments_mode as "demo" | "live",
    listingFeesEnabled: settings.listing_fees_enabled,
    listingFeeRon: String(Number(settings.listing_fee_cents) / 100),
    listingFeeDays: String(settings.listing_fee_days),
    subscriptionsEnabled: settings.subscriptions_enabled,
    transportQuoteTtlHours: String(settings.transport_quote_ttl_hours),
    unpaidOrderTtlHours: String(settings.unpaid_order_ttl_hours),
    proformaDueDays: String(settings.proforma_due_days),
    legal_name: idf(settings, "legal_name"),
    cui: idf(settings, "cui"),
    reg_com: idf(settings, "reg_com"),
    vat_id: idf(settings, "vat_id"),
    address: idf(settings, "address"),
    iban: idf(settings, "iban"),
    bank: idf(settings, "bank"),
    email: idf(settings, "email"),
    phone: idf(settings, "phone"),
  })
  const [plan, setPlan] = useState({
    code: "", name: "", description: "", priceRon: "", intervalMonths: "1", maxActiveListings: "", includesListingFees: true, isActive: false, sortOrder: "0",
  })

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const done = (r: { ok: boolean; error?: string }, okText: string) => {
    setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Eroare" })
    if (r.ok) router.refresh()
  }

  function save() {
    if (f.paymentsMode === "live" && settings.payments_mode !== "live" &&
        !confirm("Mod LIVE: comenzile noi vor aștepta plata reală prin procesator. Continui?")) return
    startTransition(async () => {
      const r = await updatePlatformSettingsAction({
        commissionPct: Number(f.commissionPct),
        commissionOnTransport: f.commissionOnTransport,
        vatPct: Number(f.vatPct),
        paymentsMode: f.paymentsMode,
        listingFeesEnabled: f.listingFeesEnabled,
        listingFeeRon: Number(f.listingFeeRon),
        listingFeeDays: Number(f.listingFeeDays),
        subscriptionsEnabled: f.subscriptionsEnabled,
        transportQuoteTtlHours: Number(f.transportQuoteTtlHours),
        unpaidOrderTtlHours: Number(f.unpaidOrderTtlHours),
        proformaDueDays: Number(f.proformaDueDays),
        identity: {
          legal_name: f.legal_name, cui: f.cui, reg_com: f.reg_com, vat_id: f.vat_id, address: f.address,
          iban: f.iban, bank: f.bank, email: f.email, phone: f.phone,
        },
      })
      done(r, "Setări salvate.")
    })
  }

  function savePlan() {
    startTransition(async () => {
      const r = await upsertPlanAction({
        code: plan.code, name: plan.name, description: plan.description, priceRon: Number(plan.priceRon),
        intervalMonths: Number(plan.intervalMonths) as 1 | 3 | 6 | 12,
        maxActiveListings: plan.maxActiveListings ? Number(plan.maxActiveListings) : null,
        includesListingFees: plan.includesListingFees, isActive: plan.isActive, sortOrder: Number(plan.sortOrder),
      })
      done(r, "Plan salvat.")
    })
  }

  const field = (label: string, k: keyof typeof f, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={f[k] as string} onChange={set(k)} className="mt-1" {...props} />
    </div>
  )
  const toggle = (label: string, k: "commissionOnTransport" | "listingFeesEnabled" | "subscriptionsEnabled") => (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      {label}
      <Switch checked={f[k]} onCheckedChange={(c) => setF({ ...f, [k]: c })} />
    </label>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Comision și TVA</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {field("Comision platformă (%)", "commissionPct", { type: "number", step: "0.1", min: 0, max: 50 })}
          {field("Cotă TVA (%)", "vatPct", { type: "number", step: "1", min: 0, max: 30 })}
          {field("Scadență proformă (zile)", "proformaDueDays", { type: "number" })}
          <div className="sm:col-span-3">{toggle("Comisionul se aplică și pe transportul vânzătorului", "commissionOnTransport")}</div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Exemplu: anunț 10.000 RON → cumpărătorul vede {(10000 * (1 + Number(f.commissionPct || 0) / 100)).toLocaleString("ro-RO")} RON (fără TVA).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plăți și termene</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Mod plăți</Label>
            <select
              value={f.paymentsMode}
              onChange={(e) => setF({ ...f, paymentsMode: e.target.value as "demo" | "live" })}
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="demo">Demo (fără bani reali)</option>
              <option value="live">Live (procesator real)</option>
            </select>
          </div>
          {field("Valabilitate ofertă transport (ore)", "transportQuoteTtlHours", { type: "number" })}
          {field("Anulare comenzi neplătite după (ore)", "unpaidOrderTtlHours", { type: "number" })}
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Live cere PAYMENTS_PROVIDER, PAYMENTS_WEBHOOK_DB_SECRET și implementarea procesatorului în lib/payments/providers.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Taxă publicare și abonamente</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">{toggle("Taxă pe anunț activată", "listingFeesEnabled")}</div>
          {field("Taxă publicare (RON)", "listingFeeRon", { type: "number", step: "0.01" })}
          {field("Valabilitate (zile)", "listingFeeDays", { type: "number" })}
          <div className="sm:col-span-3">{toggle("Abonamente activate", "subscriptionsEnabled")}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Date firmă platformă (proforma intermediarului)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {field("Denumire", "legal_name")}
          {field("CUI", "cui")}
          {field("Nr. Reg. Com.", "reg_com")}
          {field("Cod TVA", "vat_id")}
          {field("Adresă sediu", "address")}
          {field("IBAN", "iban")}
          {field("Banca", "bank")}
          {field("Email", "email")}
          {field("Telefon", "phone")}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={pending}>Salvează setările</Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(async () => {
            const r = await runMaintenanceAction()
            setMsg(r.ok ? { ok: true, text: `Mentenanță: ${JSON.stringify(r.data)}` } : { ok: false, text: r.error })
          })}
        >
          Rulează mentenanța (expirări)
        </Button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-destructive"}`}>{msg.text}</p>}

      <Card>
        <CardHeader><CardTitle>Planuri abonament</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {plans.length > 0 && (
            <ul className="space-y-1 text-sm">
              {plans.map((p) => (
                <li key={p.code} className="flex justify-between rounded border p-2">
                  <span>{p.name} <span className="text-muted-foreground">({p.code})</span></span>
                  <span>
                    {(Number(p.price_cents) / 100).toFixed(2)} {p.currency} / {p.interval_months} luni ·{" "}
                    {p.is_active ? "activ" : "inactiv"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-4">
            <Input placeholder="cod (ex: pro)" value={plan.code} onChange={(e) => setPlan({ ...plan, code: e.target.value })} />
            <Input placeholder="Nume" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
            <Input placeholder="Preț RON" type="number" value={plan.priceRon} onChange={(e) => setPlan({ ...plan, priceRon: e.target.value })} />
            <select value={plan.intervalMonths} onChange={(e) => setPlan({ ...plan, intervalMonths: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="1">lunar</option><option value="3">3 luni</option><option value="6">6 luni</option><option value="12">anual</option>
            </select>
            <Input placeholder="Max anunțuri active (gol = nelimitat)" type="number" value={plan.maxActiveListings} onChange={(e) => setPlan({ ...plan, maxActiveListings: e.target.value })} className="sm:col-span-2" />
            <Input placeholder="Descriere" value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} className="sm:col-span-2" />
            <label className="flex items-center gap-2 text-sm"><Switch checked={plan.includesListingFees} onCheckedChange={(c) => setPlan({ ...plan, includesListingFees: c })} /> Fără taxă publicare</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={plan.isActive} onCheckedChange={(c) => setPlan({ ...plan, isActive: c })} /> Publicat</label>
          </div>
          <Button size="sm" onClick={savePlan} disabled={pending}>Salvează planul (după cod)</Button>
        </CardContent>
      </Card>
    </div>
  )
}
