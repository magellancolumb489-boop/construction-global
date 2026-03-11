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
}

export interface ProductDetail extends ProductListItem {
  description: string
  images: string[]
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
