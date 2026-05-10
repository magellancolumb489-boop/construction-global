"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { wishlistTargetSchema, type WishlistTargetInput } from "@/lib/validation"

type ToggleResult =
  | { success: true; state: "added" | "removed" }
  | { success: false; error: string }

export async function toggleWishlistAction(
  raw: WishlistTargetInput,
): Promise<ToggleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = wishlistTargetSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Date invalide" }
  }

  const listingId = parsed.data.listing_id

  let existingQuery = supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
  const { data: existing, error: findErr } = await existingQuery.maybeSingle()
  if (findErr) return { success: false, error: findErr.message }

  if (existing) {
    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id)
    if (error) return { success: false, error: error.message }
    revalidatePath("/account")
    return { success: true, state: "removed" }
  }

  const { error } = await supabase.from("wishlist_items").insert({
    user_id: user.id,
    listing_id: listingId,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true, state: "added" }
}

export async function clearWishlistAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase.from("wishlist_items").delete().eq("user_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}
