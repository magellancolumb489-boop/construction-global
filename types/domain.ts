// Currency
export type Currency = "RON" | "EUR"

// User -- aligned with public.profiles table
export type UserRole = "user" | "admin"
export interface User {
  id: string
  email: string
  displayName: string
  phone?: string
  role: UserRole
  avatarPath?: string
}

// Auction -- statuses match DB values exactly
export type AuctionStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "ended"
  | "cancelled"

export interface AuctionListItem {
  id: string
  slug: string
  title: string
  categoryName: string
  currentHighestBid: number
  bidCount: number
  deadline: string
  reservePrice?: number
  status: AuctionStatus
  currency: Currency
  thumbnailUrl: string
}

export interface AuctionDetail extends AuctionListItem {
  description: string
  images: string[]
  startingPrice: number
  bidIncrement: number
  minNextBid: number
  startsAt: string
  seller: { id: string; displayName: string }
  winnerId?: string
}

export interface BidRow {
  id: string
  bidderMasked: string
  amount: number
  currency: Currency
  createdAt: string
}

// Product / Marketplace
export type ProductUnit = "TON" | "KG" | "M3" | "BUC" | "ML"

/** Mirrors marketplace_listings.listing_type — drives PDP and cart behaviour. */
export type ListingKind = "concrete" | "materials" | "equipment" | "services"

export interface ProductListItem {
  id: string
  slug: string
  name: string
  price: number
  unit: ProductUnit
  currency: Currency
  availableQty: number
  thumbnailUrl: string
  category: string
  /** When set, product cards can show the correct CTA label. */
  listingKind?: ListingKind
}

export interface ProductDetail extends ProductListItem {
  description: string
  images: string[]
  /** Seller profile id (UUID) — needed for calculator / configurare flow */
  sellerId: string
  /** FK to categories.id when set */
  categoryId: number | null
  /** Listing location label from DB */
  location: string | null
  sellerDisplayName: string | null
  sellerPhone: string | null
  /** concrete → distance calculator; other kinds use fixed fees or simple add-to-cart. */
  listingKind: ListingKind
  /** Fixed transport add-on (materials / some equipment); RON/EUR per listing currency. */
  transportFee: number | null
  minOrderQty: number | null
  pickupLat: number | null
  pickupLng: number | null
  transportModes: string[] | null
  serviceArea: string | null
}

/** Snapshot of livrare + fiscal from configurare; also stored for checkout prefill */
export interface OrderConfigureBuyerDelivery {
  addressLine1: string
  city: string
  county: string
  country: string
  isCompany: boolean
  companyName?: string
  vatNumber?: string
}

// Cart
export interface CartItem {
  productId: string
  name: string
  price: number
  unit: ProductUnit
  currency: Currency
  qty: number
  availableQty: number
  thumbnailUrl: string
  /**
   * When true, checkout is blocked until configurationComplete is true.
   * Legacy cart rows omit both flags → treated as not requiring calculator.
   */
  configurationRequired?: boolean
  configurationComplete?: boolean
  /** Calculator total with TVA; line display uses price * qty === this when set consistently */
  quoteSummary?: {
    totalGross: number
    isManual: boolean
    calcType: string
    transportNote?: string
  }
  /** Livrare + fiscal captured at configurare (optional prefill for checkout) */
  configureDelivery?: OrderConfigureBuyerDelivery
  /** One-time transport surcharge for non-calculator listings (added to line total). */
  transportFee?: number
}

// Orders
export type OrderStatus = "PENDING" | "CONFIRMED" | "FULFILLED" | "CANCELLED"
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED"

export interface OrderSummary {
  id: string
  createdAt: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  total: number
  currency: Currency
  itemCount: number
}

export interface OrderDetail extends OrderSummary {
  items: CartItem[]
  shippingAddress?: {
    line1: string
    city: string
    county: string
    country: string
  }
  notes?: string
  receiptUrl?: string
}

// Admin
export interface AdminStats {
  totalAuctions: number
  activeAuctions: number
  totalOrders: number
  totalUsers: number
  totalPayments: number
  revenue: number
}

export interface AdminPayment {
  id: string
  providerId: string
  status: PaymentStatus
  amount: number
  currency: Currency
  linkedEntityType: "ORDER" | "AUCTION"
  linkedEntityId: string
  createdAt: string
}
