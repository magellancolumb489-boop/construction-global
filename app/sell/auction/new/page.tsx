import { getCategories } from "@/lib/api/categories"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { AuctionForm } from "./auction-form"

export const metadata = {
  title: "Creeaza Licitatie - ConstructionHub Romania",
}

// Server component -- auth guard is handled by app/sell/layout.tsx
export default async function NewAuctionPage() {
  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Licitatii", href: "/auctions" }, { label: "Licitatie noua" }]} />
      <h1 className="mb-6 text-2xl font-bold text-foreground">Creeaza Licitatie Noua</h1>
      <AuctionForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  )
}
