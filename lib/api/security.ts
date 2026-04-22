import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type LoginEvent = Tables<"login_events">

// Recent audit entries for the Security tab.
export async function getRecentLoginEvents(limit = 20): Promise<LoginEvent[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("login_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getRecentLoginEvents error:", error.message)
    return []
  }
  return data ?? []
}
