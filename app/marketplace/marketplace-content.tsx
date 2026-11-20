"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ProductCard } from "@/components/shared/product-card"
import { EmptyState } from "@/components/shared/empty-state"
import { FiltersSidebar, type FilterSection } from "@/components/shared/filters-sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Filter, Store, X } from "lucide-react"
import type { ProductListItem } from "@/types/domain"
import {
  MATERIAL_CATEGORY_CODES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  MATERIALS_BY_CATEGORY,
  type MaterialCategoryCode,
} from "@/lib/materials-logistics/catalog"

interface CategoryOption {
  id: number
  slug: string
  name: string
}

interface MarketplaceContentProps {
  products: ProductListItem[]
  total: number
  page: number
  pageSize: number
  categories: CategoryOption[]
}

/** URL keys for checkbox sections (comma-separated values). */
const LIST_KEYS = ["tip", "cat", "mat", "transport", "categorie"] as const
/** URL keys for free-text / number inputs. */
const TEXT_KEYS = ["q", "loc", "min", "max"] as const

const TYPE_OPTIONS = [
  { value: "concrete", label: "Beton" },
  { value: "materials", label: "Materiale" },
  { value: "equipment", label: "Utilaje" },
  { value: "services", label: "Servicii" },
]

const TRANSPORT_OPTIONS = [
  { value: "seller", label: "Transport asigurat de vanzator" },
  { value: "platform", label: "Transport organizat de platforma" },
]

/**
 * Filters live in the URL and run on the server across all listings
 * (before: only the first 20 rows were loaded and filtered in the browser).
 */
