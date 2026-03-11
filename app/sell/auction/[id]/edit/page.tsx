import { notFound } from "next/navigation"
import { getAuctionForEdit } from "@/lib/api/auctions"
import { getCategories } from "@/lib/api/categories"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AuctionForm } from "../../new/auction-form"

export const metadata = {
  title: "Editeaza Licitatie - ConstructionHub Romania",
}

// Server component -- auth guard is handled by app/sell/layout.tsx
export default async function EditAuctionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
  const id = Number(rawId)

  if (isNaN(id)) notFound()

  const [auction, categories] = await Promise.all([
    getAuctionForEdit(id),
    getCategories(),
  ])

  // getAuctionForEdit returns null if not found or not owned by current user
  if (!auction) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Licitatii", href: "/auctions" },
          { label: auction.title, href: `/auctions/${auction.slug}-${auction.id}` },
          { label: "Editeaza" },
        ]}
      />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Editeaza Licitatia</h1>
      <AuctionForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        editMode
        auction={auction}
        existingImages={auction.auction_images.map((img) => ({
          id: img.id,
          storage_path: img.storage_path,
          sort_order: img.sort_order,
          is_cover: img.is_cover,
        }))}
      />
    </div>
  )
}
