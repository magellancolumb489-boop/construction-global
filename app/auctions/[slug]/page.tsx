import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getMockAuctionDetailForSlug,
  MOCK_AUCTION_LIST_ITEMS,
  MOCK_BID_ROWS,
  filterMockAuctions,
} from "@/lib/auction-shell/mock-data"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AuctionDetailClient } from "./auction-detail-client"

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

  const auction = getMockAuctionDetailForSlug(slug)
  if (!auction) notFound()

  const relatedAuctions = filterMockAuctions(MOCK_AUCTION_LIST_ITEMS, {
    status: "active",
    sort: "ending_soon",
    limit: 4,
  })
    .items.filter((a) => a.id !== auction.id)
    .slice(0, 3)

  let isOwner = false
  let isLoggedIn = false
  let currentUserId: string | null = null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    isLoggedIn = true
    currentUserId = user.id
  }

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
        initialBids={MOCK_BID_ROWS}
        isOwner={isOwner}
        isLoggedIn={isLoggedIn}
        currentUserId={currentUserId}
        lotId={Number(auction.id)}
        relatedAuctions={relatedAuctions}
      />
    </div>
  )
}
