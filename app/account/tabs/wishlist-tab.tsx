"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductCard } from "@/components/shared/product-card"
import { AuctionCard } from "@/components/shared/auction-card"
import { toggleWishlist, clearWishlist } from "@/lib/api/wishlist-client"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { WishlistEntry } from "@/lib/api/wishlist"

interface WishlistTabProps {
  wishlist: WishlistEntry[]
}

export function WishlistTab({ wishlist }: WishlistTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<number | null>(null)

  function remove(entry: WishlistEntry) {
    if (!entry.listing && !entry.auction) return
    setBusyId(entry.id)
    startTransition(async () => {
      const target = entry.listing
        ? { kind: "listing" as const, listing_id: Number(entry.listing.id) }
        : { kind: "auction" as const, auction_id: Number(entry.auction!.id) }
      await toggleWishlist(target)
      setBusyId(null)
      router.refresh()
    })
  }

  function clearAll() {
    startTransition(async () => {
      await clearWishlist()
      router.refresh()
    })
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nicio favorita"
        description="Salvati produse si licitatii pentru a le gasi rapid mai tarziu."
        actionLabel="Catre marketplace"
        actionHref="/marketplace"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Favorite</h2>
          <p className="text-xs text-muted-foreground">{wishlist.length} articole salvate.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Goleste
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Goliti lista de favorite?</AlertDialogTitle>
              <AlertDialogDescription>Nu se poate anula.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Anuleaza</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground"
                onClick={clearAll}
              >
                Goleste
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wishlist.map((entry) => (
          <div key={entry.id} className="relative">
            {entry.listing ? (
              <ProductCard product={entry.listing} />
            ) : entry.auction ? (
              <AuctionCard auction={entry.auction} />
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="absolute left-3 top-3 h-8 w-8 rounded-xl border-border/50 bg-background/80 p-0 backdrop-blur hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.preventDefault(); remove(entry) }}
              disabled={pending && busyId === entry.id}
              aria-label="Elimina din favorite"
            >
              {pending && busyId === entry.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
