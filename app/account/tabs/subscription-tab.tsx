"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatMoney } from "@/components/shared/money-display"
import { PayButton } from "@/components/orders/pay-button"
import { cancelSubscriptionAction } from "@/app/account/subscription-actions"
import type { PlatformCommerce } from "@/lib/api/platform-settings"
import type { MySubscription } from "@/lib/api/subscriptions"
import type { Currency } from "@/types/domain"

const STATUS: Record<MySubscription["status"], string> = {
  pending: "În așteptarea plății",
  active: "Activ",
  past_due: "Plată restantă",
  cancelled: "Anulat",
  expired: "Expirat",
}

/** Seller plans and post fees, all values from platform_settings / subscription_plans. */
export function SubscriptionTab({
  commerce,
  subscription,
  isSeller,
}: {
  commerce: PlatformCommerce
  subscription: MySubscription | null
  isSeller: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const live = subscription && (subscription.status === "active" || subscription.status === "past_due")

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Abonament și taxe</h2>

      <div className="rounded-2xl border border-border/50 bg-card p-4 text-sm">
        <p>
          Comision platformă: <strong>{Math.round(commerce.commissionRate * 1000) / 10}%</strong>, adăugat la prețul
          afișat cumpărătorilor (nu se scade din suma ta).
        </p>
        <p className="mt-1">
          Taxă publicare anunț:{" "}
          {commerce.listingFeesEnabled && commerce.listingFeeCents > 0 ? (
            <strong>
              {formatMoney(commerce.listingFeeCents / 100, "RON")} / {commerce.listingFeeDays} zile
            </strong>
          ) : (
            <strong>gratuită momentan</strong>
          )}
        </p>
      </div>

      {subscription && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <div>
            <p className="font-semibold">
              Planul tău: {commerce.plans.find((p) => p.code === subscription.planCode)?.name ?? subscription.planCode}
            </p>
            <p className="text-muted-foreground">
              {STATUS[subscription.status]}
              {subscription.currentPeriodEnd
                ? ` · până la ${new Date(subscription.currentPeriodEnd).toLocaleDateString("ro-RO")}`
                : ""}
              {subscription.cancelAtPeriodEnd ? " · nu se reînnoiește" : ""}
            </p>
          </div>
          {!subscription.cancelAtPeriodEnd && subscription.status !== "cancelled" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await cancelSubscriptionAction(subscription.id)
                  if (!r.ok) setError(r.error)
                  else router.refresh()
                })
              }
            >
              {live ? "Oprește reînnoirea" : "Renunță"}
            </Button>
          )}
        </div>
      )}

      {!commerce.subscriptionsEnabled ? (
        <p className="text-sm text-muted-foreground">Abonamentele nu sunt activate încă pe platformă.</p>
      ) : commerce.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nu există planuri publicate.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {commerce.plans.map((p) => {
            const current = subscription?.planCode === p.code && live
            return (
              <div key={p.code} className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  {current && <Badge className="gap-1"><BadgeCheck className="h-3 w-3" /> Activ</Badge>}
                </div>
                <p className="text-2xl font-extrabold">
                  {formatMoney(p.priceCents / 100, p.currency as Currency)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}/ {p.intervalMonths === 1 ? "lună" : `${p.intervalMonths} luni`}
                  </span>
                </p>
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <ul className="text-xs text-muted-foreground">
                  <li>{p.maxActiveListings ? `Max. ${p.maxActiveListings} anunțuri active` : "Anunțuri active nelimitate"}</li>
                  <li>{p.includesListingFees ? "Fără taxă de publicare" : "Taxa de publicare se aplică"}</li>
                </ul>
                {isSeller ? (
                  <PayButton purpose="subscription" refId={p.code} label={current ? "Prelungește" : "Alege planul"} />
                ) : (
                  <p className="text-xs text-muted-foreground">Activează contul de vânzător pentru a te abona.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
