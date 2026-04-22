"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

type ActionResult = { success: true } | { success: false; error: string }

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

async function recordLoginEvent(
  userId: string,
  event: "login" | "logout" | "password_change" | "session_revoked",
) {
  const { supabase } = await getUser()
  const hdr = await headers()
  const ua = hdr.get("user-agent")?.slice(0, 200) ?? null
  const ip =
    hdr.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdr.get("x-real-ip") ??
    null

  await supabase.from("login_events").insert({
    user_id: userId,
    event,
    user_agent: ua,
    ip,
  })
}

export async function changePasswordAction(newPassword: string): Promise<ActionResult> {
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 200) {
    return { success: false, error: "Parola trebuie sa aiba intre 8 si 200 de caractere." }
  }
  const { supabase, user } = await getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: error.message }

  await recordLoginEvent(user.id, "password_change")
  revalidatePath("/account")
  return { success: true }
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  const { supabase, user } = await getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase.auth.signOut({ scope: "others" })
  if (error) return { success: false, error: error.message }

  await recordLoginEvent(user.id, "session_revoked")
  revalidatePath("/account")
  return { success: true }
}

// Called from the login/logout flow to fill the audit trail.
export async function recordLoginEventAction(
  event: "login" | "logout",
): Promise<ActionResult> {
  const { user } = await getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }
  await recordLoginEvent(user.id, event)
  return { success: true }
}
