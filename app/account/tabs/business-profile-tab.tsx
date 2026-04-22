"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Save, Loader2, Globe, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateBusinessProfileAction } from "@/app/account/actions"
import type { Profile } from "@/lib/api/profile-client"

const ENTITIES: { id: string; label: string; hint: string }[] = [
  { id: "PF", label: "Persoana fizica", hint: "Fara CIF, nu emiti facturi fiscale" },
  { id: "PFA", label: "PFA", hint: "Persoana fizica autorizata" },
  { id: "SRL", label: "SRL", hint: "Societate cu raspundere limitata" },
  { id: "SA", label: "SA", hint: "Societate pe actiuni" },
  { id: "II", label: "Intreprindere individuala", hint: "II" },
  { id: "IF", label: "Intreprindere familiala", hint: "IF" },
]

interface BusinessProfileTabProps {
  profile: Profile | null
}

interface FiscalAddress {
  line1?: string | null
  line2?: string | null
  city?: string | null
  county?: string | null
  postal_code?: string | null
  country?: string | null
}

function readFiscal(profile: Profile | null): FiscalAddress {
  const raw = (profile?.fiscal_address ?? null) as FiscalAddress | null
  return raw ?? { country: "RO" }
}

export function BusinessProfileTab({ profile }: BusinessProfileTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const initialFiscal = readFiscal(profile)
  const [form, setForm] = useState({
    entity_type: profile?.entity_type ?? "",
    company_name: profile?.company_name ?? "",
    tax_id: profile?.tax_id ?? "",
    reg_com: profile?.reg_com ?? "",
    vat_id: profile?.vat_id ?? "",
    website_url: profile?.website_url ?? "",
    fiscal_line1: initialFiscal.line1 ?? "",
    fiscal_city: initialFiscal.city ?? "",
    fiscal_county: initialFiscal.county ?? "",
    fiscal_postal: initialFiscal.postal_code ?? "",
  })

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updateBusinessProfileAction({
        entity_type: (form.entity_type || null) as
          | "PF" | "PFA" | "SRL" | "SA" | "II" | "IF" | null,
        company_name: form.company_name || null,
        tax_id: form.tax_id || null,
        reg_com: form.reg_com || null,
        vat_id: form.vat_id || null,
        website_url: form.website_url || null,
        fiscal_address: {
          line1: form.fiscal_line1 || null,
          city: form.fiscal_city || null,
          county: form.fiscal_county || null,
          postal_code: form.fiscal_postal || null,
          country: "RO",
        },
      })
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Datele firmei au fost salvate." })
      router.refresh()
    })
  }

  const requiresFiscal = form.entity_type && form.entity_type !== "PF"

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Date firma</h2>
            <p className="text-xs text-muted-foreground">
              Obligatoriu pentru emiterea facturilor si activarea payouts dupa integrarea Stripe.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tip entitate
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ENTITIES.map((e) => {
                const checked = form.entity_type === e.id
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setForm({ ...form, entity_type: e.id })}
                    className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                      checked
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                    aria-pressed={checked}
                  >
                    <div className="font-semibold">{e.label}</div>
                    <div className="mt-0.5 text-[11px] leading-tight opacity-80">{e.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {requiresFiscal && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Denumire firma
                  </Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className="h-11 rounded-xl"
                    placeholder="SC Exemplu SRL"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    CIF / CUI
                  </Label>
                  <Input
                    value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value.toUpperCase() })}
                    className="h-11 rounded-xl font-mono"
                    placeholder="RO12345678"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nr. Registrul Comertului
                  </Label>
                  <Input
                    value={form.reg_com}
                    onChange={(e) => setForm({ ...form, reg_com: e.target.value })}
                    className="h-11 rounded-xl font-mono"
                    placeholder="J12/3456/2020"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    VAT ID (optional)
                  </Label>
                  <Input
                    value={form.vat_id}
                    onChange={(e) => setForm({ ...form, vat_id: e.target.value.toUpperCase() })}
                    className="h-11 rounded-xl font-mono"
                    placeholder="RO12345678"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-border/50 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Adresa fiscala
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input
                    value={form.fiscal_line1}
                    onChange={(e) => setForm({ ...form, fiscal_line1: e.target.value })}
                    placeholder="Strada, numar, bloc"
                    className="h-11 rounded-xl sm:col-span-2"
                  />
                  <Input
                    value={form.fiscal_city}
                    onChange={(e) => setForm({ ...form, fiscal_city: e.target.value })}
                    placeholder="Oras"
                    className="h-11 rounded-xl"
                  />
                  <Input
                    value={form.fiscal_postal}
                    onChange={(e) => setForm({ ...form, fiscal_postal: e.target.value })}
                    placeholder="Cod postal"
                    className="h-11 rounded-xl"
                    inputMode="numeric"
                    maxLength={6}
                  />
                  <Input
                    value={form.fiscal_county}
                    onChange={(e) => setForm({ ...form, fiscal_county: e.target.value })}
                    placeholder="Judet"
                    className="h-11 rounded-xl sm:col-span-2"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Globe className="h-3 w-3" /> Site web
            </Label>
            <Input
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder="https://exemplu.ro"
              className="h-11 rounded-xl"
              inputMode="url"
              autoComplete="url"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleSave}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salveaza
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
