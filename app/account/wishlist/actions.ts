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

  const where =
    parsed.data.kind === "listing"
      ? { listing_id: parsed.data.listing_id, auction_id: null as number | null }
      : { auction_id: parsed.data.auction_id, listing_id: null as number | null }

  // Check existence first so we can report a stable "added" | "removed" state
  // to the caller for optimistic UI.
  let existingQuery = supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", user.id)
  if (parsed.data.kind === "listing") {
    existingQuery = existingQuery.eq("listing_id", parsed.data.listing_id)
  } else {
    existingQuery = existingQuery.eq("auction_id", parsed.data.auction_id)
  }
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
    listing_id: where.listing_id ?? null,
    auction_id: where.auction_id ?? null,
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
