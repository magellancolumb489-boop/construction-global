import type { Profile } from "@/lib/api/profile-client"
import type { Listing } from "@/lib/api/listings-client"
import type { UserAddress } from "@/lib/api/addresses"
import type { WishlistEntry } from "@/lib/api/wishlist"
import type { ReviewWithContext } from "@/lib/api/reviews"
import type { ThreadSummary } from "@/lib/api/messages"
import type { SellerDashboard } from "@/lib/api/seller"
import type { LoginEvent } from "@/lib/api/security"
import type { DeletionRequest } from "@/lib/api/privacy"
import type { NotificationPrefs } from "@/lib/api/notification-prefs"

/** Seller auction row shape (shell tab; DB auctions stand-down — list stays empty). */
export interface MyAuction {
  id: number
  slug: string
  title: string
  category_name: string
  status: string
  current_price: number
  currency: string
  bid_count: number
}

export interface MyListing extends Listing {
  category_name: string
}

// Shared shape for every account tab. The shell resolves everything once and
// forwards the same reference to each lazy tab below.
export interface AccountData {
  userEmail: string
  profile: Profile | null
  myListings: MyListing[]
  myAuctions: MyAuction[]
  addresses: UserAddress[]
  wishlist: WishlistEntry[]
  reviewsGiven: ReviewWithContext[]
  reviewsReceived: ReviewWithContext[]
  threads: ThreadSummary[]
  sellerDashboard: SellerDashboard
  loginEvents: LoginEvent[]
  deletionRequest: DeletionRequest | null
  notificationPrefs: NotificationPrefs | null
}

export type TabId =
  | "profile"
  | "business"
  | "addresses"
  | "preferences"
  | "notifications"
  | "security"
  | "privacy"
  | "orders"
  | "wishlist"
  | "reviews-given"
  | "payment-methods"
  | "seller-dashboard"
  | "listings"
  | "auctions"
  | "seller-payouts"
  | "seller-shipping"
  | "seller-policies"
  | "reviews-received"
  | "messages"

export type TabGroupId = "cont" | "cumparator" | "vanzator" | "comunicare"
