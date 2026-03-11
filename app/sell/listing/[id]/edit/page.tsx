import { notFound } from "next/navigation"
import { getListingForEdit } from "@/lib/api/listings"
import { getCategories } from "@/lib/api/categories"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ListingForm } from "../../new/listing-form"

export const metadata = {
  title: "Editeaza Anunt - ConstructionHub Romania",
}

// Server component -- auth guard is handled by app/sell/layout.tsx
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = Number(rawId)

  if (isNaN(id)) notFound()

  const [listing, categories] = await Promise.all([
    getListingForEdit(id),
    getCategories(),
  ])

  // getListingForEdit returns null if not found or not owned by current user
  if (!listing) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Magazin", href: "/marketplace" },
          { label: listing.title, href: `/products/${listing.slug}-${listing.id}` },
          { label: "Editeaza" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Editeaza Anuntul</h1>
      <ListingForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        editMode
        listing={listing}
        existingImages={listing.marketplace_listing_images.map((img) => ({
          id: img.id,
          storage_path: img.storage_path,
          display_order: img.display_order,
        }))}
      />
    </div>
  )
}
