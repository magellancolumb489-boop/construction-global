import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import type { AuctionListItem, AuctionDetail, AuctionStatus, BidRow, Currency } from "@/types/domain"
import { bidInputSchema } from "@/lib/validation"
import {
  createAuctionAction,
  updateAuctionAction,
  deleteAuctionAction,
} from "@/app/sell/auction/actions"

export type AuctionLot = Tables<"auction_lots">
export type AuctionLotInsert = Omit<TablesInsert<"auction_lots">, "id" | "created_at" | "updated_at">
export type AuctionLotUpdate = TablesUpdate<"auction_lots">

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop"

function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/auction-images/${path}`
}

function maskBidder(displayName: string | null, bidderId: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
    return `${displayName.substring(0, 3)}***`
  }
  return `Ofertant ${bidderId.substring(0, 4)}`
}

// Client-side: fetch auctions with filters (read-only, public)
export async function getAuctionsFiltered(filters: {
  status?: AuctionStatus
  categoryId?: number
  minPrice?: number
  maxPrice?: number
  search?: string
  sort?: "ending_soon" | "newest" | "highest_bid"
  limit?: number
  offset?: number
} = {}): Promise<{ items: AuctionListItem[]; total: number }> {
  const supabase = createClient()

  let query = supabase
    .from("auction_lots")
    .select("*, auction_images(storage_path, is_cover, sort_order), categories(name)", { count: "exact" })

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
  if (error) return { items: [], total: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((row: any) => {
    const catName = row.categories?.name ?? ""
    const images = (row.auction_images ?? []) as { storage_path: string; is_cover: boolean; sort_order: number }[]
    const cover = images.find((img) => img.is_cover) ?? images.sort((a, b) => a.sort_order - b.sort_order)[0]
    return {
      id: String(row.id),
      slug: row.slug,
      title: row.title,
      categoryName: catName,
      currentHighestBid: row.current_price,
      bidCount: row.bid_count,
      deadline: row.ends_at,
      reservePrice: row.reserve_price ?? undefined,
      status: row.status as AuctionStatus,
      currency: row.currency as Currency,
      thumbnailUrl: cover?.storage_path ? storagePublicUrl(cover.storage_path) : PLACEHOLDER_IMG,
    } satisfies AuctionListItem
  })

  return { items, total: count ?? 0 }
}

// createAuction: thin wrapper around server action. seller_id is injected
// server-side. current_price / bid_count / current_winner_id are ignored if
// provided by the client.
export async function createAuction(
  lot: AuctionLotInsert
): Promise<{ success: boolean; data?: AuctionLot; error?: string }> {
  const res = await createAuctionAction(
    lot as unknown as Parameters<typeof createAuctionAction>[0]
  )
  if (res.success) return { success: true, data: res.data as AuctionLot }
  return { success: false, error: res.error }
}

export async function updateAuction(
  id: number,
  updates: AuctionLotUpdate
): Promise<{ success: boolean; error?: string }> {
  const res = await updateAuctionAction(
    id,
    updates as unknown as Parameters<typeof updateAuctionAction>[1]
  )
  return res.success ? { success: true } : { success: false, error: res.error }
}

export async function deleteAuction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const res = await deleteAuctionAction(id)
  return res.success ? { success: true } : { success: false, error: res.error }
}

// placeAuctionBid: stays client-side; the DB RPC is the authoritative guard.
// We Zod-validate the input locally first to surface obvious errors early.
export async function placeAuctionBid(
  lotId: number,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const parsed = bidInputSchema.safeParse({ lot_id: lotId, amount })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Suma invalida" }
  }

  const supabase = createClient()
  const { data, error } = await supabase.rpc("place_bid", {
    p_lot_id: parsed.data.lot_id,
    p_amount: parsed.data.amount,
  })

  if (error) return { success: false, error: error.message }

  if (data && typeof data === "object") {
    const payload = data as { ok?: boolean; error?: string; min_next?: number }
    if (payload.ok === false) {
      if (payload.error === "below_min_bid" && payload.min_next != null) {
        return {
          success: false,
          error: `Oferta este sub minimul permis (min: ${payload.min_next}).`,
        }
      }
      return { success: false, error: payload.error ?? "Oferta respinsa" }
    }
  }

  return { success: true }
}

// Image upload stays client-side; storage RLS forces the owner prefix and
// the DB row insert is gated by auction_images RLS (lot-owner join).
export async function uploadAuctionImage(
  lotId: number,
  file: File,
  sortOrder: number = 0,
  isCover: boolean = false
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const storagePath = `${user.id}/${lotId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("auction-images")
    .upload(storagePath, file)

  if (uploadError) return { success: false, error: uploadError.message }

  const { error: insertError } = await supabase
    .from("auction_images")
    .insert({
      lot_id: lotId,
      storage_path: storagePath,
      sort_order: sortOrder,
      is_cover: isCover,
    })

  if (insertError) return { success: false, error: insertError.message }
  return { success: true, path: storagePath }
}

