import type { LucideIcon } from "lucide-react"
import { CreditCard, Clock } from "lucide-react"

interface StripeSeamCardProps {
  icon?: LucideIcon
  title: string
  description: string
  bulletPoints?: string[]
  docUrl?: string
}

// Consistent "Disponibil dupa activarea Stripe" visual. Never calls Stripe.
// When Phase 2 lands, only lib/stripe-seam.ts changes; this card stays.
export function StripeSeamCard({
  icon: Icon = CreditCard,
  title,
  description,
  bulletPoints,
  docUrl = "https://stripe.com/en-ro/use-cases/marketplaces",
}: StripeSeamCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-linear-to-br from-primary/5 via-card to-card p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Disponibil dupa activarea Stripe
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {bulletPoints && bulletPoints.length > 0 && (
            <ul className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              {bulletPoints.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <a
            href={docUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Afla mai multe despre Stripe Connect
            <span aria-hidden="true">&nbsp;&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  )
}
