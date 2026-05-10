"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductCard } from "@/components/shared/product-card"
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
    if (!entry.listing) return
    setBusyId(entry.id)
    startTransition(async () => {
      await toggleWishlist({ kind: "listing", listing_id: Number(entry.listing!.id) })
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

  const listingEntries = wishlist.filter((e) => e.listing != null)

  if (listingEntries.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nicio favorita"
        description="Salvati produse din marketplace pentru a le gasi rapid mai tarziu."
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
          <p className="text-xs text-muted-foreground">{listingEntries.length} articole salvate.</p>
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
        {listingEntries.map((entry) =>
          entry.listing ? (
            <div key={entry.id} className="relative">
              <ProductCard product={entry.listing} />
              <Button
                variant="outline"
                size="sm"
                className="absolute left-3 top-3 h-8 w-8 rounded-xl border-border/50 bg-background/80 p-0 backdrop-blur hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault()
                  remove(entry)
                }}
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
          ) : null,
        )}
      </div>
    </div>
  )
}
