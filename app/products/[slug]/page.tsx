import { notFound } from "next/navigation"
import { getProductDetailFromListing, getListingOwnerInfo, getProductListItems } from "@/lib/api/listings"
import { createClient } from "@/lib/supabase/server"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ProductDetailClient } from "./product-detail-client"

function extractSlug(param: string): string {
  const lastDash = param.lastIndexOf("-")
  if (lastDash === -1) return param
  return param.substring(0, lastDash)
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = extractSlug(rawSlug)
  const product = await getProductDetailFromListing(slug)

  if (!product) notFound()

  let isOwner = false
  let listingId: number | null = null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ownerInfo = await getListingOwnerInfo(slug)
  if (user && ownerInfo) {
    isOwner = user.id === ownerInfo.sellerId
    listingId = ownerInfo.listingId
  }

  // Fetch related products (newest, excluding current, limited to 4)
  const relatedData = await getProductListItems({ sort: "newest", limit: 5 })
  const relatedProducts = relatedData.items.filter((p) => p.id !== product.id).slice(0, 4)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Breadcrumbs
        items={[
          { label: "Magazin", href: "/marketplace" },
          { label: product.name },
        ]}
      />
      <ProductDetailClient product={product} isOwner={isOwner} listingId={listingId} relatedProducts={relatedProducts} />
    </div>
  )
}
