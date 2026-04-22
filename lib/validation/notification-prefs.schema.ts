import { z } from "zod"

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format ora: HH:MM")

export const notificationChannelsSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  push: z.boolean().default(false),
})

export const notificationTopicsSchema = z.object({
  orders: z.boolean().default(true),
  bids: z.boolean().default(true),
  messages: z.boolean().default(true),
  marketing: z.boolean().default(false),
  security: z.boolean().default(true),
})

export const quietHoursSchema = z
  .object({
    enabled: z.boolean().default(false),
    start: hhmmSchema.default("22:00"),
    end: hhmmSchema.default("07:00"),
  })
  .nullable()
  .optional()

export const notificationPrefsSchema = z.object({
  channels: notificationChannelsSchema,
  topics: notificationTopicsSchema,
  quiet_hours: quietHoursSchema,
})

export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>
