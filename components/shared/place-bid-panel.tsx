"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Gavel, LogIn, CheckCircle2, Loader2, Zap, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { placeAuctionBid } from "@/lib/api/auctions-client"
import { formatMoney, MoneyDisplay } from "@/components/shared/money-display"
import type { AuctionDetail } from "@/types/domain"
import Link from "next/link"

export function PlaceBidPanel({
  auction,
  isLoggedIn = true,
  isHighestBidder = false,
}: {
  auction: AuctionDetail
  isLoggedIn?: boolean
  isHighestBidder?: boolean
}) {
  const router = useRouter()
  const [bidAmount, setBidAmount] = useState(String(auction.minNextBid))
  const [loading, setLoading] = useState(false)
  const [buyNowLoading, setBuyNowLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isActive = auction.status === "active"
  const hasBuyNow = !!(auction.reservePrice && auction.reservePrice > 0)
  const canBuyNow = hasBuyNow && isActive && auction.currentHighestBid < auction.reservePrice!

  async function handleBid() {
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const result = await placeAuctionBid(Number(auction.id), Number(bidAmount))
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error ?? "Eroare necunoscuta.")
      }
    } catch {
      setError("A aparut o eroare. Incercati din nou.")
    } finally {
      setLoading(false)
    }
  }

  // Buy Now = place a bid at the reserve price, which should end the auction
  async function handleBuyNow() {
    if (!auction.reservePrice) return
    setError(null)
    setSuccess(false)
    setBuyNowLoading(true)
    try {
      const result = await placeAuctionBid(Number(auction.id), auction.reservePrice)
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error ?? "Eroare necunoscuta.")
      }
    } catch {
      setError("A aparut o eroare. Incercati din nou.")
    } finally {
      setBuyNowLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Autentificare necesara</p>
            <p className="mt-1 text-sm text-muted-foreground">Autentificati-va pentru a licita sau cumpara.</p>
          </div>
          <Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/login">Autentificare</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bid Panel */}
      <Card className="border-2 border-primary/10 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gavel className="h-5 w-5 text-primary" />
            Plaseaza o oferta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isHighestBidder && !success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Sunteti cel mai mare ofertant!
            </div>
          )}

          {!isActive && (
            <p className="text-sm text-muted-foreground">Aceasta licitatie nu mai accepta oferte.</p>
          )}

          {isActive && (
            <>
              <div>
                <Label htmlFor="bid-amount" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Suma oferta (minim {formatMoney(auction.minNextBid, auction.currency)})
                </Label>
                <Input
                  id="bid-amount"
                  type="number"
                  min={auction.minNextBid}
                  step={auction.bidIncrement}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="mt-1.5 h-12 text-lg font-semibold"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Oferta plasata cu succes!
                </div>
              )}

              <Button
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
                onClick={handleBid}
                disabled={loading || buyNowLoading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Gavel className="mr-2 h-5 w-5" />}
                {loading ? "Se proceseaza..." : "Plaseaza oferta"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Buy Now Panel -- only when reserve price exists and hasn't been met */}
      {canBuyNow && (
        <Card className="overflow-hidden border-2 border-amber-400/40 bg-linear-to-br from-amber-50/80 to-orange-50/50 shadow-md dark:from-amber-950/20 dark:to-orange-950/10">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Cumpara Acum</p>
                <p className="text-xs text-muted-foreground">Opreste licitatia si cumpara instant</p>
              </div>
            </div>

            <div className="mb-4 flex items-baseline gap-2 rounded-xl bg-white/60 px-4 py-3 dark:bg-black/20">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Pret</span>
              <MoneyDisplay
                amount={auction.reservePrice!}
                currency={auction.currency}
                className="text-2xl font-extrabold text-amber-700 dark:text-amber-400"
              />
            </div>

            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Tranzactie sigura si garantata
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="h-12 w-full rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-base font-bold text-white shadow-lg hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all"
                  disabled={loading || buyNowLoading}
                >
                  {buyNowLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-5 w-5" />
                  )}
                  {buyNowLoading ? "Se proceseaza..." : `Cumpara acum — ${formatMoney(auction.reservePrice!, auction.currency)}`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmare Cumparare Acum</AlertDialogTitle>
                  <AlertDialogDescription>
                    Veti plasa o oferta de <strong>{formatMoney(auction.reservePrice!, auction.currency)}</strong> care va inchide licitatia imediat.
                    Aceasta actiune este irevocabila.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuleaza</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBuyNow}
                    className="bg-linear-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Confirma — {formatMoney(auction.reservePrice!, auction.currency)}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
