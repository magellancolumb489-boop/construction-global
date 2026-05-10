/**
 * Static auction fixtures for UI shells only (no Supabase).
 * Marketplace DB no longer persists auctions; pages stay navigable for future relaunch.
 */
import type { AuctionDetail, AuctionListItem, AuctionStatus, BidRow } from "@/types/domain"

const DEMO_IMG =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80"

/** Seed rows shown on /auctions and homepage teaser. */
export const MOCK_AUCTION_LIST_ITEMS: AuctionListItem[] = [
  {
    id: "1",
    slug: "demo-licitatie-utilaje",
    title: "Demo — licitatii in relansare",
    categoryName: "Utilaje",
    currentHighestBid: 12500,
    bidCount: 3,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    reservePrice: 20000,
    status: "active" as AuctionStatus,
    currency: "RON",
    thumbnailUrl: DEMO_IMG,
  },
  {
    id: "2",
    slug: "demo-materiale-constructii",
    title: "Preview UI — materiale (shell)",
    categoryName: "Materiale",
    currentHighestBid: 4200,
    bidCount: 0,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "scheduled" as AuctionStatus,
    currency: "EUR",
    thumbnailUrl: DEMO_IMG,
  },
]

function listItemToDetail(item: AuctionListItem): AuctionDetail {
  const minNext = item.currentHighestBid + 50
  return {
    ...item,
    description:
      "Aceasta este o pagina demonstrativa. Licitatiile reale vor fi disponibile dupa relansarea functionalitatii — datele nu sunt salvate in baza de date.",
    images: [item.thumbnailUrl, DEMO_IMG],
    startingPrice: Math.max(1000, item.currentHighestBid - 500),
    bidIncrement: 50,
    minNextBid: minNext,
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    seller: { id: "00000000-0000-0000-0000-000000000000", displayName: "Demo Seller" },
    winnerId: undefined,
  }
}

/** Resolve detail page data from URL slug segment (before trailing -id). */
export function getMockAuctionDetailForSlug(slug: string): AuctionDetail | null {
  const row =
    MOCK_AUCTION_LIST_ITEMS.find((a) => a.slug === slug) ?? MOCK_AUCTION_LIST_ITEMS[0]
  return row ? listItemToDetail(row) : null
}

/** Demo bids for shell layout (non-persistent). */
export const MOCK_BID_ROWS: BidRow[] = [
  {
    id: "b1",
    bidderMasked: "Utilizator ****42",
    amount: 12500,
    currency: "RON",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
]

export type AuctionSortShell = "ending_soon" | "newest" | "highest_bid"

/** Client-side filter/sort over mock list (replaces Supabase getAuctionsFiltered). */
export function filterMockAuctions(
  items: AuctionListItem[],
  filters: {
    status?: AuctionStatus
    /** When set, keep rows whose category label matches (sidebar sends resolved name). */
    categoryName?: string | null
    sort?: AuctionSortShell
    limit?: number
  },
): { items: AuctionListItem[]; total: number } {
  let out = [...items]
  if (filters.status) {
    out = out.filter((a) => a.status === filters.status)
  }
  if (filters.categoryName) {
    const cn = filters.categoryName.trim()
    if (cn) out = out.filter((a) => a.categoryName === cn)
  }
  const sort = filters.sort ?? "ending_soon"
  if (sort === "ending_soon") {
    out.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  } else if (sort === "newest") {
    out.sort((a, b) => Number(b.id) - Number(a.id))
  } else if (sort === "highest_bid") {
    out.sort((a, b) => b.currentHighestBid - a.currentHighestBid)
  }
  const total = out.length
  if (filters.limit != null && filters.limit > 0) {
    out = out.slice(0, filters.limit)
  }
  return { items: out, total }
}
