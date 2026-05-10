import type {
  AuctionListItem,
  OrderSummary,
  User,
  AdminStats,
  AdminPayment,
} from "@/types/domain"

// Admin read-only stubs (delays simulate Supabase latency in the dashboard).
// Mutating admin operations live in app/admin/actions.ts and are backed by
// SECURITY DEFINER RPC (set_user_role). Never expose a client-side write to profiles.role.

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

const emptyAdminStats: AdminStats = {
  totalAuctions: 0,
  activeAuctions: 0,
  totalOrders: 0,
  totalUsers: 0,
  totalPayments: 0,
  revenue: 0,
}

// Admin API: replace with Supabase-backed queries when dashboard is wired
export async function getAdminStats(): Promise<AdminStats> {
  await delay()
  return { ...emptyAdminStats }
}

export async function getAdminAuctions(): Promise<AuctionListItem[]> {
  await delay()
  return []
}

export async function getAdminOrders(): Promise<OrderSummary[]> {
  await delay()
  return []
}

export async function getAdminUsers(): Promise<User[]> {
  await delay()
  return []
}

export async function getAdminPayments(): Promise<AdminPayment[]> {
  await delay()
  return []
}

export async function markOrderFulfilled(
  _id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

// NOTE: Admin auction mutations are stand-down. User role changes use
// changeUserRoleAction in app/admin/actions.ts.
