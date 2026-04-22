import { createClient } from "@/lib/supabase/server"
import type { ProductListItem, AuctionListItem } from "@/types/domain"
import {
  toProductListItem,
  type Listing,
} from "@/lib/api/listings"
import { toAuctionListItem, type AuctionLot } from "@/lib/api/auctions"

export interface WishlistEntry {
  id: number
  addedAt: string
  listing: ProductListItem | null
  auction: AuctionListItem | null
}

// Server-side: hydrate the caller's wishlist into display-ready items.
// RLS keeps the rows scoped to auth.uid().
export async function getMyWishlist(): Promise<WishlistEntry[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `id, added_at, listing_id, auction_id,
       marketplace_listings(*, marketplace_listing_images(storage_path, display_order), categories(name)),
       auction_lots(*, auction_images(storage_path, sort_order, is_cover), categories(name))`,
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })

  if (error) {
    console.error("getMyWishlist error:", error.message)
    return []
  }

  return (data ?? []).map((row: unknown) => mapRow(row as WishlistRow))
}

interface WishlistRow {
  id: number
  added_at: string
  listing_id: number | null
  auction_id: number | null
  marketplace_listings?:
    | (Listing & {
        marketplace_listing_images?: { storage_path: string; display_order: number }[]
        categories?: { name: string | null } | null
      })
    | null
  auction_lots?:
    | (AuctionLot & {
        auction_images?: { storage_path: string; sort_order: number; is_cover: boolean }[]
        categories?: { name: string | null } | null
      })
    | null
}

function mapRow(row: WishlistRow): WishlistEntry {
  const listing = row.marketplace_listings ?? null
  const auction = row.auction_lots ?? null
  return {
    id: row.id,
    addedAt: row.added_at,
    listing: listing
      ? toProductListItem(
          listing,
          listing.categories?.name ?? "",
          [...(listing.marketplace_listing_images ?? [])]
            .sort((a, b) => a.display_order - b.display_order)[0]?.storage_path,
        )
      : null,
    auction: auction
      ? toAuctionListItem(
          auction,
          auction.categories?.name ?? "",
          pickCover(auction.auction_images ?? []),
        )
      : null,
  }
}

function pickCover(
  images: { storage_path: string; sort_order: number; is_cover: boolean }[],
): string | undefined {
  if (images.length === 0) return undefined
  const cover = images.find((i) => i.is_cover)
  if (cover) return cover.storage_path
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path
}
