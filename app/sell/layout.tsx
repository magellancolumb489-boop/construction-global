import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Guard for all /sell/* routes: logged in AND activated seller. The DB
// enforces the same (listings_c_require_seller); this only avoids letting a
// user fill a whole wizard that cannot be saved.
export default async function SellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login?next=/sell/listing/new")

  const { data: activated } = await supabase.rpc("is_seller_activated", { p_user_id: user.id })
  if (activated !== true) redirect("/account?tab=seller-dashboard&activate=1")

  return <>{children}</>
}
