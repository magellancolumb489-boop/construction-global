import { Suspense } from "react"
import { Gavel } from "lucide-react"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AuctionsContent } from "./auctions-content"
import { AuctionCardSkeleton } from "@/components/shared/skeletons"
import { getAuctions } from "@/lib/api/auctions"
import { getCategories } from "@/lib/api/categories"

export const metadata = {
  title: "Licitatii - ConstructionHub Romania",
  description: "Exploreaza licitatii active pentru echipamente si utilaje de constructii.",
}

function AuctionsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <AuctionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default async function AuctionsPage() {
  const [auctionsData, categories] = await Promise.all([
    getAuctions({ sort: "ending_soon" }),
    getCategories(),
  ])

  const categoryOptions = categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Breadcrumbs items={[{ label: "Licitatii" }]} />
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
          <Gavel className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Licitatii</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Toate Licitatiile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Descopera si liciteaza pentru echipamente, utilaje si servicii de constructii
        </p>
      </div>
      <Suspense fallback={<AuctionsLoading />}>
        <AuctionsContent
          initialAuctions={auctionsData.items}
          initialTotal={auctionsData.total}
          categories={categoryOptions}
        />
      </Suspense>
    </div>
  )
}
