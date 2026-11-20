import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface MySubscription {
  id: string
  planCode: string
  status: "pending" | "active" | "past_due" | "cancelled" | "expired"
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

/** Seller's live subscription (or latest pending), RLS-scoped to the owner. */
export async function getMySubscription(): Promise<MySubscription | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data } = await supabase
    .from("seller_subscriptions")
    .select("id, plan_code, status, current_period_end, cancel_at_period_end")
    .eq("seller_id", auth.user.id)
    .in("status", ["active", "past_due", "pending"])
    .order("created_at", { ascending: false })
    .limit(5)
  const rows = data ?? []
  const row = rows.find((r) => r.status !== "pending") ?? rows[0]
  if (!row) return null
  return {
    id: row.id,
    planCode: row.plan_code,
    status: row.status as MySubscription["status"],
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  }
}
