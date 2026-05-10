"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  listingCreateSchema,
  listingUpdateSchema,
  concreteClassesRpcPayloadSchema,
  materialLogisticsRpcPayloadSchema,
  type ListingCreateInput,
  type ListingUpdateInput,
} from "@/lib/validation"
import type { Tables } from "@/types/supabase"

export type Listing = Tables<"marketplace_listings">

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

// Columns the server accepts. ANYTHING else sent by the client (id, seller_id,
// created_at, updated_at) is silently ignored.
const ALLOWED_FIELDS = [
  "listing_type",
  "title",
  "slug",
  "description",
  "category_id",
  "currency",
  "price",
  "unit",
  "available_qty",
  "is_active",
  "location",
  "pickup_address",
  "pickup_lat",
  "pickup_lng",
  "transport_modes",
  "min_order_qty",
  "transport_fee",
  "service_area",
  "equipment_condition",
  "equipment_model",
  "equipment_year",
  "seller_assumes_transport",
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

// Translate raw PostgREST / Postgres errors that point at a stale schema cache
// (e.g. PGRST204 "Could not find the 'X' column ... in the schema cache") into
// a clean Romanian message instead of leaking the raw string into the UI toast.
function humanizeDbError(message: string | undefined | null): string {
  const msg = message ?? ""
  if (
    msg.includes("schema cache") ||
    msg.includes("PGRST204") ||
    /Could not find the '[^']+' column/i.test(msg)
  ) {
    return "Schema bazei de date este invechita. Ruleaza migratia recenta pe Supabase si reincearca."
  }
  return msg || "Eroare necunoscuta la baza de date."
}

export async function createListingAction(
  raw: ListingCreateInput
): Promise<ActionResult<Listing>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = listingCreateSchema.safeParse(pickAllowed(raw))
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({ ...parsed.data, seller_id: user.id })
    .select()
    .single()

  if (error) return { success: false, error: humanizeDbError(error.message) }
  revalidatePath("/account")
  revalidatePath("/marketplace")
  return { success: true, data: data as Listing }
}

export async function updateListingAction(
  id: number,
  raw: ListingUpdateInput
): Promise<ActionResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = listingUpdateSchema.safeParse(pickAllowed(raw))
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  // Ownership check (belt): RLS also enforces it, but returning a clean error
  // here avoids surfacing a raw Postgres message in the UI.
  const { data: existing, error: fetchErr } = await supabase
    .from("marketplace_listings")
    .select("seller_id, slug")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }

  const { error } = await supabase
    .from("marketplace_listings")
    .update(parsed.data)
    .eq("id", id)

  if (error) return { success: false, error: humanizeDbError(error.message) }
  revalidatePath("/account")
  revalidatePath("/marketplace")
  if (existing.slug) revalidatePath(`/products/${existing.slug}-${id}`)
  return { success: true }
}

/** Replace all concrete class rows for a listing (seller-only, transactional RPC). */
export async function upsertConcreteClassesAction(
  listingId: number,
  rawRows: unknown,
): Promise<ActionResult> {
  if (!Number.isFinite(listingId) || listingId <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const parsed = concreteClassesRpcPayloadSchema.safeParse(rawRows)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { data: existing, error: fetchErr } = await supabase
    .from("marketplace_listings")
    .select("seller_id, slug")
    .eq("id", listingId)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }

  const { error } = await supabase.rpc("upsert_listing_concrete_classes", {
    p_listing_id: listingId,
    p_rows: parsed.data,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath("/account")
  revalidatePath("/marketplace")
  if (existing.slug) revalidatePath(`/products/${existing.slug}-${listingId}`)
  return { success: true }
}

/** Replace materials spec + transport rows (seller-only). */
export async function upsertMaterialLogisticsAction(
  listingId: number,
  raw: unknown,
): Promise<ActionResult> {
  if (!Number.isFinite(listingId) || listingId <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const parsed = materialLogisticsRpcPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error.issues) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { data: existing, error: fetchErr } = await supabase
    .from("marketplace_listings")
    .select("seller_id, slug")
    .eq("id", listingId)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }

  const { error } = await supabase.rpc("upsert_listing_material_logistics", {
    p_listing_id: listingId,
    p_spec: parsed.data.spec,
    p_offers: parsed.data.offers,
  })
  if (error) return { success: false, error: humanizeDbError(error.message) }

  revalidatePath("/account")
  revalidatePath("/marketplace")
  if (existing.slug) revalidatePath(`/products/${existing.slug}-${listingId}`)
  return { success: true }
}

export async function deleteListingAction(id: number): Promise<ActionResult> {
  if (!Number.isFinite(id) || id <= 0) {
    return { success: false, error: "ID invalid." }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { data: existing } = await supabase
    .from("marketplace_listings")
    .select("seller_id")
    .eq("id", id)
    .maybeSingle()
  if (!existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }

  const { error } = await supabase
    .from("marketplace_listings")
    .delete()
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  revalidatePath("/marketplace")
  return { success: true }
}
