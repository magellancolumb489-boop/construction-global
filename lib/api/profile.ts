import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type Profile = Tables<"profiles">

// Server-side: fetch the authenticated user's profile row
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Column-level grants hide phone/role from direct SELECT *; use SECURITY DEFINER RPC instead.
  const { data, error } = await supabase.rpc("get_my_profile")

  if (error) {
    console.error("getProfile error:", error.message)
    return null
  }

  const rows = data as Profile[] | null
  const row = Array.isArray(rows) ? rows[0] : null
  return row ?? null
}
