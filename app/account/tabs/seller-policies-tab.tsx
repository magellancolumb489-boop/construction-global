"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileText, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateSellerPoliciesAction } from "@/app/account/actions"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import type { Profile } from "@/lib/api/profile-client"

interface SellerPoliciesTabProps {
  profile: Profile | null
}

interface PoliciesShape {
  shipping_text: string
  returns_text: string
  cancellation_text: string
  return_window_days: number
}

function readPolicies(profile: Profile | null): PoliciesShape {
  const raw = (profile?.seller_policies ?? null) as Partial<PoliciesShape> | null
  return {
    shipping_text: raw?.shipping_text ?? "",
    returns_text: raw?.returns_text ?? "",
    cancellation_text: raw?.cancellation_text ?? "",
    return_window_days: typeof raw?.return_window_days === "number" ? raw.return_window_days : 14,
  }
}

export function SellerPoliciesTab({ profile }: SellerPoliciesTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [form, setForm] = useState<PoliciesShape>(readPolicies(profile))

  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updateSellerPoliciesAction({
        shipping_text: form.shipping_text || null,
        returns_text: form.returns_text || null,
        cancellation_text: form.cancellation_text || null,
        return_window_days: form.return_window_days,
      })
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Politici salvate." })
      router.refresh()
    })
  }

  function countField(v: string, max: number) {
    return <p className="mt-1 text-[11px] text-muted-foreground">{v.length}/{max}</p>
  }

  return (
    <div className="space-y-5">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} />}

      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Politici vanzator</h2>
            <p className="text-xs text-muted-foreground">
              Cumparatorii vad aceste texte pe fiecare anunt si pe factura.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Fereastra retur (zile)
              </Label>
              <Input
                type="number" min={0} max={60}
                value={form.return_window_days}
                onChange={(e) => setForm({ ...form, return_window_days: Number(e.target.value) })}
                className="h-11 rounded-xl"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Conform OUG 34/2014, minim 14 zile pentru persoane fizice.
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              Politica de retur
            </Label>
            <Textarea
              value={form.returns_text}
              onChange={(e) => setForm({ ...form, returns_text: e.target.value })}
              rows={4}
              maxLength={2000}
              placeholder="Conditii, taxe, modalitati de retur"
              className="rounded-xl"
            />
            {countField(form.returns_text, 2000)}
          </div>

          <div>
            <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              Politica de livrare
            </Label>
            <Textarea
              value={form.shipping_text}
              onChange={(e) => setForm({ ...form, shipping_text: e.target.value })}
              rows={4}
              maxLength={2000}
              placeholder="Zone, termene, costuri de livrare"
              className="rounded-xl"
            />
            {countField(form.shipping_text, 2000)}
          </div>

          <div>
            <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              Politica de anulare
            </Label>
            <Textarea
              value={form.cancellation_text}
              onChange={(e) => setForm({ ...form, cancellation_text: e.target.value })}
              rows={3}
              maxLength={2000}
              placeholder="Cand si cum se pot anula comenzile inainte de livrare"
              className="rounded-xl"
            />
            {countField(form.cancellation_text, 2000)}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleSave}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salveaza politici
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