export function MarketplaceContent({ products, total, page, pageSize, categories }: MarketplaceContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(false)

  const selected = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const k of LIST_KEYS) {
      const raw = params.get(k)
      out[k] = raw ? raw.split(",").filter(Boolean) : []
    }
    return out
  }, [params])

  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(TEXT_KEYS.map((k) => [k, params.get(k) ?? ""])),
  )
  // Keep inputs in sync on back/forward navigation.
  useEffect(() => {
    setText(Object.fromEntries(TEXT_KEYS.map((k) => [k, params.get(k) ?? ""])))
  }, [params])

  function navigate(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString())
    mutate(next)
    next.delete("page") // any filter change starts from page 1
    const qs = next.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  function handleToggle(sectionId: string, value: string) {
    navigate((next) => {
      const current = selected[sectionId] ?? []
      // Transport is either/or; the rest are multi-select.
      let values =
        sectionId === "transport"
          ? current.includes(value) ? [] : [value]
          : current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      // Dropping a material category drops its materials too.
      if (sectionId === "cat") {
        const keep = new Set(values.flatMap((c) => MATERIALS_BY_CATEGORY[c as MaterialCategoryCode] ?? []))
        const mats = (selected.mat ?? []).filter((m) => values.length === 0 || keep.has(m))
        if (mats.length) next.set("mat", mats.join(","))
        else next.delete("mat")
      }
      values = values.filter(Boolean)
      if (values.length) next.set(sectionId, values.join(","))
      else next.delete(sectionId)
    })
  }

  function applyText() {
    navigate((next) => {
      for (const k of TEXT_KEYS) {
        const v = text[k]?.trim() ?? ""
        if (v) next.set(k, v)
        else next.delete(k)
      }
    })
  }

  function handleReset() {
    setText(Object.fromEntries(TEXT_KEYS.map((k) => [k, ""])))
    startTransition(() => router.push(pathname, { scroll: false }))
  }

  function goToPage(p: number) {
    const next = new URLSearchParams(params.toString())
    if (p <= 1) next.delete("page")
    else next.set("page", String(p))
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  const sort = params.get("sort") ?? "newest"

  const filterSections: FilterSection[] = useMemo(() => {
    const cats = selected.cat ?? []
    // Material list follows the chosen categories; ciment / piatra sparta 0-31 appear once.
    const matCodes = Array.from(
      new Set(
        (cats.length ? cats : []).flatMap((c) => MATERIALS_BY_CATEGORY[c as MaterialCategoryCode] ?? []),
      ),
    )
    return [
      { id: "tip", label: "Tip anunt", options: TYPE_OPTIONS },
      {
        id: "cat",
        label: "Categorie material",
        options: MATERIAL_CATEGORY_CODES.map((c) => ({ value: c, label: MATERIAL_CATEGORY_LABELS[c] })),
      },
      {
        id: "mat",
        label: "Material",
        options: matCodes.map((m) => ({ value: m, label: MATERIAL_LABELS[m] ?? m })),
      },
      { id: "transport", label: "Transport", options: TRANSPORT_OPTIONS },
      {
        id: "categorie",
        label: "Categorie magazin",
        options: categories.map((c) => ({ value: String(c.id), label: c.name })),
      },
    ]
  }, [selected, categories])

  const activeFilterCount =
    Object.values(selected).flat().length + TEXT_KEYS.filter((k) => params.get(k)).length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

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
          selected={selected}
          onToggle={handleToggle}
          onReset={handleReset}
          hasExtraFilters={TEXT_KEYS.some((k) => params.get(k))}
        >
          <form
            className="mb-3 space-y-3 border-b border-border/50 pb-3"
            onSubmit={(e) => {
              e.preventDefault()
              applyText()
            }}
          >
            <div>
              <Label htmlFor="f-q" className="text-xs">Cauta</Label>
              <Input
                id="f-q"
                value={text.q}
                onChange={(e) => setText((t) => ({ ...t, q: e.target.value }))}
                placeholder="ex: ciment, nisip"
                className="mt-1 h-9 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="f-loc" className="text-xs">Localitate / judet</Label>
              <Input
                id="f-loc"
                value={text.loc}
                onChange={(e) => setText((t) => ({ ...t, loc: e.target.value }))}
                placeholder="ex: Cluj"
                className="mt-1 h-9 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="f-min" className="text-xs">Pret min</Label>
                <Input
                  id="f-min"
                  type="number"
                  min={0}
                  value={text.min}
                  onChange={(e) => setText((t) => ({ ...t, min: e.target.value }))}
                  className="mt-1 h-9 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="f-max" className="text-xs">Pret max</Label>
                <Input
                  id="f-max"
                  type="number"
                  min={0}
                  value={text.max}
                  onChange={(e) => setText((t) => ({ ...t, max: e.target.value }))}
                  className="mt-1 h-9 rounded-xl"
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full rounded-xl" disabled={isPending}>
              Aplica
            </Button>
          </form>
        </FiltersSidebar>
      </div>

      {/* Product grid */}
      <div className={`flex-1 min-w-0 transition-opacity ${isPending ? "opacity-60" : ""}`}>
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/50 bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? (
              "0 produse"
            ) : (
              <>
                <span className="font-bold text-foreground">{from}–{to}</span> din {total} produse
              </>
            )}
          </p>
          <Select
            value={sort}
            onValueChange={(v) =>
              navigate((next) => {
                if (v === "newest") next.delete("sort")
                else next.set("sort", v)
              })
            }
          >
            <SelectTrigger className="w-44 rounded-xl border-border/50">
              <SelectValue placeholder="Sorteaza" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Cele mai noi</SelectItem>
              <SelectItem value="title">Denumire</SelectItem>
              <SelectItem value="price_asc">Pret crescator</SelectItem>
              <SelectItem value="price_desc">Pret descrescator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {total === 0 && activeFilterCount === 0 && (
          <EmptyState icon={Store} title="Niciun produs gasit" description="Magazinul nu are inca produse listate." />
        )}

        {total === 0 && activeFilterCount > 0 && (
          <EmptyState icon={Store} title="Niciun produs gasit" description="Incearca sa modifici filtrele." />
        )}

        {products.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1 || isPending}
              onClick={() => goToPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Inapoi
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page} din {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages || isPending}
              onClick={() => goToPage(page + 1)}
            >
              Inainte <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
