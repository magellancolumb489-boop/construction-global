import { z } from "zod"

// Small, forward-compatible preference bag. Stored in profiles.preferences
// jsonb so new keys can land without migrations.
export const preferencesSchema = z.object({
  language: z.enum(["ro", "en"]).default("ro"),
  currency: z.enum(["RON", "EUR"]).default("RON"),
  timezone: z.string().trim().min(1).max(64).default("Europe/Bucharest"),
  measurement_system: z.enum(["metric", "imperial"]).default("metric"),
})

export type PreferencesInput = z.infer<typeof preferencesSchema>
