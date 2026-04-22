import { z } from "zod"

export const threadContextSchema = z.enum(["order", "listing", "auction"])

export const threadOpenSchema = z.object({
  seller_id: z.string().uuid(),
  context_type: threadContextSchema.nullable().optional(),
  context_id: z.number().int().positive().nullable().optional(),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z
    .string()
    .trim()
    .min(1, "Mesajul nu poate fi gol")
    .max(4000, "Mesajul poate avea maxim 4000 de caractere"),
})

export const messageSendSchema = z.object({
  thread_id: z.number().int().positive(),
  body: z.string().trim().min(1).max(4000),
})

export const threadMarkReadSchema = z.object({
  thread_id: z.number().int().positive(),
})

export type ThreadOpenInput = z.infer<typeof threadOpenSchema>
export type MessageSendInput = z.infer<typeof messageSendSchema>
export type ThreadMarkReadInput = z.infer<typeof threadMarkReadSchema>
