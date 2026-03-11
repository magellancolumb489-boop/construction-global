import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"

export type Listing = Tables<"marketplace_listings">
export type ListingInsert = Omit<TablesInsert<"marketplace_listings">, "id" | "created_at" | "updated_at">
export type ListingUpdate = TablesUpdate<"marketplace_listings">

// Client-side: create a new listing
export async function createListing(
  listing: ListingInsert
): Promise<{ success: boolean; data?: Listing; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert(listing)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

// Client-side: update an existing listing (owner only via RLS)
export async function updateListing(
  id: number,
  updates: ListingUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from("marketplace_listings")
    .update(updates)
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Client-side: delete a listing (cascade deletes image rows too)
export async function deleteListing(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from("marketplace_listings")
    .delete()
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Client-side: upload an image to Storage and insert a reference row
export async function uploadListingImage(
  listingId: number,
  file: File,
  displayOrder: number = 0
): Promise<{ success: boolean; path?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

// Client-side: delete an image from Storage and its DB row
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

// Client-side: check if a slug is available
export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient()
  const { count } = await supabase
    .from("marketplace_listings")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)

  return (count ?? 0) === 0
}

// Helper: get the public URL for a stored image path
export function getImagePublicUrl(storagePath: string): string {
  const supabase = createClient()
  const { data } = supabase.storage
    .from("listing-images")
    .getPublicUrl(storagePath)
  return data.publicUrl
}
