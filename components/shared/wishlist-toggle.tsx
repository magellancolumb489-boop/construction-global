"use client"

import { useState, useTransition } from "react"
import { Heart, Loader2 } from "lucide-react"
import { toggleWishlist } from "@/lib/api/wishlist-client"

interface ListingTarget { kind: "listing"; listing_id: number }
interface AuctionTarget { kind: "auction"; auction_id: number }

type WishlistTarget = ListingTarget | AuctionTarget

interface WishlistToggleProps {
  target: WishlistTarget
  initialSaved?: boolean
  label?: string
  className?: string
}

// Compact floating toggle that mounts on top of product/auction cards. Stays
// optimistic so the card feels snappy; the server action is the source of
// truth and can undo the local flip if it fails.
export function WishlistToggle({ target, initialSaved = false, label, className }: WishlistToggleProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next)
    startTransition(async () => {
      const res = await toggleWishlist(target)
      if (!res.success) {
        setSaved(!next)
      } else {
        setSaved(res.state === "added")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label ?? (saved ? "Elimina din favorite" : "Adauga la favorite")}
      className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all ${
        className ?? "absolute left-3 top-3"
      } ${
        saved
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
          : "border-border/50 bg-background/80 text-muted-foreground hover:border-rose-500/30 hover:text-rose-600"
      }`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
      )}
    </button>
  )
}
