"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { activateSellerAction } from "@/app/account/actions"

interface SellerActivationBannerProps {
  hasBusinessProfile: boolean
  minimal?: boolean
}

// Single-source CTA for seller features. Shown across every seller tab when
// profiles.seller_activated_at is null. Activation is a single server action
// call — no Stripe, no KYC, no hard role flip (matches unified-tabs choice).
export function SellerActivationBanner({
  hasBusinessProfile,
  minimal = false,
}: SellerActivationBannerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleActivate() {
    setError(null)
    startTransition(async () => {
      const res = await activateSellerAction()
      if (!res.success) {
        setError(res.error)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground sm:text-base">
              Deveniți vânzător
            </h3>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Activați contul de vânzător ca să publicați anunțuri, licitații și să accesați dashboard-ul.
              Plățile se vor activa separat după configurarea Stripe.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!hasBusinessProfile && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
            >
              <Link href="/account?tab=business">Completeaza datele firmei</Link>
            </Button>
          )}
          <Button
            onClick={handleActivate}
            disabled={pending}
            size="sm"
            className="h-10 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Activați vânzător
          </Button>
        </div>
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
