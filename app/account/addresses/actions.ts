"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { addressUpsertSchema, type AddressUpsertInput } from "@/lib/validation"

type ActionResult = { success: true } | { success: false; error: string }

function firstIssue(issues: { message: string }[] | undefined): string {
  return issues?.[0]?.message ?? "Date invalide"
}

const ALLOWED_ADDRESS_FIELDS = [
  "label",
  "recipient",
  "line1",
  "line2",
  "city",
  "county",
  "postal_code",
  "country",
  "phone",
  "notes",
  "is_default_billing",
  "is_default_shipping",
  "pickup_lat",
  "pickup_lng",
] as const

function pickAllowed<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const k of ALLOWED_ADDRESS_FIELDS) {
    if (k in input) out[k] = input[k]
  }
  return out as Partial<T>
}

async function clearDefaults(
  userId: string,
  kind: "billing" | "shipping",
  exceptId?: number,
): Promise<string | null> {
  const supabase = await createClient()
  const col = kind === "billing" ? "is_default_billing" : "is_default_shipping"
  let q = supabase
    .from("user_addresses")
    .update({ [col]: false })
    .eq("user_id", userId)
    .eq(col, true)
  if (exceptId) q = q.neq("id", exceptId)
  const { error } = await q
  return error?.message ?? null
}

export async function createAddressAction(
  raw: AddressUpsertInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = addressUpsertSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  // If the new address asks to become default, clear other defaults first so
  // the partial unique index never collides.
  if (parsed.data.is_default_billing) {
    const err = await clearDefaults(user.id, "billing")
    if (err) return { success: false, error: err }
  }
  if (parsed.data.is_default_shipping) {
    const err = await clearDefaults(user.id, "shipping")
    if (err) return { success: false, error: err }
  }

  const payload = { ...pickAllowed(parsed.data), user_id: user.id }
  const { error } = await supabase
    .from("user_addresses")
    .insert(payload as never)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function updateAddressAction(
  id: number,
  raw: AddressUpsertInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = addressUpsertSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  if (parsed.data.is_default_billing) {
    const err = await clearDefaults(user.id, "billing", id)
    if (err) return { success: false, error: err }
  }
  if (parsed.data.is_default_shipping) {
    const err = await clearDefaults(user.id, "shipping", id)
    if (err) return { success: false, error: err }
  }

  const payload = pickAllowed(parsed.data)
  const { error } = await supabase
    .from("user_addresses")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function deleteAddressAction(id: number): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase
    .from("user_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function setDefaultAddressAction(
  id: number,
  kind: "billing" | "shipping",
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  // Verify ownership up-front so we never clear defaults just to fail later.
  const { data: target, error: findErr } = await supabase
    .from("user_addresses")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (findErr) return { success: false, error: findErr.message }
  if (!target) return { success: false, error: "Adresa nu a fost gasita." }

  const clearErr = await clearDefaults(user.id, kind, id)
  if (clearErr) return { success: false, error: clearErr }

  const col = kind === "billing" ? "is_default_billing" : "is_default_shipping"
  const { error } = await supabase
    .from("user_addresses")
    .update({ [col]: true })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}
