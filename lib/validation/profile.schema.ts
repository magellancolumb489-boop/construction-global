import { z } from "zod"

// Profile updates the user is allowed to perform on themselves. `role` and
// `id` are never accepted from the client; only set_user_role() may touch
// role, and id is immutable via a DB trigger.
export const profileUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Numele trebuie sa aiba cel putin 2 caractere")
    .max(80)
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(32)
    .regex(/^[+0-9\s().-]+$/, "Numar de telefon invalid")
    .nullable()
    .optional(),
  avatar_path: z.string().trim().max(500).nullable().optional(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
