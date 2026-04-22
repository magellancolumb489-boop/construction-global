import {
  toggleWishlistAction,
  clearWishlistAction,
} from "@/app/account/wishlist/actions"
import type { WishlistTargetInput } from "@/lib/validation"

type Result =
  | { success: true; state: "added" | "removed" }
  | { success: false; error: string }

export async function toggleWishlist(target: WishlistTargetInput): Promise<Result> {
  return toggleWishlistAction(target)
}

export async function clearWishlist(): Promise<{ success: boolean; error?: string }> {
  return clearWishlistAction()
}
