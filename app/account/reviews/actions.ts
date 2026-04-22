"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  reviewCreateSchema,
  reviewUpdateSchema,
  type ReviewCreateInput,
  type ReviewUpdateInput,
} from "@/lib/validation"

type ActionResult = { success: true } | { success: false; error: string }

function firstIssue(issues: { message: string }[] | undefined): string {
  return issues?.[0]?.message ?? "Date invalide"
}

export async function createReviewAction(raw: ReviewCreateInput): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = reviewCreateSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  if (parsed.data.target_user_id === user.id) {
    return { success: false, error: "Nu va puteti lasa recenzie singur." }
  }

  const { error } = await supabase.from("reviews").insert({
    reviewer_id: user.id,
    target_user_id: parsed.data.target_user_id,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    body: parsed.data.body,
    listing_id: parsed.data.listing_id ?? null,
    auction_id: parsed.data.auction_id ?? null,
    order_id: parsed.data.order_id ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function updateReviewAction(raw: ReviewUpdateInput): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = reviewUpdateSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { id, ...updates } = parsed.data
  const payload: Record<string, unknown> = {}
  if (updates.rating != null) payload.rating = updates.rating
  if (updates.title !== undefined) payload.title = updates.title
  if (updates.body != null) payload.body = updates.body

  const { error } = await supabase
    .from("reviews")
    .update(payload)
    .eq("id", id)
    .eq("reviewer_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}

export async function deleteReviewAction(id: number): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("reviewer_id", user.id)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}
