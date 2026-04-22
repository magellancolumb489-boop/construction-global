import { z } from "zod"

// Discriminated union: a wishlist row targets exactly one of a listing / auction.
export const wishlistTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("listing"),
    listing_id: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("auction"),
    auction_id: z.number().int().positive(),
  }),
])

export type WishlistTargetInput = z.infer<typeof wishlistTargetSchema>
