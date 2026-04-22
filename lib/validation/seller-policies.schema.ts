import { z } from "zod"

// Seller self-declared policies. Kept as free-text + a single numeric lever
// (return_window_days) for this iteration; richer rules land after Stripe is
// configured.
export const sellerPoliciesSchema = z.object({
  shipping_text: z.string().trim().max(2000).nullable().optional(),
  returns_text: z.string().trim().max(2000).nullable().optional(),
  cancellation_text: z.string().trim().max(2000).nullable().optional(),
  return_window_days: z.number().int().min(0).max(60).default(14),
})

export type SellerPoliciesInput = z.infer<typeof sellerPoliciesSchema>
