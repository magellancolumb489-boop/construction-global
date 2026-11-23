"use server"

import { checkPrice, listingCoreIssues, priceMessage, priceRange, type ListingCore } from "@/lib/listings/rules"
import { COMPANY_ONLY_MESSAGE, listingTypeAllowed, materialAllowed } from "@/lib/listings/seller-eligibility"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  listingCreateSchema,
  listingUpdateSchema,
  concreteClassesRpcPayloadSchema,
  materialListingIssue,
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
  if (/listing fee required/i.test(msg)) {
    return "Publicarea necesita plata taxei de anunt (sau un abonament). Anuntul ramane salvat ca inactiv."
  }
  if (/active listing limit reached/i.test(msg)) {
    return "Ai atins numarul maxim de anunturi active din abonament. Dezactiveaza un anunt sau schimba planul."
  }
  if (/company only listing/i.test(msg)) {
    return "Acest produs poate fi vandut doar de firme (PFA, II, IF, SRL, SA)."
  }
  if (/listing is deleted/i.test(msg)) return "Anuntul a fost sters si nu mai poate fi modificat."
  return msg || "Eroare necunoscuta la baza de date."
}

type Supa = Awaited<ReturnType<typeof createClient>>

/** Seller legal form; PF sellers cannot publish company-only products. */
async function sellerEntityType(supabase: Supa, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("entity_type").eq("id", userId).maybeSingle()
  return (data?.entity_type as string | null | undefined) ?? null
}

/** Map a listing row (or row + changes) to the shared content rules input. */
function toCore(row: Record<string, unknown>): ListingCore {
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v))
  return {
    listing_type: (row.listing_type as ListingCore["listing_type"]) ?? "materials",
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    price: Number(row.price ?? 0),
    unit: String(row.unit ?? ""),
    available_qty: Number(row.available_qty ?? 0),
    min_order_qty: num(row.min_order_qty),
    location: (row.location as string | null) || (row.pickup_address as string | null) || null,
    equipment_condition: (row.equipment_condition as string | null) ?? null,
    equipment_model: (row.equipment_model as string | null) ?? null,
    equipment_year: num(row.equipment_year),
    service_area: (row.service_area as string | null) ?? null,
  }
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
  const ruleIssue = listingCoreIssues(toCore(parsed.data))[0]
  if (ruleIssue) return { success: false, error: ruleIssue.message }
  if (!listingTypeAllowed(await sellerEntityType(supabase, user.id), toCore(parsed.data).listing_type)) {
    return { success: false, error: COMPANY_ONLY_MESSAGE }
  }

  let { data, error } = await supabase
    .from("marketplace_listings")
    .insert({ ...parsed.data, seller_id: user.id })
    .select()
    .single()

  // Publication gate (pay-per-post / plan limit): keep the work as an inactive
  // draft; the seller publishes it after paying from "Anunturile mele".
  if (error && /listing fee required|active listing limit reached/i.test(error.message)) {
    ;({ data, error } = await supabase
      .from("marketplace_listings")
      .insert({ ...parsed.data, is_active: false, seller_id: user.id })
      .select()
      .single())
  }

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
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }

  // Rules run on the row as it will be after the update, so partial updates
  // cannot slip past them. Turning a listing off is always allowed.
  const onlyDeactivating = Object.keys(parsed.data).length === 1 && parsed.data.is_active === false
  if (!onlyDeactivating) {
    const after = toCore({ ...existing, ...parsed.data })
    const ruleIssue = listingCoreIssues(after)[0]
    if (ruleIssue) return { success: false, error: ruleIssue.message }
    if (!listingTypeAllowed(await sellerEntityType(supabase, user.id), after.listing_type)) {
      return { success: false, error: COMPANY_ONLY_MESSAGE }
    }
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
    .select("seller_id, slug, unit")
    .eq("id", listingId)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }
  const concreteRange = priceRange("concrete", existing.unit)
  for (const row of parsed.data) {
    for (const [cons, price] of Object.entries(row.consistency_prices ?? {})) {
      const check = checkPrice(Number(price), concreteRange)
      if (check.status === "block") {
        return { success: false, error: `${row.class_code} ${cons}: ${priceMessage(check, existing.unit)}` }
      }
    }
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
    .select("seller_id, slug, unit, price")
    .eq("id", listingId)
    .maybeSingle()
  if (fetchErr || !existing) return { success: false, error: "Anunt inexistent." }
  if (existing.seller_id !== user.id) {
    return { success: false, error: "Nu esti proprietarul acestui anunt." }
  }
  // Unit comes from the DB row, not the client, so the rule can't be bypassed.
  const issue = materialListingIssue(existing.unit, parsed.data)
  if (issue) return { success: false, error: issue }
  if (!materialAllowed(await sellerEntityType(supabase, user.id), parsed.data.spec.material_code)) {
    return { success: false, error: COMPANY_ONLY_MESSAGE }
  }
  const priceCheck = checkPrice(
    Number(existing.price),
    priceRange("materials", existing.unit, parsed.data.spec.category_code, parsed.data.spec.material_code),
  )
  if (priceCheck.status === "block") return { success: false, error: priceMessage(priceCheck, existing.unit)! }

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

  // Collect image files before the row (and its image rows) cascade away.
  // Files live under {seller_id}/{listing_id}/; listing that folder also
  // catches files whose DB row was lost earlier (orphans).
  const folder = `${user.id}/${id}`
  const { data: imageRows } = await supabase
    .from("marketplace_listing_images")
    .select("storage_path")
    .eq("listing_id", id)
  const { data: folderFiles } = await supabase.storage
    .from("listing-images")
    .list(folder, { limit: 1000 })
  const paths = new Set<string>([
    ...(imageRows ?? []).map((r) => r.storage_path),
    ...(folderFiles ?? []).map((f) => `${folder}/${f.name}`),
  ])

  // Soft delete: the row stays for order history (order_lines keep listing_id),
  // the slug is free again, and RLS hides it from everyone but the owner/admin.
  const { error } = await supabase
    .from("marketplace_listings")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  // Listing is gone; a storage failure must not undo that. Log and move on.
  if (paths.size > 0) {
    const { error: storageError } = await supabase.storage
      .from("listing-images")
      .remove([...paths])
    if (storageError) {
      console.warn(`[listings] image cleanup failed for listing ${id}:`, storageError.message)
    }
  }

  revalidatePath("/account")
  revalidatePath("/marketplace")
  return { success: true }
}
