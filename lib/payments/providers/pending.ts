import "server-only"

import {
  PaymentProviderNotConfiguredError,
  type PaymentProvider,
  type PaymentProviderId,
} from "../types"

/**
 * Placeholder for a provider that is chosen but not implemented yet
 * (stripe, netopia, euplatesc, revolut). It fails loudly instead of
 * pretending to charge. To implement one, copy this file to
 * providers/<id>.ts and fill in:
 *   createCheckout  -> call the provider API with intent.amount_cents /
 *                      intent.currency, put intent.id in the provider's
 *                      metadata / order reference, return its session id + URL.
 *   parseWebhook    -> verify the signature with the provider secret, map the
 *                      event to ProviderEvent (status, amount, our intent id).
 * Then register it in registry.ts.
 */
export function pendingProvider(id: PaymentProviderId, envKeys: string[]): PaymentProvider {
  return {
    id,
    isConfigured: () => false,
    async createCheckout() {
      throw new PaymentProviderNotConfiguredError(id)
    },
    async parseWebhook() {
      throw new PaymentProviderNotConfiguredError(id)
    },
    // Kept for operators: which env vars the real implementation will read.
    ...{ envKeys },
  } as PaymentProvider
}
