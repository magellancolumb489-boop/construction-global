"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { dispatch } from "@/lib/notifications/dispatch"

type ActionResult = { success: true } | { success: false; error: string }

const DELETION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

// GDPR-style data export: creates a flagged row so ops can pick it up.
// Full export generation lands once the backoffice is wired.
export async function requestDataExportAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  await dispatch({
    userId: user.id,
    topic: "security",
    subject: "Cerere export date",
    body: "Am inregistrat cererea de export a datelor. Veti primi link-ul in maxim 7 zile.",
  })

  revalidatePath("/account")
  return { success: true }
}

export async function requestAccountDeletionAction(
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const trimmed = typeof reason === "string" ? reason.trim().slice(0, 500) : null
  const scheduledFor = new Date(Date.now() + DELETION_WINDOW_MS).toISOString()

  const { error } = await supabase
    .from("account_deletion_requests")
    .upsert(
      {
        user_id: user.id,
        reason: trimmed,
        scheduled_for: scheduledFor,
        status: "pending",
      },
      { onConflict: "user_id" },
    )
  if (error) return { success: false, error: error.message }

  await dispatch({
    userId: user.id,
    topic: "security",
    subject: "Cerere stergere cont",
    body: `Contul va fi sters definitiv la ${scheduledFor}. Puteti anula cererea pana atunci.`,
  })

  revalidatePath("/account")
  return { success: true }
}

export async function cancelAccountDeletionAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "pending")
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}
