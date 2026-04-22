import {
  createReviewAction,
  updateReviewAction,
  deleteReviewAction,
} from "@/app/account/reviews/actions"
import type {
  ReviewCreateInput,
  ReviewUpdateInput,
} from "@/lib/validation"

type Result = { success: true } | { success: false; error: string }

export async function createReview(input: ReviewCreateInput): Promise<Result> {
  return createReviewAction(input)
}

export async function updateReview(input: ReviewUpdateInput): Promise<Result> {
  return updateReviewAction(input)
}

export async function deleteReview(id: number): Promise<Result> {
  return deleteReviewAction(id)
}
