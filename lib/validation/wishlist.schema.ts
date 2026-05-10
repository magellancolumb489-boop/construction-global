import { z } from "zod"

// Marketplace-only wishlist: listing targets only (auction stand-down).
export const wishlistTargetSchema = z.object({
  kind: z.literal("listing"),
  listing_id: z.number().int().positive(),
})

export type WishlistTargetInput = z.infer<typeof wishlistTargetSchema>
