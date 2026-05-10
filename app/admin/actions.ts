"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type ActionResult = { success: true } | { success: false; error: string }

// Map DB error codes returned from set_user_role to localized user-friendly text
function mapRoleError(code: string): string {
  switch (code) {
    case "forbidden":
      return "Permisiuni insuficiente."
    case "invalid_role":
      return "Rol invalid."
    case "invalid_target":
      return "Utilizator invalid."
    case "profile_not_found":
      return "Profil inexistent."
    case "cannot_demote_self":
      return "Nu te poti retrograda singur."
    default:
      return "Operatiune esuata."
  }
}

// Admin-only: change a user's role via SECURITY DEFINER RPC. The RPC itself
// re-checks that auth.uid() is an admin, so this action is safe even if the
// route wrapping it were ever accidentally exposed.
export async function changeUserRoleAction(
  targetUserId: string,
  newRole: "user" | "admin"
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data, error } = await supabase.rpc("set_user_role", {
    p_target: targetUserId,
    p_role: newRole,
  })

  if (error) return { success: false, error: error.message }

  if (data && typeof data === "object" && "ok" in data) {
    const payload = data as { ok: boolean; error?: string }
    if (!payload.ok) {
      return { success: false, error: mapRoleError(payload.error ?? "") }
    }
  }

  revalidatePath("/admin/users")
  return { success: true }
}
