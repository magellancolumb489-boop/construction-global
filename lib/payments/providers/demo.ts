import "server-only"

import type { PaymentProvider } from "../types"

/**
 * Demo provider: no money moves. The payer confirms on our own page, which
 * calls public.demo_complete_payment (allowed only while
 * platform_settings.payments_mode = 'demo').
 */
export const demoProvider: PaymentProvider = {
  id: "demo",
  isConfigured: () => true,
  async createCheckout(intent, urls) {
    const url = new URL(urls.successUrl)
    url.searchParams.set("demo_intent", intent.id)
    return { providerRef: `demo_${intent.id}`, checkoutUrl: url.toString() }
  },
  async parseWebhook() {
    // Demo payments never arrive via webhook.
    return null
  },
}
