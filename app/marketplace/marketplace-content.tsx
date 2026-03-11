"use client"

import { useMemo, useState } from "react"
import { ProductCard } from "@/components/shared/product-card"
import { EmptyState } from "@/components/shared/empty-state"
import { FiltersSidebar, type FilterSection } from "@/components/shared/filters-sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, Store, X } from "lucide-react"
import type { ProductListItem } from "@/types/domain"

interface CategoryOption {
  id: number
  slug: string
  name: string
}

interface MarketplaceContentProps {
  initialProducts: ProductListItem[]
  initialTotal: number
  categories: CategoryOption[]
}

export function MarketplaceContent({ initialProducts, initialTotal, categories }: MarketplaceContentProps) {
  const [sort, setSort] = useState<string>("newest")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [showFilters, setShowFilters] = useState(false)

  const filterSections: FilterSection[] = useMemo(() => [
    {
      id: "category",
      label: "Categorie",
      options: categories.map((c) => ({ value: c.name, label: c.name })),
    },
  ], [categories])

  const activeFilterCount = Object.values(selectedFilters).flat().length

  const filteredProducts = useMemo(() => {
    let items = [...initialProducts]

    const selectedCats = selectedFilters.category ?? []
    if (selectedCats.length > 0) {
      items = items.filter((p) => selectedCats.includes(p.category))
    }

    switch (sort) {
      case "price_asc":
        items.sort((a, b) => a.price - b.price)
        break
      case "price_desc":
        items.sort((a, b) => b.price - a.price)
        break
      case "name":
        items.sort((a, b) => a.name.localeCompare(b.name, "ro"))
        break
    }

    return items
  }, [initialProducts, selectedFilters, sort])

  function handleToggle(sectionId: string, value: string) {
    setSelectedFilters((prev) => {
      const current = prev[sectionId] ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      return { ...prev, [sectionId]: next }
    })
  }

  function handleReset() {
    setSelectedFilters({})
  }

  const hasProducts = initialProducts.length > 0

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Mobile filter toggle */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2 rounded-xl">
          <Filter className="h-4 w-4" />
          Filtre
          {activeFilterCount > 0 && (
            <Badge className="ml-0.5 h-5 min-w-5 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs text-muted-foreground">
            <X className="h-3 w-3" /> Sterge
          </Button>
        )}
      </div>

      {/* Sidebar */}
      <div className={`w-full shrink-0 lg:w-64 ${showFilters ? "block" : "hidden lg:block"}`}>
        <FiltersSidebar
          sections={filterSections}
          selected={selectedFilters}
          onToggle={handleToggle}
          onReset={handleReset}
        />
      </div>

      {/* Product grid */}
      <div className="flex-1 min-w-0">
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/50 bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{filteredProducts.length}</span> din {initialTotal} produse
          </p>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44 rounded-xl border-border/50">
              <SelectValue placeholder="Sorteaza" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Cele mai noi</SelectItem>
              <SelectItem value="name">Denumire</SelectItem>
              <SelectItem value="price_asc">Pret crescator</SelectItem>
              <SelectItem value="price_desc">Pret descrescator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!hasProducts && (
          <EmptyState icon={Store} title="Niciun produs gasit" description="Magazinul nu are inca produse listate." />
        )}

        {hasProducts && filteredProducts.length === 0 && (
          <EmptyState icon={Store} title="Niciun produs gasit" description="Incearca sa modifici filtrele." />
        )}

        {filteredProducts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
