"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Star, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { RatingStars } from "@/components/shared/rating-stars"
import { deleteReview } from "@/lib/api/reviews-client"
import type { ReviewWithContext } from "@/lib/api/reviews"

interface ReviewsGivenTabProps {
  reviews: ReviewWithContext[]
}

export function ReviewsGivenTab({ reviews }: ReviewsGivenTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<number | null>(null)

  function remove(id: number) {
    setBusyId(id)
    startTransition(async () => {
      await deleteReview(id)
      setBusyId(null)
      router.refresh()
    })
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Nicio recenzie scrisa"
        description="După prima comandă finalizată veți putea lăsa o recenzie vânzătorului."
      />
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Recenziile mele</h2>
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Pentru {r.target_display_name || "vânzător"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {r.listing_title || r.auction_title || "Recenzie generala"} · {new Date(r.created_at).toLocaleDateString("ro-RO")}
              </p>
            </div>
            <RatingStars value={r.rating} readonly size="sm" />
          </div>
          {r.title && <p className="mt-1 text-sm font-semibold">{r.title}</p>}
          {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
              onClick={() => remove(r.id)}
              disabled={pending && busyId === r.id}
            >
              {pending && busyId === r.id ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-3.5 w-3.5" />
              )}
              Sterge
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
