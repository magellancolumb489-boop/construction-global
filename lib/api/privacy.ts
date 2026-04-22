import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type DeletionRequest = Tables<"account_deletion_requests">

// Pending / active deletion request for the caller (null if none).
export async function getMyDeletionRequest(): Promise<DeletionRequest | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .maybeSingle()

  if (error) {
    console.error("getMyDeletionRequest error:", error.message)
    return null
  }
  return data
}
