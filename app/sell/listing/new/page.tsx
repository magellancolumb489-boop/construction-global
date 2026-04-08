import { getCategories } from "@/lib/api/categories"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { ListingForm } from "./listing-form"

export const metadata = {
  title: "Publica Anunt - ConstructionHub Romania",
}

// Server component -- auth guard is handled by app/sell/layout.tsx
export default async function NewListingPage() {
  const categories = await getCategories()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Magazin", href: "/marketplace" }, { label: "Anunt nou" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Publica un Anunt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Patru pasi: tip, detalii, imagini, publicare.
        </p>
      </div>
      <ListingForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
