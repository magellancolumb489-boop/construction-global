import { Store } from "lucide-react"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { MarketplaceContent } from "./marketplace-content"
import { getProductListItems } from "@/lib/api/listings"
import { getCategories } from "@/lib/api/categories"

export const metadata = {
  title: "Magazin Materiale - ConstructionHub Romania",
  description: "Materiale de constructii la preturi competitive: beton, pietris, otel, ciment.",
}

export default async function MarketplacePage() {
  const [listingsData, categories] = await Promise.all([
    getProductListItems({ sort: "newest" }),
    getCategories(),
  ])

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <Breadcrumbs items={[{ label: "Magazin" }]} />
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1">
          <Store className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Magazin</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Magazin Materiale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Materiale de constructii de calitate, livrate la santier
        </p>
      </div>
      <MarketplaceContent
        initialProducts={listingsData.items}
        initialTotal={listingsData.total}
        categories={categoryOptions}
      />
    </div>
  )
}
