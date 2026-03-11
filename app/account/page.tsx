import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/api/profile"
import { getMyListings } from "@/lib/api/listings"
import { getMyAuctions } from "@/lib/api/auctions"
import AccountContent from "./account-content"

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [profile, myListings, myAuctions] = await Promise.all([
    getProfile(),
    getMyListings(),
    getMyAuctions(),
  ])

  return (
    <Suspense>
      <AccountContent
        userEmail={user.email ?? ""}
        profile={profile}
        myListings={myListings}
        myAuctions={myAuctions}
      />
    </Suspense>
  )
}
