import { notFound } from "next/navigation"
import { getAuctionDetailFromLot, getAuctionBids, getAuctionOwnerInfo, getAuctions } from "@/lib/api/auctions"
import { createClient } from "@/lib/supabase/server"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AuctionDetailClient } from "./auction-detail-client"

function extractId(param: string): number {
  const lastDash = param.lastIndexOf("-")
  if (lastDash === -1) return NaN
  return Number(param.substring(lastDash + 1))
}

function extractSlug(param: string): string {
  const lastDash = param.lastIndexOf("-")
  if (lastDash === -1) return param
  return param.substring(0, lastDash)
}

export default async function AuctionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug: rawSlug } = await params
  const slug = extractSlug(rawSlug)
  const lotId = extractId(rawSlug)

  const [auction, bidsData] = await Promise.all([
    getAuctionDetailFromLot(slug),
    isNaN(lotId) ? Promise.resolve({ items: [], total: 0 }) : getAuctionBids(lotId),
  ])

  if (!auction) notFound()

  let isOwner = false
  let isLoggedIn = false
  let currentUserId: string | null = null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    isLoggedIn = true
    currentUserId = user.id
    const ownerInfo = await getAuctionOwnerInfo(slug)
    if (ownerInfo) {
      isOwner = user.id === ownerInfo.sellerId
    }
  }

  // Fetch related auctions (active, excluding current, limited to 3)
  const relatedData = await getAuctions({ status: "active", sort: "ending_soon", limit: 4 })
  const relatedAuctions = relatedData.items.filter((a) => a.id !== auction.id).slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Breadcrumbs
        items={[
          { label: "Licitatii", href: "/auctions" },
          { label: auction.title },
        ]}
      />
      <AuctionDetailClient
        initialAuction={auction}
        initialBids={bidsData.items}
        isOwner={isOwner}
        isLoggedIn={isLoggedIn}
        currentUserId={currentUserId}
        lotId={Number(auction.id)}
        relatedAuctions={relatedAuctions}
      />
    </div>
  )
}
