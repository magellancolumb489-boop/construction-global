import Link from "next/link"
import Image from "next/image"
import { Tag, Users, Zap, Clock } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { MoneyDisplay } from "./money-display"
import { CountdownTimer } from "./countdown-timer"
import type { AuctionListItem } from "@/types/domain"

export function AuctionCard({ auction }: { auction: AuctionListItem }) {
  return (
    <Link href={`/auctions/${auction.slug}-${auction.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-16/10 overflow-hidden">
          <Image
            src={auction.thumbnailUrl}
            alt={auction.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute left-3 top-3">
            <StatusBadge status={auction.status} />
          </div>
          {auction.reservePrice && (
            <div className="absolute right-3 top-3">
              <div className="flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-white shadow-md">
                <Zap className="h-3 w-3" />
                Cumpara Acum
              </div>
            </div>
          )}

          {/* Bottom price overlay */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">Oferta curenta</p>
              <MoneyDisplay
                amount={auction.currentHighestBid}
                currency={auction.currency}
                className="text-xl font-extrabold text-white drop-shadow-md"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <Users className="h-3 w-3" />
              {auction.bidCount}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors">
            {auction.title}
          </h3>
          {auction.categoryName && (
            <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              {auction.categoryName}
            </div>
          )}
          {auction.status === "active" && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 dark:bg-red-950/20">
              <Clock className="h-3.5 w-3.5 text-red-500" />
              <CountdownTimer deadline={auction.deadline} compact />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
