"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
  businessProfileSchema,
  type BusinessProfileInput,
  preferencesSchema,
  type PreferencesInput,
  notificationPrefsSchema,
  type NotificationPrefsInput,
  sellerPoliciesSchema,
  type SellerPoliciesInput,
  supplierSettingsSchema,
  type SupplierSettingsInput,
} from "@/lib/validation"

type ActionResult = { success: true } | { success: false; error: string }

/** Narrow updates to the generated `profiles` row type for Supabase `.update()`. */
type ProfilesUpdate = Database["public"]["Tables"]["profiles"]["Update"]

function firstIssue(issues: { message: string }[] | undefined): string {
  return issues?.[0]?.message ?? "Date invalide"
}

// ============================================================================
// Profile base (display_name, phone, avatar_path)
// ============================================================================
const ALLOWED_PROFILE_FIELDS = ["display_name", "phone", "avatar_path"] as const

function pickAllowed<T extends Record<string, unknown>>(
  input: T,
  allow: readonly string[],
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const key of allow) {
    if (key in input) out[key] = input[key]
  }
  return out as Partial<T>
}

export async function updateMyProfileAction(
  raw: ProfileUpdateInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = profileUpdateSchema.safeParse(pickAllowed(raw, ALLOWED_PROFILE_FIELDS))
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

// ============================================================================
// Business profile (entity_type, CIF, RegCom, VAT, fiscal address, bio, website)
// ============================================================================
const ALLOWED_BUSINESS_FIELDS = [
  "entity_type",
  "company_name",
  "tax_id",
  "reg_com",
  "vat_id",
  "fiscal_address",
  "website_url",
  "bio",
] as const

interface BusinessProfileRaw extends BusinessProfileInput {
  bio?: string | null
}

export async function updateBusinessProfileAction(
  raw: BusinessProfileRaw,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = businessProfileSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const payload = pickAllowed<Record<string, unknown>>(
    { ...parsed.data, bio: raw.bio ?? null },
    ALLOWED_BUSINESS_FIELDS,
  )
  // pickAllowed returns Partial<Record<string, unknown>>; cast after Zod + allowlist for typed `.update()`.
  const { error } = await supabase
    .from("profiles")
    .update(payload as ProfilesUpdate)
    .eq("id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

// ============================================================================
// Preferences / notification prefs / seller policies / supplier settings
// ============================================================================
export async function updatePreferencesAction(
  raw: PreferencesInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = preferencesSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: parsed.data })
    .eq("id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function updateNotificationPrefsAction(
  raw: NotificationPrefsInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = notificationPrefsSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { error } = await supabase.from("user_notification_preferences").upsert(
    {
      user_id: user.id,
      channels: parsed.data.channels,
      topics: parsed.data.topics,
      quiet_hours: parsed.data.quiet_hours ?? null,
    },
    { onConflict: "user_id" },
  )
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function updateSellerPoliciesAction(
  raw: SellerPoliciesInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = sellerPoliciesSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { error } = await supabase
    .from("profiles")
    .update({ seller_policies: parsed.data })
    .eq("id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function updateSupplierSettingsAction(
  raw: SupplierSettingsInput,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = supplierSettingsSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { error } = await supabase
    .from("profiles")
    .update({ supplier_settings: parsed.data })
    .eq("id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

// ============================================================================
// Seller activation: flips seller_activated_at = now() for the caller.
// Does NOT change role; seller features unlock via seller_activated_at check.
// ============================================================================
export async function activateSellerAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase
    .from("profiles")
    .update({ seller_activated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("seller_activated_at", null)

  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

// ============================================================================
// Avatar upload: we return a signed upload URL so the client can PUT the file
// directly to Storage. Server action keeps the bucket/path derivation on the
// trust boundary; storage RLS still enforces (storage.foldername(name))[1] =
// auth.uid()::text so a malicious client cannot target someone else's prefix.
// ============================================================================
export async function uploadAvatarAction(input: {
  mimeType: string
  extension: string
}): Promise<
  | { success: true; bucket: string; path: string; token: string }
  | { success: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"])
  if (!allowed.has(input.mimeType)) {
    return { success: false, error: "Format invalid. Acceptam JPG, PNG sau WebP." }
  }
  const ext = input.extension.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5) || "jpg"
  const path = `${user.id}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { success: false, error: error?.message ?? "Nu am putut pregati upload-ul." }
  }
  return { success: true, bucket: "avatars", path, token: data.token }
}
