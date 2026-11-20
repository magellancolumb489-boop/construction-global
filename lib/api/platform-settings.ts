import "server-only"

import { unstable_cache } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { DEFAULT_PRICING, type PlatformPricing } from "@/lib/pricing/commission"

export const PLATFORM_SETTINGS_TAG = "platform-settings"

/**
 * Public pricing knobs (commission, VAT). Same for every visitor, so it is
 * read with a session-less client and cached for 60 s; the admin settings
 * action revalidates the tag on change.
 */
export interface SubscriptionPlan {
  code: string
  name: string
  description: string | null
  priceCents: number
  currency: string
  intervalMonths: number
  maxActiveListings: number | null
  includesListingFees: boolean
}

export interface PlatformCommerce {
  listingFeesEnabled: boolean
  listingFeeCents: number
  listingFeeDays: number
  subscriptionsEnabled: boolean
  commissionRate: number
  plans: SubscriptionPlan[]
}

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Post fees + subscription plans shown to sellers. Public data, cached 60 s. */
export const getPlatformCommerce = unstable_cache(
  async (): Promise<PlatformCommerce> => {
    const fallback: PlatformCommerce = {
      listingFeesEnabled: false,
      listingFeeCents: 0,
      listingFeeDays: 30,
      subscriptionsEnabled: false,
      commissionRate: DEFAULT_PRICING.commissionRate,
      plans: [],
    }
    const supabase = anonClient()
    if (!supabase) return fallback
    const [settings, plans] = await Promise.all([
      supabase
        .from("platform_settings")
        .select("listing_fees_enabled, listing_fee_cents, listing_fee_days, subscriptions_enabled, commission_rate")
        .eq("id", 1)
        .maybeSingle(),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    ])
    if (settings.error || !settings.data) return fallback
    return {
      listingFeesEnabled: settings.data.listing_fees_enabled,
      listingFeeCents: Number(settings.data.listing_fee_cents),
      listingFeeDays: settings.data.listing_fee_days,
      subscriptionsEnabled: settings.data.subscriptions_enabled,
      commissionRate: Number(settings.data.commission_rate),
      plans: (plans.data ?? []).map((p) => ({
        code: p.code,
        name: p.name,
        description: p.description,
        priceCents: Number(p.price_cents),
        currency: p.currency,
        intervalMonths: p.interval_months,
        maxActiveListings: p.max_active_listings,
        includesListingFees: p.includes_listing_fees,
      })),
    }
  },
  ["platform-commerce"],
  { revalidate: 60, tags: [PLATFORM_SETTINGS_TAG] },
)

export const getPlatformPricing = unstable_cache(
  async (): Promise<PlatformPricing> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return DEFAULT_PRICING
    const supabase = createSupabaseClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from("platform_settings")
      .select("commission_rate, commission_on_transport, vat_rate")
      .eq("id", 1)
      .maybeSingle()
    if (error || !data) {
      console.error("[platform-settings] read failed, using defaults:", error?.message)
      return DEFAULT_PRICING
    }
    return {
      commissionRate: Number(data.commission_rate),
      commissionOnTransport: data.commission_on_transport,
      vatRate: Number(data.vat_rate),
    }
  },
  ["platform-pricing"],
  { revalidate: 60, tags: [PLATFORM_SETTINGS_TAG] },
)
