"use client"

import Link from "next/link"
import { useState } from "react"
import { Tag, User as UserIcon, Calendar, Edit, Clock, TrendingUp, Hash, Gavel } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { GalleryCarousel } from "@/components/shared/gallery-carousel"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay, formatMoney } from "@/components/shared/money-display"
import { CountdownTimer } from "@/components/shared/countdown-timer"
import { PlaceBidPanel } from "@/components/shared/place-bid-panel"
import { WinnerPaymentBlock } from "@/components/shared/winner-payment-block"
import { AuctionCard } from "@/components/shared/auction-card"
import { formatDistanceToNow } from "date-fns"
import { ro } from "date-fns/locale"
import type { AuctionDetail, AuctionListItem, BidRow } from "@/types/domain"

interface AuctionDetailClientProps {
  initialAuction: AuctionDetail
  initialBids: BidRow[]
  isOwner: boolean
  isLoggedIn: boolean
  currentUserId: string | null
  lotId: number
  relatedAuctions?: AuctionListItem[]
}

export function AuctionDetailClient({
  initialAuction,
  initialBids,
  isOwner,
  isLoggedIn,
  currentUserId,
  lotId,
  relatedAuctions = [],
}: AuctionDetailClientProps) {
  const [auction] = useState(initialAuction)
  const [bids] = useState(initialBids)

  const isHighestBidder = !!(currentUserId && auction.winnerId === currentUserId)
  const isActive = auction.status === "active"

  return (
    <div className="space-y-6">
      {/* Owner toolbar */}
      {isOwner && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Aceasta este licitatia ta.</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            {(auction.status === "draft" || auction.status === "scheduled") && (
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link href={`/sell/auction/${lotId}/edit`}>
                  <Edit className="mr-1 h-4 w-4" /> Editeaza
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + Status */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={auction.status} />
              {auction.categoryName && (
                <Badge variant="outline" className="rounded-lg text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {auction.categoryName}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {auction.title}
            </h1>
          </div>

          {/* Gallery */}
          <GalleryCarousel images={auction.images} />

          {/* Mobile price banner -- only on small screens */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:hidden">
            <div className="rounded-2xl bg-muted/50 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Start</p>
              <MoneyDisplay amount={auction.startingPrice} currency={auction.currency} className="text-sm font-bold" />
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-center ring-1 ring-primary/20">
              <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Oferta max</p>
              <MoneyDisplay amount={auction.currentHighestBid} currency={auction.currency} className="text-sm font-extrabold text-primary" />
            </div>
            <div className="rounded-2xl bg-muted/50 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Min. urm.</p>
              <MoneyDisplay amount={auction.minNextBid} currency={auction.currency} className="text-sm font-bold" />
            </div>
            <div className="rounded-2xl bg-muted/50 p-3 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Oferte</p>
              <p className="text-sm font-bold text-foreground">{auction.bidCount}</p>
            </div>
          </div>

          {/* Mobile bid panel -- shows only on mobile, before description */}
          <div className="lg:hidden space-y-3">
            {!isOwner && (
              <PlaceBidPanel
                auction={auction}
                isLoggedIn={isLoggedIn}
                isHighestBidder={isHighestBidder}
              />
            )}
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">Descriere</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{auction.description}</p>
          </div>

          {/* Bid History */}
          <div className="rounded-2xl border border-border/50 bg-card">
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4 sm:px-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Istoricul Ofertelor</h2>
              <Badge variant="outline" className="ml-auto rounded-lg text-xs">{bids.length}</Badge>
            </div>
            <div className="p-5 sm:p-6">
              {bids.length === 0 ? (
                <div className="py-8 text-center">
                  <Gavel className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Inca nu exista oferte.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 px-5 sm:-mx-6 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ofertant</TableHead>
                        <TableHead className="text-right">Suma</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bids.map((bid, i) => (
                        <TableRow key={bid.id} className={i === 0 ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}>
                          <TableCell className="font-medium">
                            {i === 0 ? (
                              <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {bid.bidderMasked}
                              </span>
                            ) : (
                              bid.bidderMasked
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay amount={bid.amount} currency={bid.currency} className={i === 0 ? "font-bold" : ""} />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true, locale: ro })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column -- sticky on desktop, hidden on mobile (bid panel shown inline above) */}
        <div className="hidden space-y-4 lg:block lg:sticky lg:top-20 lg:self-start">
          {/* Key Facts */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-foreground">Detalii Licitatie</h3>
            <div className="space-y-3">
              {isActive && (
                <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/20">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-red-600">
                    <Clock className="h-3 w-3" /> Timp ramas
                  </p>
                  <CountdownTimer deadline={auction.deadline} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Oferta start</p>
                  <MoneyDisplay amount={auction.startingPrice} currency={auction.currency} className="text-sm font-bold" />
                </div>
                <div className="rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Oferta max</p>
                  <MoneyDisplay amount={auction.currentHighestBid} currency={auction.currency} className="text-sm font-extrabold text-primary" />
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Min. urm.</p>
                  <MoneyDisplay amount={auction.minNextBid} currency={auction.currency} className="text-sm font-bold" />
                </div>
                {auction.reservePrice && (
                  <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200/50 dark:bg-amber-950/20 dark:ring-amber-800/30">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">Cumpara Acum</p>
                    <MoneyDisplay amount={auction.reservePrice} currency={auction.currency} className="text-sm font-bold text-amber-700 dark:text-amber-400" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Oferte: <span className="font-bold text-foreground">{auction.bidCount}</span>
              </div>
            </div>
          </div>

          {/* Bid panel -- desktop only */}
          {!isOwner && (
            <PlaceBidPanel
              auction={auction}
              isLoggedIn={isLoggedIn}
              isHighestBidder={isHighestBidder}
            />
          )}

          <WinnerPaymentBlock auction={auction} />

          {/* Seller */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{auction.seller.displayName}</p>
              <p className="text-xs text-muted-foreground">Membru verificat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Related auctions */}
      {relatedAuctions.length > 0 && (
        <section className="border-t border-border/50 pt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Licitatii Similare</h2>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link href="/auctions">Vezi toate</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedAuctions.slice(0, 3).map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
