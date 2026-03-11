"use client"

import { useEffect, useState, useCallback } from "react"
import { AuctionCard } from "@/components/shared/auction-card"
import { AuctionCardSkeleton } from "@/components/shared/skeletons"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import {
  FiltersSidebar,
  type FilterSection,
} from "@/components/shared/filters-sidebar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, Gavel, X } from "lucide-react"
import { getAuctionsFiltered } from "@/lib/api/auctions-client"
import type { AuctionListItem, AuctionStatus } from "@/types/domain"

interface CategoryOption {
  id: number
  slug: string
  name: string
}

interface AuctionsContentProps {
  initialAuctions: AuctionListItem[]
  initialTotal: number
  categories: CategoryOption[]
}

export function AuctionsContent({ initialAuctions, initialTotal, categories }: AuctionsContentProps) {
  const [auctions, setAuctions] = useState<AuctionListItem[]>(initialAuctions)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [sort, setSort] = useState<string>("ending_soon")
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const filterSections: FilterSection[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { value: "active", label: "Activa" },
        { value: "scheduled", label: "Programata" },
        { value: "ended", label: "Finalizata" },
        { value: "draft", label: "Ciorna" },
        { value: "cancelled", label: "Anulata" },
      ],
    },
    {
      id: "category",
      label: "Categorie",
      options: categories.map((c) => ({ value: String(c.id), label: c.name })),
    },
  ]

  const activeFilterCount = Object.values(selectedFilters).flat().length

  const fetchAuctions = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const filters: Parameters<typeof getAuctionsFiltered>[0] = {
        sort: sort as "ending_soon" | "newest" | "highest_bid",
      }
      if (selectedFilters.status?.length === 1) {
        filters.status = selectedFilters.status[0] as AuctionStatus
      }
      if (selectedFilters.category?.length === 1) {
        filters.categoryId = Number(selectedFilters.category[0])
      }
      const data = await getAuctionsFiltered(filters)
      setAuctions(data.items)
      setTotal(data.total)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [sort, selectedFilters])

  const [didMount, setDidMount] = useState(false)
  useEffect(() => {
    if (!didMount) { setDidMount(true); return }
    fetchAuctions()
  }, [fetchAuctions, didMount])

  function handleToggle(sectionId: string, value: string) {
    setSelectedFilters((prev) => {
      const current = prev[sectionId] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [sectionId]: next }
    })
  }

  function handleReset() {
    setSelectedFilters({})
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Mobile filter toggle */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="gap-2 rounded-xl"
        >
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

      {/* Filters Sidebar */}
      <div className={`w-full shrink-0 lg:w-64 ${showMobileFilters ? "block" : "hidden lg:block"}`}>
        <FiltersSidebar
          sections={filterSections}
          selected={selectedFilters}
          onToggle={handleToggle}
          onReset={handleReset}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/50 bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {loading ? "Se incarca..." : (
              <><span className="font-bold text-foreground">{total}</span> licitatii</>
            )}
          </p>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44 rounded-xl border-border/50">
              <SelectValue placeholder="Sorteaza" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ending_soon">Se termina curand</SelectItem>
              <SelectItem value="newest">Cele mai noi</SelectItem>
              <SelectItem value="highest_bid">Cea mai mare oferta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && !loading && (
          <ErrorState message="Nu am putut incarca licitatiile." onRetry={fetchAuctions} />
        )}

        {!loading && !error && auctions.length === 0 && (
          <EmptyState icon={Gavel} title="Nicio licitatie gasita" description="Incearca sa modifici filtrele." />
        )}

        {!loading && !error && auctions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
