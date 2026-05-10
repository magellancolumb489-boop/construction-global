import { z } from "zod"

const targetRefinement = z
  .object({
    listing_id: z.number().int().positive().nullable().optional(),
    order_id: z.number().int().positive().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const count = [val.listing_id, val.order_id].filter((v) => v != null).length
    if (count === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["listing_id"],
        message: "Specificati anuntul sau comanda.",
      })
    }
    if (count > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["listing_id"],
        message: "Puteti asocia o singura sursa.",
      })
    }
  })

export const reviewCreateSchema = z
  .object({
    target_user_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(200).nullable().optional(),
    body: z
      .string()
      .trim()
      .min(10, "Descrierea trebuie sa aiba cel putin 10 caractere")
      .max(2000),
  })
  .and(targetRefinement)

export const reviewUpdateSchema = z.object({
  id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(10).max(2000).optional(),
})

export const reviewDeleteSchema = z.object({
  id: z.number().int().positive(),
})

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>
export type ReviewDeleteInput = z.infer<typeof reviewDeleteSchema>
