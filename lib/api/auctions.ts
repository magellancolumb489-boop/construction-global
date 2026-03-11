import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"
import type { AuctionListItem, AuctionDetail, AuctionStatus, BidRow, Currency } from "@/types/domain"

export type AuctionLot = Tables<"auction_lots">
export type AuctionImage = Tables<"auction_images">
export type AuctionBid = Tables<"auction_bids">

export interface AuctionLotWithImages extends AuctionLot {
  auction_images: AuctionImage[]
}

export interface AuctionFilters {
  status?: AuctionStatus
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  search?: string
  sort?: "ending_soon" | "newest" | "highest_bid"
  limit?: number
  offset?: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop"

function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`
}

// Mask bidder identity for privacy: "Ion P." or first 3 chars + "***"
function maskBidder(displayName: string | null, bidderId: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
    return `${displayName.substring(0, 3)}***`
  }
  return `Ofertant ${bidderId.substring(0, 4)}`
}

// Map a DB lot row to the presentation AuctionListItem shape
export function toAuctionListItem(
  lot: AuctionLot,
  categoryName?: string,
  coverImagePath?: string
): AuctionListItem {
  return {
    id: String(lot.id),
    slug: lot.slug,
    title: lot.title,
    categoryName: categoryName ?? "",
    currentHighestBid: lot.current_price,
    bidCount: lot.bid_count,
    deadline: lot.ends_at,
    reservePrice: lot.reserve_price ?? undefined,
    status: lot.status as AuctionStatus,
    currency: lot.currency as Currency,
    thumbnailUrl: coverImagePath ? storagePublicUrl(coverImagePath) : PLACEHOLDER_IMG,
  }
}

// Map a DB lot with images + bids to the presentation AuctionDetail shape
export function toAuctionDetail(
  lot: AuctionLotWithImages,
  categoryName: string,
  sellerName: string
): AuctionDetail {
  const sortedImages = [...lot.auction_images].sort((a, b) => a.sort_order - b.sort_order)
  const images = sortedImages.map((img) => storagePublicUrl(img.storage_path))
  const coverPath = sortedImages.find((img) => img.is_cover)?.storage_path ?? sortedImages[0]?.storage_path

  return {
    ...toAuctionListItem(lot, categoryName, coverPath),
    description: lot.description ?? "",
    images: images.length > 0 ? images : [PLACEHOLDER_IMG],
    startingPrice: lot.starting_price,
    bidIncrement: lot.bid_increment,
    minNextBid: lot.current_price + lot.bid_increment,
    startsAt: lot.starts_at,
    seller: { id: lot.seller_id, displayName: sellerName },
    winnerId: lot.current_winner_id ?? undefined,
  }
}

// Map a DB bid row to the presentation BidRow shape
export function toBidRow(
  bid: AuctionBid & { profiles?: { display_name: string | null } | null },
  currency: string
): BidRow {
  return {
    id: String(bid.id),
    bidderMasked: maskBidder(bid.profiles?.display_name ?? null, bid.bidder_id),
    amount: bid.amount,
    currency: currency as Currency,
    createdAt: bid.created_at,
  }
}

// Server-side: fetch auctions with filters, joins for category + cover image
export async function getAuctions(filters: AuctionFilters = {}): Promise<{
  items: AuctionListItem[]
  total: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("auction_lots")
    .select("*, auction_images(storage_path, is_cover, sort_order), categories(name)", { count: "exact" })

  // Default: show only publicly visible auctions (active, scheduled, ended)
  if (filters.status) {
    query = query.eq("status", filters.status)
  } else {
    query = query.in("status", ["active", "scheduled", "ended"])
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("current_price", filters.minPrice)
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("current_price", filters.maxPrice)
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  switch (filters.sort) {
    case "ending_soon":
      query = query.order("ends_at", { ascending: true })
      break
    case "highest_bid":
      query = query.order("current_price", { ascending: false })
      break
    case "newest":
    default:
      query = query.order("created_at", { ascending: false })
      break
  }

  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error("getAuctions error:", error.message)
    return { items: [], total: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((row: any) => {
    const catName = row.categories?.name ?? ""
    const images = (row.auction_images ?? []) as { storage_path: string; is_cover: boolean; sort_order: number }[]
    const cover = images.find((img) => img.is_cover) ?? images.sort((a, b) => a.sort_order - b.sort_order)[0]
    return toAuctionListItem(row as AuctionLot, catName, cover?.storage_path)
  })

  return { items, total: count ?? 0 }
}

// Server-side: fetch single auction by slug with images + seller profile
export async function getAuctionDetailFromLot(slug: string): Promise<AuctionDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("auction_lots")
    .select("*, auction_images(*), categories(name), profiles!auction_lots_seller_id_fkey(display_name)")
    .eq("slug", slug)
    .single()

  if (error) {
    console.error("getAuctionDetailFromLot error:", error.message)
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  const catName = row.categories?.name ?? ""
  const sellerName = row.profiles?.display_name ?? "Vanzator"

  return toAuctionDetail(row as AuctionLotWithImages, catName, sellerName)
}

// Server-side: fetch bids for a lot, most recent first
export async function getAuctionBids(lotId: number, limit = 20): Promise<{ items: BidRow[]; total: number }> {
  const supabase = await createClient()

  const { data: lotData } = await supabase
    .from("auction_lots")
    .select("currency")
    .eq("id", lotId)
    .single()

  const currency = lotData?.currency ?? "EUR"

  const { data, count, error } = await supabase
    .from("auction_bids")
    .select("*, profiles!auction_bids_bidder_id_fkey(display_name)", { count: "exact" })
    .eq("lot_id", lotId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getAuctionBids error:", error.message)
    return { items: [], total: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((bid: any) => toBidRow(bid, currency))

  return { items, total: count ?? 0 }
}

// Server-side: fetch ALL lots owned by current user (any status)
export async function getMyAuctions(): Promise<(AuctionLot & { category_name: string })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("auction_lots")
    .select("*, categories(name)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getMyAuctions error:", error.message)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    category_name: row.categories?.name ?? "",
  }))
}

// Server-side: fetch single lot by ID for editing (owner only, includes images)
export async function getAuctionForEdit(id: number): Promise<AuctionLotWithImages | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("auction_lots")
    .select("*, auction_images(*)")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single()

  if (error) {
    console.error("getAuctionForEdit error:", error.message)
    return null
  }

  return data as AuctionLotWithImages
}

// Server-side: lightweight owner info for a slug
export async function getAuctionOwnerInfo(slug: string): Promise<{ sellerId: string; lotId: number } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("auction_lots")
    .select("seller_id, id")
    .eq("slug", slug)
    .single()

  if (error) return null
  return { sellerId: data.seller_id, lotId: data.id }
}
