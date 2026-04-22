"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  auctionCreateSchema,
  auctionUpdateSchema,
  type AuctionCreateInput,
  type AuctionUpdateInput,
} from "@/lib/validation"
import type { Tables } from "@/types/supabase"

export type AuctionLot = Tables<"auction_lots">

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Seller-editable fields. NOT listed here: seller_id, id, status, current_price,
// current_winner_id, bid_count, created_at, updated_at. Those are either
// server-injected (seller_id) or RPC-managed (status/current_price/...).
const ALLOWED_FIELDS = [
  "title",
  "slug",
  "description",
  "category_id",
  "starting_price",
  "reserve_price",
  "bid_increment",
  "currency",
  "starts_at",
  "ends_at",
  "status",
] as const

function pickAllowed<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in input) out[key] = input[key]
  }
  return out as Partial<T>
}

function firstIssue(issues: { message: string }[] | undefined): string {
  return issues?.[0]?.message ?? "Date invalide"
}

export async function createAuctionAction(
  raw: AuctionCreateInput
): Promise<ActionResult<AuctionLot>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = auctionCreateSchema.safeParse(pickAllowed(raw))
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  // current_price is seeded from starting_price. Status is constrained by the
  // schema to draft|scheduled; default 'scheduled' if the client didn't pick.
  const { data, error } = await supabase
    .from("auction_lots")
    .insert({
      ...parsed.data,
      seller_id: user.id,
      current_price: parsed.data.starting_price,
      bid_count: 0,
      current_winner_id: null,
      status: parsed.data.status ?? "scheduled",
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  revalidatePath("/auctions")
  return { success: true, data: data as AuctionLot }
}

export async function updateAuctionAction(
  id: number,
  raw: AuctionUpdateInput
): Promise<ActionResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = auctionUpdateSchema.safeParse(pickAllowed(raw))
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  const { data: existing } = await supabase
    .from("auction_lots")
    .select("seller_id, status, bid_count, slug")
    .eq("id", id)
    .maybeSingle()
  if (!existing) return { success: false, error: "Licitatie inexistenta." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestei licitatii." }
  }
  if (existing.bid_count > 0) {
    return {
      success: false,
      error: "Licitatia are deja oferte si nu mai poate fi editata.",
    }
  }
  if (!(existing.status === "draft" || existing.status === "scheduled")) {
    return {
      success: false,
      error: "Licitatia nu mai poate fi editata in acest stadiu.",
    }
  }

  const { error } = await supabase
    .from("auction_lots")
    .update(parsed.data)
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  revalidatePath("/auctions")
  if (existing.slug) revalidatePath(`/auctions/${existing.slug}`)
  return { success: true }
}

export async function deleteAuctionAction(id: number): Promise<ActionResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { data: existing } = await supabase
    .from("auction_lots")
    .select("seller_id, status, bid_count")
    .eq("id", id)
    .maybeSingle()
  if (!existing) return { success: false, error: "Licitatie inexistenta." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestei licitatii." }
  }
  if (existing.bid_count > 0) {
    return { success: false, error: "Licitatia are oferte si nu poate fi stearsa." }
  }
  if (!(existing.status === "draft" || existing.status === "scheduled")) {
    return { success: false, error: "Licitatia nu mai poate fi stearsa." }
  }

  const { error } = await supabase.from("auction_lots").delete().eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  revalidatePath("/auctions")
  return { success: true }
}
