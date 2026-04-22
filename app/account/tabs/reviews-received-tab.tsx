import { Star } from "lucide-react"
import { RatingStars } from "@/components/shared/rating-stars"
import { EmptyState } from "@/components/shared/empty-state"
import type { ReviewWithContext } from "@/lib/api/reviews"

interface ReviewsReceivedTabProps {
  reviews: ReviewWithContext[]
}

export function ReviewsReceivedTab({ reviews }: ReviewsReceivedTabProps) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Nicio recenzie primita"
        description="Recenziile apar dupa ce cumparatorii confirma primirea produselor."
      />
    )
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Recenzii primite</h2>
          <p className="text-xs text-muted-foreground">{reviews.length} recenzii de la cumparatori.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{avg.toFixed(1)}</p>
          <div>
            <RatingStars value={avg} readonly size="md" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">din 5 · {reviews.length} voturi</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  De la {r.reviewer_display_name || "Cumparator anonim"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.listing_title || r.auction_title || "Recenzie generala"} · {new Date(r.created_at).toLocaleDateString("ro-RO")}
                </p>
              </div>
              <RatingStars value={r.rating} readonly size="sm" />
            </div>
            {r.title && <p className="mt-1 text-sm font-semibold">{r.title}</p>}
            {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
