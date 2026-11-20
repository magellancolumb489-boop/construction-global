import { createClient } from "@/lib/supabase/server"
import type { ProductListItem } from "@/types/domain"
import {
  toProductListItem,
  type Listing,
} from "@/lib/api/listings"
import { getPlatformPricing } from "@/lib/api/platform-settings"
import type { PlatformPricing } from "@/lib/pricing/commission"

export interface WishlistEntry {
  id: number
  addedAt: string
  listing: ProductListItem | null
}

// Server-side: hydrate the caller's wishlist into display-ready listing cards.
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
      `id, added_at, listing_id,
       marketplace_listings(*, marketplace_listing_images(storage_path, display_order), categories(name))`,
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })

  if (error) {
    console.error("getMyWishlist error:", error.message)
    return []
  }

  const pricing = await getPlatformPricing()
  return (data ?? []).map((row: unknown) => mapRow(row as WishlistRow, pricing))
}

interface WishlistRow {
  id: number
  added_at: string
  listing_id: number
  marketplace_listings?:
    | (Listing & {
        marketplace_listing_images?: { storage_path: string; display_order: number }[]
        categories?: { name: string | null } | null
      })
    | null
}

function mapRow(row: WishlistRow, pricing: PlatformPricing): WishlistEntry {
  const listing = row.marketplace_listings ?? null
  return {
    id: row.id,
    addedAt: row.added_at,
    listing: listing
      ? toProductListItem(
          listing,
          listing.categories?.name ?? "",
          [...(listing.marketplace_listing_images ?? [])]
            .sort((a, b) => a.display_order - b.display_order)[0]?.storage_path,
          null,
          pricing,
        )
      : null,
  }
}
