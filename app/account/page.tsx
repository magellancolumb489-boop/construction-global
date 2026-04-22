import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/api/profile"
import { getMyListings } from "@/lib/api/listings"
import { getMyAuctions } from "@/lib/api/auctions"
import { getMyAddresses } from "@/lib/api/addresses"
import { getMyWishlist } from "@/lib/api/wishlist"
import { getReviewsGiven, getReviewsReceived } from "@/lib/api/reviews"
import { getMyThreads } from "@/lib/api/messages"
import { getSellerDashboard } from "@/lib/api/seller"
import { getRecentLoginEvents } from "@/lib/api/security"
import { getMyDeletionRequest } from "@/lib/api/privacy"
import { getMyNotificationPrefs } from "@/lib/api/notification-prefs"
import AccountContent from "./account-content"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch everything the shell + every tab might need in parallel. Each
  // helper is RLS-scoped; they fail closed to empty arrays / null on error.
  const [
    profile,
    myListings,
    myAuctions,
    addresses,
    wishlist,
    reviewsGiven,
    reviewsReceived,
    threads,
    sellerDashboard,
    loginEvents,
    deletionRequest,
    notificationPrefs,
  ] = await Promise.all([
    getProfile(),
    getMyListings(),
    getMyAuctions(),
    getMyAddresses(),
    getMyWishlist(),
    getReviewsGiven(),
    getReviewsReceived(),
    getMyThreads(),
    getSellerDashboard(),
    getRecentLoginEvents(20),
    getMyDeletionRequest(),
    getMyNotificationPrefs(),
  ])

  return (
    <Suspense>
      <AccountContent
        userEmail={user.email ?? ""}
        currentUserId={user.id}
        profile={profile}
        myListings={myListings}
        myAuctions={myAuctions}
        addresses={addresses}
        wishlist={wishlist}
        reviewsGiven={reviewsGiven}
        reviewsReceived={reviewsReceived}
        threads={threads}
        sellerDashboard={sellerDashboard}
        loginEvents={loginEvents}
        deletionRequest={deletionRequest}
        notificationPrefs={notificationPrefs}
      />
    </Suspense>
  )
}
