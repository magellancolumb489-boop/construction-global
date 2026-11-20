import { Store } from "lucide-react"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { MarketplaceContent } from "./marketplace-content"
import { getProductListItems, type ListingsFilter } from "@/lib/api/listings"
import { getCategories } from "@/lib/api/categories"
import { MATERIAL_CATEGORY_CODES } from "@/lib/materials-logistics/catalog"

export const metadata = {
  title: "Magazin Materiale - ConstructionHub Romania",
  description: "Materiale de constructii la preturi competitive: beton, pietris, otel, ciment.",
}

const PAGE_SIZE = 24

const LISTING_TYPES = ["concrete", "materials", "equipment", "services"] as const
const SORTS = ["newest", "price_asc", "price_desc", "title"] as const

type SearchParams = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

/** Comma-separated list, kept only when every value is in `allowed` (or `allowed` is a pattern). */
function list(v: string | string[] | undefined, allowed: readonly string[] | RegExp): string[] {
  const raw = one(v)
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (allowed instanceof RegExp ? allowed.test(s) : allowed.includes(s)))
    .slice(0, 50)
}

function num(v: string | string[] | undefined): number | undefined {
  const n = Number(one(v))
  return one(v) !== "" && Number.isFinite(n) && n >= 0 ? n : undefined
}

/** URL → validated filter. Unknown values are dropped, never passed to the query. */
function parseFilters(sp: SearchParams): { filter: ListingsFilter; page: number } {
  const page = Math.max(1, Math.floor(num(sp.page) ?? 1))
  const sortRaw = one(sp.sort)
  const sort = (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as ListingsFilter["sort"]) : "newest"
  const transportRaw = one(sp.transport)
  const categoryId = num(sp.categorie)
  return {
    page,
    filter: {
      sort,
      listingTypes: list(sp.tip, LISTING_TYPES),
      materialCategories: list(sp.cat, MATERIAL_CATEGORY_CODES),
      materialCodes: list(sp.mat, /^[a-z0-9_]{1,40}$/),
      transport: transportRaw === "seller" || transportRaw === "platform" ? transportRaw : undefined,
      location: one(sp.loc).slice(0, 80) || undefined,
      search: one(sp.q).slice(0, 80) || undefined,
      minPrice: num(sp.min),
      maxPrice: num(sp.max),
      categoryId: categoryId && Number.isInteger(categoryId) ? categoryId : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
  }
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { filter, page } = parseFilters(await searchParams)
  const [listingsData, categories] = await Promise.all([
    getProductListItems(filter),
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
        products={listingsData.items}
        total={listingsData.total}
        page={page}
        pageSize={PAGE_SIZE}
        categories={categoryOptions}
      />
    </div>
  )
}
