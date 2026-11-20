"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, X, BookOpen } from "lucide-react"
import { sellerMissing, type ReadinessProfile } from "@/lib/account/seller-readiness"
import { isValidRoPhone } from "@/lib/validation/ro-fiscal"

interface Step {
  id: string
  label: string
  href: string
  done: boolean
}

const DISMISS_KEY = "constructionhub_onboarding_dismissed"

/**
 * First-steps card for new users. Progress comes from real data (profile,
 * addresses, listings); dismissal is a per-browser convenience only.
 */
export function OnboardingChecklist({
  profile,
  addressCount,
  listingCount,
  sellerActive,
}: {
  profile: (ReadinessProfile & { seller_activated_at?: string | null }) | null
  addressCount: number
  listingCount: number
  sellerActive: boolean
}) {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  const profileDone = (profile?.display_name?.trim().length ?? 0) >= 2 && !!profile?.phone && isValidRoPhone(profile.phone)
  const sellerDataDone = sellerMissing(profile).length === 0
  const steps: Step[] = [
    { id: "profile", label: "Completează numele și telefonul", href: "/account?tab=profile", done: profileDone },
    { id: "address", label: "Adaugă o adresă de livrare", href: "/account?tab=addresses", done: addressCount > 0 },
    { id: "business", label: "Pentru vânzare: date firmă, adresă fiscală și IBAN", href: "/account?tab=business", done: sellerDataDone },
    { id: "seller", label: "Activează contul de vânzător", href: "/account?tab=seller-dashboard", done: sellerActive },
    { id: "listing", label: "Publică primul anunț", href: sellerActive ? "/sell/listing/new" : "/account?tab=seller-dashboard", done: listingCount > 0 },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (dismissed || doneCount === steps.length) return null

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // storage blocked: hide for this view only
    }
    setDismissed(true)
  }

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">Primii pași ({doneCount}/{steps.length})</p>
          <p className="text-xs text-muted-foreground">
            Pentru cumpărare ajung primii doi pași. Pentru vânzare, completează-i pe toți.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/ghid" className="inline-flex items-center gap-1 text-xs font-medium text-primary underline">
            <BookOpen className="h-3.5 w-3.5" /> Ghid
          </Link>
          <button type="button" onClick={dismiss} aria-label="Ascunde" className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
            {s.done ? (
              <span className="text-muted-foreground line-through">{s.label}</span>
            ) : (
              <Link href={s.href} className="text-foreground underline-offset-2 hover:underline">{s.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
