import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { OrderViewerRole } from "@/components/orders/transport-panel"

/**
 * Who is looking at an order. UX only: every action is re-checked in the DB
 * (transport_transition / cancel_order / create_payment_intent), and RLS
 * already limits the order to buyer, seller and admin.
 */
export async function getOrderViewerRole(order: { buyer_id: string; seller_id: string }): Promise<OrderViewerRole | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (isAdmin === true) return "admin"
  if (auth.user.id === order.seller_id) return "seller"
  if (auth.user.id === order.buyer_id) return "buyer"
  return null
}
