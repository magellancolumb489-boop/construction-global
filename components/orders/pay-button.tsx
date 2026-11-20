"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { completeDemoPaymentAction, startPaymentAction } from "@/app/payments/actions"
import type { PaymentPurpose } from "@/lib/payments/types"
import { formatMoney } from "@/components/shared/money-display"
import type { Currency } from "@/types/domain"

/**
 * One button for every payment purpose. Live mode: redirects to the provider
 * checkout. Demo mode: shows the DB-computed amount and a confirm step.
 */
export function PayButton({
  purpose,
  refId,
  label,
  className,
}: {
  purpose: PaymentPurpose
  refId: string
  label: string
  className?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [demo, setDemo] = useState<{ intentId: string; amountCents: number; currency: string } | null>(null)

  function start() {
    setError(null)
    startTransition(async () => {
      const res = await startPaymentAction(purpose, refId)
      if (!res.ok) return setError(res.error)
      if (res.kind === "redirect") {
        window.location.assign(res.url)
        return
      }
      setDemo({ intentId: res.intentId, amountCents: res.amountCents, currency: res.currency })
    })
  }

  function confirmDemo() {
    if (!demo) return
    startTransition(async () => {
      const res = await completeDemoPaymentAction(demo.intentId)
      if (!res.ok) return setError(res.error)
      setDemo(null)
      router.refresh()
    })
  }

  return (
    <div className={className}>
      {!demo ? (
        <Button onClick={start} disabled={pending} className="w-full">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          {label}
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p>
            Mod demo: nu se încasează bani. Sumă calculată de server:{" "}
            <strong>{formatMoney(demo.amountCents / 100, demo.currency as Currency)}</strong>
          </p>
          <Button onClick={confirmDemo} disabled={pending} size="sm" className="w-full">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmă plata (demo)
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
