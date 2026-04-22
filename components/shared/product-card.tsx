"use client"

import Link from "next/link"
import Image from "next/image"
import { Package, ArrowRight } from "lucide-react"
import { MoneyDisplay } from "./money-display"
import { WishlistToggle } from "./wishlist-toggle"
import type { ProductListItem } from "@/types/domain"

export function ProductCard({ product }: { product: ProductListItem }) {
  const href = `/products/${product.slug}-${product.id}`
  const ctaLabel = product.listingKind === "concrete" ? "Configurare" : "Detalii"

  return (
    <Link href={href} className="group relative block">
      <WishlistToggle target={{ kind: "listing", listing_id: Number(product.id) }} />
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-4/3 overflow-hidden">
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
          {product.availableQty > 0 && (
            <div className="absolute right-3 top-3">
              <div className="rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white shadow-md">
                In stoc
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span>{product.availableQty.toLocaleString("ro-RO")} {product.unit}</span>
          </div>
          <div className="mb-3 flex items-baseline gap-1">
            <MoneyDisplay
              amount={product.price}
              currency={product.currency}
              className="text-xl font-extrabold text-foreground"
            />
            <span className="text-xs text-muted-foreground">/ {product.unit}</span>
          </div>
          <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground shadow-sm">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}
