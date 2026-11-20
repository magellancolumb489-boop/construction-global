import Link from "next/link"
import { ArrowRight, Gavel, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuctionCard } from "@/components/shared/auction-card"
import { ProductCard } from "@/components/shared/product-card"
import { MOCK_AUCTION_LIST_ITEMS } from "@/lib/auction-shell/mock-data"
import type { ProductListItem } from "@/types/domain"

/** A titled row of product cards with a "see all" link. */
export function ProductRow({
  title,
  subtitle,
  href,
  items,
}: {
  title: string
  subtitle?: string
  href: string
  items: ProductListItem[]
}) {
  if (items.length === 0) return null
  return (
    <section className="border-t border-border/50 pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="outline" size="sm" asChild className="rounded-xl">
          <Link href={href}>
            Vezi toate <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

/**
 * Invitation to the auctions section. Auctions are still a preview on mock
 * data (no bidding tables yet), so the copy says so.
 */
export function AuctionsTeaser({ limit = 3 }: { limit?: number }) {
  const items = MOCK_AUCTION_LIST_ITEMS.slice(0, limit)
  if (items.length === 0) return null
  return (
    <section className="rounded-3xl border border-border/50 bg-linear-to-br from-primary/10 via-card to-card p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Gavel className="h-3.5 w-3.5" /> Licitații
          </div>
          <h2 className="text-xl font-bold text-foreground">Preferi să licitezi?</h2>
          <p className="text-sm text-muted-foreground">
            Loturi de materiale și utilaje la preț de pornire. Secțiunea este în previzualizare.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/auctions">
            Vezi licitațiile <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <AuctionCard key={a.id} auction={a} />
        ))}
      </div>
    </section>
  )
}

/** Reverse direction: from auctions to buy-now offers in the marketplace. */
export function MarketplaceTeaser({ items }: { items: ProductListItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="rounded-3xl border border-border/50 bg-linear-to-br from-emerald-500/10 via-card to-card p-5 sm:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Store className="h-3.5 w-3.5" /> Cumpără acum
          </div>
          <h2 className="text-xl font-bold text-foreground">Nu vrei să aștepți licitația?</h2>
          <p className="text-sm text-muted-foreground">Oferte cu preț fix, comandă și livrare imediat.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/marketplace">
            Mergi în magazin <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}
