import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type UserAddress = Tables<"user_addresses">

// Server-side: list caller's addresses, billing-default → shipping-default → newest.
export async function getMyAddresses(): Promise<UserAddress[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default_billing", { ascending: false })
    .order("is_default_shipping", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getMyAddresses error:", error.message)
    return []
  }
  return data ?? []
}