export async function deleteAuctionImage(
  imageId: number,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error: storageError } = await supabase.storage
    .from("auction-images")
    .remove([storagePath])

  if (storageError) return { success: false, error: storageError.message }

  const { error: dbError } = await supabase
    .from("auction_images")
    .delete()
    .eq("id", imageId)

  if (dbError) return { success: false, error: dbError.message }
  return { success: true }
}

export async function checkAuctionSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from("auction_lots")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
  return (count ?? 0) === 0
}

// Polling: read-only; selects only public-safe display_name via joins.
export async function pollAuctionData(lotId: number): Promise<{
  auction: AuctionDetail | null
  bids: BidRow[]
}> {
  const supabase = createClient()

  const { data: lotData, error: lotError } = await supabase
    .from("auction_lots")
    .select("*, auction_images(*), categories(name), profiles!auction_lots_seller_id_fkey(display_name)")
    .eq("id", lotId)
    .single()

  if (lotError || !lotData) return { auction: null, bids: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = lotData as any
  const catName = row.categories?.name ?? ""
  const sellerName = row.profiles?.display_name ?? "Vanzator"
  const sortedImages = [...(row.auction_images ?? [])].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
  const coverPath = sortedImages.find((img: { is_cover: boolean }) => img.is_cover)?.storage_path ?? sortedImages[0]?.storage_path
  const images = sortedImages.map((img: { storage_path: string }) => storagePublicUrl(img.storage_path))

  const auction: AuctionDetail = {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    categoryName: catName,
    currentHighestBid: row.current_price,
    bidCount: row.bid_count,
    deadline: row.ends_at,
    reservePrice: row.reserve_price ?? undefined,
    status: row.status as AuctionStatus,
    currency: row.currency as Currency,
    thumbnailUrl: coverPath ? storagePublicUrl(coverPath) : PLACEHOLDER_IMG,
    description: row.description ?? "",
    images: images.length > 0 ? images : [PLACEHOLDER_IMG],
    startingPrice: row.starting_price,
    bidIncrement: row.bid_increment,
    minNextBid: row.current_price + row.bid_increment,
    startsAt: row.starts_at,
    seller: { id: row.seller_id, displayName: sellerName },
    winnerId: row.current_winner_id ?? undefined,
  }

  const { data: bidsData } = await supabase
    .from("auction_bids")
    .select("*, profiles!auction_bids_bidder_id_fkey(display_name)")
    .eq("lot_id", lotId)
    .order("created_at", { ascending: false })
    .limit(10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bids: BidRow[] = (bidsData ?? []).map((bid: any) => ({
    id: String(bid.id),
    bidderMasked: maskBidder(bid.profiles?.display_name ?? null, bid.bidder_id),
    amount: bid.amount,
    currency: row.currency as Currency,
    createdAt: bid.created_at,
  }))

  return { auction, bids }
}

export function getAuctionImagePublicUrl(storagePath: string): string {
  return storagePublicUrl(storagePath)
}
