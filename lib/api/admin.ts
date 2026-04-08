import type {
  AuctionListItem,
  OrderSummary,
  User,
  AdminStats,
  AdminPayment,
  UserRole,
} from "@/types/domain"

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

export async function cancelAuction(
  _id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function forceCloseAuction(
  _id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function markOrderFulfilled(
  _id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function changeUserRole(
  _id: string,
  _role: UserRole
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}
