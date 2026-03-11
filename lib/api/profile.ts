import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type Profile = Tables<"profiles">

// Server-side: fetch the authenticated user's profile row
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    console.error("getProfile error:", error.message)
    return null
  }
  return data
}
