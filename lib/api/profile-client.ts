import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesUpdate } from "@/types/supabase"

export type Profile = Tables<"profiles">
export type ProfileUpdate = Pick<TablesUpdate<"profiles">, "display_name" | "phone" | "avatar_path">

// Client-side: update safe profile fields (RLS enforces own-row access)
export async function updateProfile(
  updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
