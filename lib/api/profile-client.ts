import type { Tables, TablesUpdate } from "@/types/supabase"
import { updateMyProfileAction } from "@/app/account/actions"

export type Profile = Tables<"profiles">
export type ProfileUpdate = Pick<TablesUpdate<"profiles">, "display_name" | "phone" | "avatar_path">

// updateProfile: thin wrapper around the server action. role / id are stripped
// before the action even runs; the DB trigger profiles_block_role_update
// rejects any attempt to change role from a non-admin path.
export async function updateProfile(
  updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
  const res = await updateMyProfileAction(updates)
  return res.success ? { success: true } : { success: false, error: res.error }
}
