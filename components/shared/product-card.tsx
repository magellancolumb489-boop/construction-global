"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, ArrowRight, Images, Truck, Store, Package, Clock } from "lucide-react"
import { MoneyDisplay } from "./money-display"
import { WishlistToggle } from "./wishlist-toggle"
import { EQUIPMENT_CONDITION_LABELS } from "@/lib/listings/rules"
import type { ListingKind, ProductListItem } from "@/types/domain"

const KIND: Record<ListingKind, { label: string; className: string }> = {
  concrete: { label: "Beton", className: "bg-slate-900/85 text-white" },
  materials: { label: "Materiale", className: "bg-amber-500/90 text-white" },
  equipment: { label: "Utilaje", className: "bg-sky-600/90 text-white" },
  services: { label: "Servicii", className: "bg-violet-600/90 text-white" },
}

const UNIT_LABEL: Record<string, string> = {
  TON: "tonă", KG: "kg", M3: "m³", BUC: "buc", ML: "ml", CUP: "cupă", CAMION: "camion",
}

/** One line of the details that matter for this kind of listing. */
function specLine(p: ProductListItem): string | null {
  switch (p.listingKind) {
    case "concrete": {
      const cls = p.concreteClassCodes ?? []
      const classes = cls.length > 2 ? `${cls.slice(0, 2).join(" · ")} +${cls.length - 2}` : cls.join(" · ")
      const modes = (p.transportModes ?? []).join(" / ")
      return [classes, modes].filter(Boolean).join(" — ") || null
    }
    case "materials":
      return p.materialLabel ?? null
    case "equipment": {
      const cond = p.equipmentCondition
        ? (EQUIPMENT_CONDITION_LABELS as Record<string, string>)[p.equipmentCondition] ?? p.equipmentCondition
        : null
      return [p.equipmentModel, p.equipmentYear ? String(p.equipmentYear) : null, cond].filter(Boolean).join(" · ") || null
    }
    case "services":
      return p.serviceArea ? `Zona: ${p.serviceArea}` : null
    default:
      return null
  }
}

function isNew(createdAt?: string): boolean {
  return !!createdAt && Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
}

export function ProductCard({ product }: { product: ProductListItem }) {
  const href = `/products/${product.slug}-${product.id}`
  const kind = product.listingKind ? KIND[product.listingKind] : null
  const configurable = product.listingKind === "concrete" || product.materialCode != null
  const unit = UNIT_LABEL[product.unit] ?? product.unit
  const spec = specLine(product)
  const showFrom = product.listingKind === "concrete" && product.priceFrom != null
  const price = showFrom ? product.priceFrom! : product.price

  return (
    <Link href={href} className="group relative block h-full">
      <WishlistToggle target={{ kind: "listing", listing_id: Number(product.id) }} />
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {kind && <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold shadow ${kind.className}`}>{kind.label}</span>}
            {isNew(product.createdAt) && (
              <span className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">Nou</span>
            )}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-[11px] font-medium text-white">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5">
              <Truck className="h-3 w-3" />
              {product.sellerAssumesTransport ? "Livrare de la vânzător" : "Transport prin platformă"}
            </span>
            {(product.imageCount ?? 0) > 1 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-1.5 py-0.5">
                <Images className="h-3 w-3" /> {product.imageCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          {spec && <p className="mb-2 line-clamp-1 text-xs font-medium text-foreground/80">{spec}</p>}

          <div className="mb-3 space-y-1 text-xs text-muted-foreground">
            {product.location && (
              <p className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" /> {product.location}
              </p>
            )}
            {product.sellerName && (
              <p className="flex items-center gap-1.5 truncate">
                <Store className="h-3 w-3 shrink-0" /> {product.sellerName}
              </p>
            )}
            {product.minOrderQty != null && product.minOrderQty > 0 && (
              <p className="flex items-center gap-1.5">
                <Package className="h-3 w-3 shrink-0" /> Comandă minimă {product.minOrderQty.toLocaleString("ro-RO")} {unit}
              </p>
            )}
          </div>

          <div className="mt-auto">
            <div className="mb-3 flex items-baseline gap-1">
              {showFrom && <span className="text-xs text-muted-foreground">de la</span>}
              <MoneyDisplay amount={price} currency={product.currency} className="text-xl font-extrabold text-foreground" />
              <span className="text-xs text-muted-foreground">/ {unit} + TVA</span>
            </div>
            <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {configurable ? (
                <>
                  <Clock className="h-3.5 w-3.5" /> Configurează și vezi prețul
                </>
              ) : (
                <>
                  Vezi detalii <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
