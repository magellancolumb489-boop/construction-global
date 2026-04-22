import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import {
  createListingAction,
  updateListingAction,
  deleteListingAction,
} from "@/app/sell/listing/actions"

export type Listing = Tables<"marketplace_listings">
export type ListingInsert = Omit<TablesInsert<"marketplace_listings">, "id" | "created_at" | "updated_at">
export type ListingUpdate = TablesUpdate<"marketplace_listings">

// createListing: thin wrapper around the server action. seller_id is injected
// server-side from auth.uid() regardless of what the caller passes.
export async function createListing(
  listing: ListingInsert
): Promise<{ success: boolean; data?: Listing; error?: string }> {
  // Drop seller_id if provided; server action forces it from the session
  const { seller_id: _ignored, ...payload } = listing as ListingInsert & { seller_id?: string }
  void _ignored
  const res = await createListingAction(payload as unknown as Parameters<typeof createListingAction>[0])
  if (res.success) return { success: true, data: res.data as Listing }
  return { success: false, error: res.error }
}

export async function updateListing(
  id: number,
  updates: ListingUpdate
): Promise<{ success: boolean; error?: string }> {
  const res = await updateListingAction(
    id,
    updates as unknown as Parameters<typeof updateListingAction>[1]
  )
  return res.success ? { success: true } : { success: false, error: res.error }
}

export async function deleteListing(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const res = await deleteListingAction(id)
  return res.success ? { success: true } : { success: false, error: res.error }
}

// Image upload stays browser-side: storage RLS enforces the owner folder
// prefix, and the DB row insert is gated by marketplace_listing_images RLS
// (owner of parent listing).
export async function uploadListingImage(
  listingId: number,
  file: File,
  displayOrder: number = 0
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const storagePath = `${user.id}/${listingId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(storagePath, file)

  if (uploadError) return { success: false, error: uploadError.message }

  const { error: insertError } = await supabase
    .from("marketplace_listing_images")
    .insert({
      listing_id: listingId,
      storage_path: storagePath,
      display_order: displayOrder,
    })

  if (insertError) return { success: false, error: insertError.message }

  return { success: true, path: storagePath }
}

export async function deleteListingImage(
  imageId: number,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error: storageError } = await supabase.storage
    .from("listing-images")
    .remove([storagePath])

  if (storageError) return { success: false, error: storageError.message }

  const { error: dbError } = await supabase
    .from("marketplace_listing_images")
    .delete()
    .eq("id", imageId)

  if (dbError) return { success: false, error: dbError.message }
  return { success: true }
}

// Public read: slug availability check can stay client-side
export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from("marketplace_listings")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)

  return (count ?? 0) === 0
}

export function getImagePublicUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage
    .from("listing-images")
    .getPublicUrl(storagePath)
  return data.publicUrl
}
