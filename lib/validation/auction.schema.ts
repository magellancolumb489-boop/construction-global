import { z } from "zod"
import { slugSchema } from "./listing.schema"

export const auctionCurrencySchema = z.enum(["RON", "EUR", "ron", "eur"])

// Status the seller is allowed to choose on create / save. 'active', 'ended',
// 'cancelled' are NEVER accepted from the client -- they are controlled by
// place_bid / close_auction / time-based transitions.
export const auctionSellerStatusSchema = z.enum(["draft", "scheduled"])

// Fields the seller may set on create. current_price, current_winner_id,
// bid_count are all server/RPC-managed and never accepted from the client.
const baseAuctionCreateFields = {
  title: z.string().trim().min(3).max(200),
  slug: slugSchema,
  description: z.string().trim().max(5000).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  starting_price: z.number().nonnegative(),
  reserve_price: z.number().nonnegative().nullable().optional(),
  bid_increment: z.number().positive().default(1),
  currency: auctionCurrencySchema.default("ron"),
  starts_at: z.string().datetime({ offset: true }).or(z.string().datetime()),
  ends_at: z.string().datetime({ offset: true }).or(z.string().datetime()),
  status: auctionSellerStatusSchema.optional(),
}

export const auctionCreateSchema = z
  .object(baseAuctionCreateFields)
  .superRefine((val, ctx) => {
    if (new Date(val.ends_at).getTime() <= new Date(val.starts_at).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "Data de sfarsit trebuie sa fie dupa data de inceput.",
      })
    }
    if (val.reserve_price != null && val.reserve_price < val.starting_price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reserve_price"],
        message: "Pretul de rezerva nu poate fi sub pretul de pornire.",
      })
    }
  })

// Update schema: only fields we allow while status is draft|scheduled and
// bid_count = 0 (enforced further by the RLS policy).
export const auctionUpdateSchema = z
  .object(baseAuctionCreateFields)
  .partial()
  .superRefine((val, ctx) => {
    if (
      val.starts_at &&
      val.ends_at &&
      new Date(val.ends_at).getTime() <= new Date(val.starts_at).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ends_at"],
        message: "Data de sfarsit trebuie sa fie dupa data de inceput.",
      })
    }
  })

export type AuctionCreateInput = z.infer<typeof auctionCreateSchema>
export type AuctionUpdateInput = z.infer<typeof auctionUpdateSchema>

// Bid input used by placeAuctionBid client -> validated before RPC call
export const bidInputSchema = z.object({
  lot_id: z.number().int().positive(),
  amount: z.number().positive("Suma trebuie sa fie pozitiva"),
})

export type BidInput = z.infer<typeof bidInputSchema>
