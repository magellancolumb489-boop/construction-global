import type { ProductListItem, ProductDetail } from "@/types/domain"
import { mockProducts, mockProductDetails } from "./mock-data"

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sort?: "price_asc" | "price_desc" | "name"
  page?: number
  perPage?: number
}

export async function getProducts(filters?: ProductFilters): Promise<{
  items: ProductListItem[]
  total: number
}> {
  await delay()
  let items = [...mockProducts]

  if (filters?.category) {
    items = items.filter((p) => p.category === filters.category)
  }
  if (filters?.minPrice !== undefined) {
    items = items.filter((p) => p.price >= filters.minPrice!)
  }
  if (filters?.maxPrice !== undefined) {
    items = items.filter((p) => p.price <= filters.maxPrice!)
  }
  if (filters?.inStock) {
    items = items.filter((p) => p.availableQty > 0)
  }

  if (filters?.sort === "price_asc") {
    items.sort((a, b) => a.price - b.price)
  } else if (filters?.sort === "price_desc") {
    items.sort((a, b) => b.price - a.price)
  }

  return { items, total: items.length }
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  await delay()
  return mockProductDetails[id] ?? null
}
