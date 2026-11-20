import "server-only"

import { demoProvider } from "./providers/demo"
import { pendingProvider } from "./providers/pending"
import { PAYMENT_PROVIDER_IDS, type PaymentProvider, type PaymentProviderId } from "./types"

/**
 * Server-only provider selection. The DB decides demo vs live
 * (platform_settings.payments_mode); this env var only names WHICH live
 * provider to use. A NEXT_PUBLIC flag is never the gate.
 *
 *   PAYMENTS_PROVIDER=netopia          # demo | stripe | netopia | euplatesc | revolut
 *   PAYMENTS_WEBHOOK_DB_SECRET=...      # same value as private.set_secret('payments_webhook', ...)
 *   APP_BASE_URL=https://...            # for success / cancel / webhook URLs
 */
const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  demo: demoProvider,
  stripe: pendingProvider("stripe", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]),
  netopia: pendingProvider("netopia", ["NETOPIA_API_KEY", "NETOPIA_POS_SIGNATURE", "NETOPIA_PUBLIC_KEY"]),
  euplatesc: pendingProvider("euplatesc", ["EUPLATESC_MERCHANT_ID", "EUPLATESC_KEY"]),
  revolut: pendingProvider("revolut", ["REVOLUT_API_KEY", "REVOLUT_WEBHOOK_SECRET"]),
  other: pendingProvider("other", []),
}

export function isProviderId(v: string): v is PaymentProviderId {
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(v)
}

export function getProvider(id: PaymentProviderId): PaymentProvider {
  return PROVIDERS[id]
}

/** Live provider named in env; defaults to demo when unset or unknown. */
export function getConfiguredProviderId(): PaymentProviderId {
  const raw = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase() ?? ""
  return isProviderId(raw) ? raw : "demo"
}

export function appBaseUrl(): string {
  const raw = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
  return raw.replace(/\/+$/, "")
}
