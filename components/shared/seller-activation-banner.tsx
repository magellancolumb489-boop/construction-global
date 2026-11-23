"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { activateSellerAction } from "@/app/account/actions"
import {
  REQUIREMENT_INFO,
  sellerMissing,
  type ReadinessProfile,
  type SellerRequirement,
} from "@/lib/account/seller-readiness"
import { COMPANY_ONLY_SUMMARY } from "@/lib/listings/seller-eligibility"

interface SellerActivationBannerProps {
  /** Kept for existing call sites; the checklist below is computed from `profile`. */
  hasBusinessProfile?: boolean
  profile?: ReadinessProfile | null
  minimal?: boolean
}

const ALL: SellerRequirement[] = ["display_name", "phone", "entity_type", "fiscal_address", "iban", "company_name", "tax_id"]

// Seller features unlock only when the DB (activate_seller) confirms the
// profile is complete. The checklist shows exactly what is missing and links
// to the tab where it is filled in.
export function SellerActivationBanner({ profile, minimal = false }: SellerActivationBannerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [serverMissing, setServerMissing] = useState<string[] | null>(null)

  const missing = (serverMissing as SellerRequirement[] | null) ?? sellerMissing(profile)
  const isCompany = profile?.entity_type && profile.entity_type !== "PF"
  const shown = ALL.filter((r) => isCompany || (r !== "company_name" && r !== "tax_id"))
  const ready = missing.length === 0

  function handleActivate() {
    setError(null)
    startTransition(async () => {
      const res = await activateSellerAction()
      if (!res.success) {
        setError(res.error)
        if (res.missing) setServerMissing(res.missing)
        return
      }
      router.refresh()
    })
  }

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6",
        minimal ? "" : "mb-6",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground sm:text-base">Devino vânzător</h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Pentru a publica anunțuri și a primi comenzi, completează datele de mai jos. Ele apar pe proformele
            comenzilor tale (nu în profilul public).{" "}
            <Link href="/ghid#vanzator" className="underline">Cum funcționează?</Link>
          </p>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Poți vinde și ca <strong className="text-foreground">persoană fizică</strong> (fără CUI). Atenție: unele
            produse ({COMPANY_ONLY_SUMMARY}) pot fi vândute doar de firme (PFA, II, IF, SRL, SA).
          </p>
          <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
            {shown.map((r) => {
              const done = !missing.includes(r)
              return (
                <li key={r} className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {done ? (
                    <span className="text-muted-foreground line-through">{REQUIREMENT_INFO[r].label}</span>
                  ) : (
                    <Link href={`/account?tab=${REQUIREMENT_INFO[r].tab}`} className="font-medium text-foreground underline">
                      {REQUIREMENT_INFO[r].label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleActivate}
          disabled={pending || !ready}
          size="sm"
          className="h-10 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          title={ready ? undefined : "Completează mai întâi datele de mai sus"}
        >
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ready ? "Activează contul de vânzător" : `Mai ai ${missing.length} pași`}
        </Button>
      </div>
      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-600" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
