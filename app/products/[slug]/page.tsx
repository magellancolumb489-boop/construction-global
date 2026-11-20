import { notFound } from "next/navigation"
import {
  getListingOwnerInfo,
  getProductDetailFromListing,
  getSellerOtherListings,
  getSimilarListings,
} from "@/lib/api/listings"
import { createClient } from "@/lib/supabase/server"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ListingSpecs } from "@/components/products/listing-specs"
import { SellerCard } from "@/components/products/seller-card"
import { AuctionsTeaser, ProductRow } from "@/components/products/cross-promo"
import { ProductDetailClient } from "./product-detail-client"

function extractSlug(param: string): string {
  const lastDash = param.lastIndexOf("-")
  if (lastDash === -1) return param
  return param.substring(0, lastDash)
}

const KIND_LABEL: Record<string, string> = { concrete: "Beton", materials: "Materiale", equipment: "Utilaje", services: "Servicii" }

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = extractSlug(rawSlug)
  const product = await getProductDetailFromListing(slug)

  if (!product) notFound()

  const supabase = await createClient()
  const [{ data: { user } }, ownerInfo, similar, sellerOther] = await Promise.all([
    supabase.auth.getUser(),
    getListingOwnerInfo(slug),
    getSimilarListings(product),
    getSellerOtherListings(product.sellerId, product.id),
  ])
  const isOwner = !!user && !!ownerInfo && user.id === ownerInfo.sellerId
  const listingId = ownerInfo?.listingId ?? null

  const similarHref = product.materialLogistics
    ? `/marketplace?cat=${product.materialLogistics.categoryCode}&mat=${product.materialLogistics.materialCode}`
    : `/marketplace?tip=${product.listingKind}`

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:py-8">
      <div>
        <Breadcrumbs
          items={[
            { label: "Magazin", href: "/marketplace" },
            { label: KIND_LABEL[product.listingKind] ?? "Anunț", href: `/marketplace?tip=${product.listingKind}` },
            { label: product.name },
          ]}
        />
        <ProductDetailClient
          product={product}
          isOwner={isOwner}
          listingId={listingId}
          specsSlot={<ListingSpecs product={product} />}
          sellerSlot={
            <SellerCard
              sellerId={product.sellerId}
              name={product.sellerDisplayName}
              companyName={product.sellerCompanyName}
              entityType={product.sellerEntityType}
              activeListings={sellerOther.total + 1}
            />
          }
        />
      </div>

      <ProductRow
        title="Oferte similare"
        subtitle={product.materialLabel ? `Alți vânzători de ${product.materialLabel.toLowerCase()}` : "De la alți vânzători"}
        href={similarHref}
        items={similar}
      />
      <ProductRow
        title="Mai multe de la acest vânzător"
        href={`/marketplace?vanzator=${product.sellerId}`}
        items={sellerOther.items}
      />
      <AuctionsTeaser />
    </div>
  )
}
