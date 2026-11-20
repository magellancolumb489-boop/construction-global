"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { PLATFORM_SETTINGS_TAG } from "@/lib/api/platform-settings"
import { isValidCui, isValidIban, normalizeCui, normalizeIban } from "@/lib/validation/ro-fiscal"
import type { Json } from "@/types/supabase"

type Result = { ok: true; data?: unknown } | { ok: false; error: string }

// Percent inputs from the form (10 = 10%) -> DB fractions (0.10).
const settingsSchema = z.object({
  commissionPct: z.number().min(0).max(50),
  commissionOnTransport: z.boolean(),
  vatPct: z.number().min(0).max(30),
  paymentsMode: z.enum(["demo", "live"]),
  listingFeesEnabled: z.boolean(),
  listingFeeRon: z.number().min(0).max(100_000),
  listingFeeDays: z.number().int().min(1).max(365),
  subscriptionsEnabled: z.boolean(),
  transportQuoteTtlHours: z.number().int().min(1).max(720),
  unpaidOrderTtlHours: z.number().int().min(1).max(720),
  proformaDueDays: z.number().int().min(0).max(90),
  identity: z.object({
    legal_name: z.string().trim().min(2).max(200),
    cui: z.string().trim().transform(normalizeCui).refine(isValidCui, "CUI platformă invalid."),
    reg_com: z.string().trim().max(40).optional().or(z.literal("")),
    vat_id: z.string().trim().max(20).optional().or(z.literal("")),
    address: z.string().trim().min(5).max(300),
    iban: z.string().trim().transform(normalizeIban).refine(isValidIban, "IBAN platformă invalid."),
    bank: z.string().trim().min(2).max(120),
    email: z.string().trim().email().optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  }),
})

export type PlatformSettingsInput = z.input<typeof settingsSchema>

/** RLS policy platform_settings_admin_update is the real gate; non-admins get 0 rows. */
export async function updatePlatformSettingsAction(raw: PlatformSettingsInput): Promise<Result> {
  const parsed = settingsSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." }
  const v = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("platform_settings")
    .update({
      commission_rate: v.commissionPct / 100,
      commission_on_transport: v.commissionOnTransport,
      vat_rate: v.vatPct / 100,
      payments_mode: v.paymentsMode,
      listing_fees_enabled: v.listingFeesEnabled,
      listing_fee_cents: Math.round(v.listingFeeRon * 100),
      listing_fee_days: v.listingFeeDays,
      subscriptions_enabled: v.subscriptionsEnabled,
      transport_quote_ttl_hours: v.transportQuoteTtlHours,
      unpaid_order_ttl_hours: v.unpaidOrderTtlHours,
      proforma_due_days: v.proformaDueDays,
      platform_identity: v.identity as Json,
    })
    .eq("id", 1)
    .select("id")
  if (error) return { ok: false, error: error.message }
  if (!data || data.length === 0) return { ok: false, error: "Doar administratorii pot modifica setările." }
  updateTag(PLATFORM_SETTINGS_TAG)
  revalidatePath("/", "layout")
  return { ok: true }
}

const planSchema = z.object({
  code: z.string().regex(/^[a-z0-9_]{2,40}$/, "Cod: litere mici, cifre, _"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  priceRon: z.number().min(0).max(100_000),
  intervalMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  maxActiveListings: z.number().int().positive().nullable(),
  includesListingFees: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
})

export type PlanInput = z.input<typeof planSchema>

export async function upsertPlanAction(raw: PlanInput): Promise<Result> {
  const parsed = planSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." }
  const p = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.from("subscription_plans").upsert({
    code: p.code,
    name: p.name,
    description: p.description || null,
    price_cents: Math.round(p.priceRon * 100),
    interval_months: p.intervalMonths,
    max_active_listings: p.maxActiveListings,
    includes_listing_fees: p.includesListingFees,
    is_active: p.isActive,
    sort_order: p.sortOrder,
  })
  if (error) return { ok: false, error: /row-level security/i.test(error.message) ? "Doar administratorii." : error.message }
  updateTag(PLATFORM_SETTINGS_TAG)
  revalidatePath("/admin/settings")
  return { ok: true }
}

/** Expire quotes, cancel unpaid live orders, close subscriptions, unpublish unpaid listings. */
export async function runMaintenanceAction(): Promise<Result> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("run_platform_maintenance")
  if (error) return { ok: false, error: /admin only/i.test(error.message) ? "Doar administratorii." : error.message }
  revalidatePath("/admin/settings")
  return { ok: true, data }
}
