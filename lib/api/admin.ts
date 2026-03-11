import type {
  AuctionListItem,
  OrderSummary,
  User,
  AdminStats,
  AdminPayment,
  UserRole,
} from "@/types/domain"
import {
  mockAuctions,
  mockOrders,
  mockUsers,
  mockAdminStats,
  mockAdminPayments,
} from "./mock-data"

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export async function getAdminStats(): Promise<AdminStats> {
  await delay()
  return { ...mockAdminStats }
}

export async function getAdminAuctions(): Promise<AuctionListItem[]> {
  await delay()
  return [...mockAuctions]
}

export async function getAdminOrders(): Promise<OrderSummary[]> {
  await delay()
  return [...mockOrders]
}

export async function getAdminUsers(): Promise<User[]> {
  await delay()
  return [...mockUsers]
}

export async function getAdminPayments(): Promise<AdminPayment[]> {
  await delay()
  return [...mockAdminPayments]
}

export async function cancelAuction(
  id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function forceCloseAuction(
  id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function markOrderFulfilled(
  id: string
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}

export async function changeUserRole(
  id: string,
  role: UserRole
): Promise<{ success: boolean }> {
  await delay(600)
  return { success: true }
}
