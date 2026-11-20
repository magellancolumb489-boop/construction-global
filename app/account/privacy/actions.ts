"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { dispatch } from "@/lib/notifications/dispatch"

type ActionResult = { success: true } | { success: false; error: string }

const DELETION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Immediate GDPR export (art. 20): every row the user can read under RLS,
 * returned as JSON for a browser download. Nothing beyond the user's own data
 * is reachable because the cookie client is RLS-scoped.
 */
export async function exportMyDataAction(): Promise<{ success: true; json: string } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const [profile, addresses, listings, orders, reviews, threads, wishlist, prefs, subs, intents] = await Promise.all([
    supabase.rpc("get_my_profile"),
    supabase.from("user_addresses").select("*"),
    supabase.from("marketplace_listings").select("*").eq("seller_id", user.id),
    supabase.from("orders").select("*, order_lines(*), order_transport(*), order_transport_events(*)").limit(1000),
    supabase.from("reviews").select("*").eq("reviewer_id", user.id),
    supabase.from("message_threads").select("*, messages(*)"),
    supabase.from("wishlist_items").select("*"),
    supabase.from("user_notification_preferences").select("*"),
    supabase.from("seller_subscriptions").select("*"),
    supabase.from("payment_intents").select("*"),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data?.[0] ?? null,
    addresses: addresses.data ?? [],
    listings: listings.data ?? [],
    orders: orders.data ?? [],
    reviews_written: reviews.data ?? [],
    message_threads: threads.data ?? [],
    wishlist: wishlist.data ?? [],
    notification_preferences: prefs.data ?? [],
    subscriptions: subs.data ?? [],
    payments: intents.data ?? [],
  }
  return { success: true, json: JSON.stringify(payload, null, 2) }
}

// Legacy: kept for callers that only record the request.
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
