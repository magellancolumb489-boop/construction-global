import type { OrderSummary, OrderDetail } from "@/types/domain"

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

// Orders API: replace with Supabase when order pipeline is implemented
export async function getOrders(): Promise<OrderSummary[]> {
  await delay()
  return []
}

export async function getOrderDetail(_id: string): Promise<OrderDetail | null> {
  await delay()
  return null
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
  _data: CheckoutData
): Promise<{ success: boolean; orderId?: string; checkoutUrl?: string }> {
  await delay(800)
  return {
    success: true,
    orderId: "ord-" + Date.now(),
    checkoutUrl: "/checkout/success",
  }
}
