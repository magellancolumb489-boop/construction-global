import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"
import type {
  ProductListItem,
  ProductDetail,
  Currency,
  ProductUnit,
  ListingKind,
} from "@/types/domain"

export type Listing = Tables<"marketplace_listings">
export type ListingImage = Tables<"marketplace_listing_images">

export interface ListingWithImages extends Listing {
  marketplace_listing_images: ListingImage[]
}

export interface ListingsFilter {
  categoryId?: number
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  sort?: "price_asc" | "price_desc" | "newest" | "title"
  limit?: number
  offset?: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Build a public Storage URL from a storage path
function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`
}

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop"

/** Normalise DB listing_type to the domain enum. */
function listingKindFromRow(listing: Listing): ListingKind {
  const t = listing.listing_type
  if (t === "concrete" || t === "materials" || t === "equipment" || t === "services") {
    return t
  }
  return "materials"
}

// Map a DB listing row to the presentation ProductListItem shape
export function toProductListItem(
  listing: Listing,
  categoryName?: string,
  firstImagePath?: string
): ProductListItem {
  return {
    id: String(listing.id),
    slug: listing.slug,
    name: listing.title,
    price: listing.price,
    unit: listing.unit as ProductUnit,
    currency: listing.currency as Currency,
    availableQty: listing.available_qty,
    thumbnailUrl: firstImagePath ? storagePublicUrl(firstImagePath) : PLACEHOLDER_IMG,
    category: categoryName ?? "",
    listingKind: listingKindFromRow(listing),
  }
}

// Map a DB listing with images to the presentation ProductDetail shape
export function toProductDetail(
  listing: ListingWithImages,
  categoryName?: string,
  seller?: { display_name: string | null; phone: string | null } | null
): ProductDetail {
  const images = listing.marketplace_listing_images
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => storagePublicUrl(img.storage_path))

  const kind = listingKindFromRow(listing)
  return {
    ...toProductListItem(listing, categoryName, listing.marketplace_listing_images[0]?.storage_path),
    listingKind: kind,
    description: listing.description ?? "",
    images: images.length > 0 ? images : [PLACEHOLDER_IMG],
    sellerId: listing.seller_id,
    categoryId: listing.category_id ?? null,
    location: listing.location ?? null,
    sellerDisplayName: seller?.display_name?.trim() || null,
    sellerPhone: seller?.phone?.trim() || null,
    transportFee: listing.transport_fee ?? null,
    minOrderQty: listing.min_order_qty ?? null,
    pickupLat: listing.pickup_lat ?? null,
    pickupLng: listing.pickup_lng ?? null,
    transportModes: listing.transport_modes ?? null,
    serviceArea: listing.service_area ?? null,
  }
}

// Server-side: fetch active listings with optional filters
export async function getListings(filters: ListingsFilter = {}): Promise<{
  items: Listing[]
  total: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("marketplace_listings")
    .select("*", { count: "exact" })
    .eq("is_active", true)

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice)
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice)
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true })
      break
    case "price_desc":
      query = query.order("price", { ascending: false })
      break
    case "title":
      query = query.order("title", { ascending: true })
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
    console.error("getListings error:", error.message)
    return { items: [], total: 0 }
  }
  return { items: data ?? [], total: count ?? 0 }
}

// Server-side: fetch a single listing by slug with its images
export async function getListingDetail(slug: string): Promise<ListingWithImages | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*, marketplace_listing_images(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("getListingDetail error:", error.message)
    return null
  }
  return data as ListingWithImages
}

// Server-side: fetch listings and return them as ProductListItem[] with category names resolved
export async function getProductListItems(filters: ListingsFilter = {}): Promise<{
  items: ProductListItem[]
  total: number
}> {
  const supabase = await createClient()

  // Fetch listings with their first image and category name in one query
  let query = supabase
    .from("marketplace_listings")
    .select("*, marketplace_listing_images(storage_path, display_order), categories(name)", { count: "exact" })
    .eq("is_active", true)

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId)
  }
  if (filters.categorySlug) {
    query = query.eq("categories.slug", filters.categorySlug)
  }
  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice)
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice)
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`)
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true })
      break
    case "price_desc":
      query = query.order("price", { ascending: false })
      break
    case "title":
      query = query.order("title", { ascending: true })
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
    console.error("getProductListItems error:", error.message)
    return { items: [], total: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (data ?? []).map((row: any) => {
    const catName = row.categories?.name ?? ""
    const images = (row.marketplace_listing_images ?? []) as { storage_path: string; display_order: number }[]
    const sorted = images.sort((a, b) => a.display_order - b.display_order)
    const firstPath = sorted[0]?.storage_path
    return toProductListItem(row as Listing, catName, firstPath)
  })

  return { items, total: count ?? 0 }
}

// Server-side: fetch ALL listings (active + inactive) owned by the current user
export async function getMyListings(): Promise<(Listing & { category_name: string })[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*, categories(name)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getMyListings error:", error.message)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    category_name: row.categories?.name ?? "",
  }))
}

// Server-side: fetch a single listing by ID for editing (owner only, includes inactive)
export async function getListingForEdit(id: number): Promise<ListingWithImages | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*, marketplace_listing_images(*)")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single()

  if (error) {
    console.error("getListingForEdit error:", error.message)
    return null
  }
  return data as ListingWithImages
}

// Server-side: get seller_id + listing id for a slug (used for owner checks on detail page)
export async function getListingOwnerInfo(slug: string): Promise<{ sellerId: string; listingId: number } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("seller_id, id")
    .eq("slug", slug)
    .single()

  if (error) return null
  return { sellerId: data.seller_id, listingId: data.id }
}

// Server-side: fetch a single listing by slug and return it as ProductDetail
export async function getProductDetailFromListing(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(
      "*, marketplace_listing_images(*), categories(name), profiles(display_name, phone)"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("getProductDetailFromListing error:", error.message)
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  const catName = row.categories?.name ?? ""
  const prof = row.profiles as
    | { display_name: string | null; phone: string | null }
    | { display_name: string | null; phone: string | null }[]
    | null
  let seller = Array.isArray(prof) ? prof[0] ?? null : prof
  // Embed can be null (RLS) or return blank display_name; direct read often still works for public marketplace
  const sellerId = row.seller_id as string
  if (!seller?.display_name?.trim()) {
    const { data: profRow, error: profErr } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", sellerId)
      .maybeSingle()
    if (!profErr && profRow) {
      seller = {
        display_name: profRow.display_name,
        phone: profRow.phone,
      }
    }
  }
  return toProductDetail(row as ListingWithImages, catName, seller)
}
