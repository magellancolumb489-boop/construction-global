import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type NotificationPrefs = Tables<"user_notification_preferences">

// Reads (or lazily seeds) the caller's notification preferences row.
export async function getMyNotificationPrefs(): Promise<NotificationPrefs | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("getMyNotificationPrefs error:", error.message)
    return null
  }
  return data
}

export async function getMyWishlistCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from("wishlist_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
  return count ?? 0
}
