import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CheckoutClient } from "./checkout-client"

// Force dynamic so the auth check runs on every request — checkout must never
// be cached and the cookie must drive the response.
export const dynamic = "force-dynamic"

// Server-side auth guard. Anonymous users are bounced to /login with a `next`
// hint so they land back here after sign-in. Keeps the rest of the file
// (form + state machine) as a thin client child.
export default async function CheckoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/checkout")
  }

  return <CheckoutClient userEmail={user.email ?? ""} />
}
