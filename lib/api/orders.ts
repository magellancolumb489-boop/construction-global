import type { OrderSummary, OrderDetail } from "@/types/domain"
import { mockOrders, mockOrderDetails } from "./mock-data"

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export async function getOrders(): Promise<OrderSummary[]> {
  await delay()
  return [...mockOrders]
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  await delay()
  return mockOrderDetails[id] ?? null
}

export interface CheckoutData {
  name: string
  email: string
  phone: string
  isCompany: boolean
  companyName?: string
  vatNumber?: string
  addressLine1?: string
  city?: string
  county?: string
  country?: string
  notes?: string
}

export async function createCheckout(
  data: CheckoutData
): Promise<{ success: boolean; orderId?: string; checkoutUrl?: string }> {
  await delay(800)
  return {
    success: true,
    orderId: "ord-" + Date.now(),
    checkoutUrl: "/checkout/success",
  }
}
