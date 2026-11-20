"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export async function cancelSubscriptionAction(
  subscriptionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(subscriptionId).success) return { ok: false, error: "Abonament invalid." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_subscription", { p_subscription_id: subscriptionId })
  if (error) return { ok: false, error: "Abonamentul nu a putut fi anulat." }
  revalidatePath("/account")
  return { ok: true }
}
