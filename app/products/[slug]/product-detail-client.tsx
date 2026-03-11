"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, Package, Minus, Plus, CheckCircle2, Edit, Trash2, Loader2, User as UserIcon, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GalleryCarousel } from "@/components/shared/gallery-carousel"
import { MoneyDisplay } from "@/components/shared/money-display"
import { ProductCard } from "@/components/shared/product-card"
import { useCart } from "@/lib/cart-context"
import { deleteListing } from "@/lib/api/listings-client"
import type { ProductDetail, ProductListItem } from "@/types/domain"

interface ProductDetailClientProps {
  product: ProductDetail
  isOwner?: boolean
  listingId?: number | null
  relatedProducts?: ProductListItem[]
}

export function ProductDetailClient({ product, isOwner = false, listingId, relatedProducts = [] }: ProductDetailClientProps) {
  const { addItem } = useCart()
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      currency: product.currency,
      qty,
      availableQty: product.availableQty,
      thumbnailUrl: product.thumbnailUrl,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  async function handleDelete() {
    if (!listingId) return
    setDeleting(true)
    const res = await deleteListing(listingId)
    if (res.success) {
      router.push("/account?tab=listings")
      router.refresh()
    } else {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Owner toolbar */}
      {isOwner && listingId && (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Acesta este anuntul tau.</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href={`/sell/listing/${listingId}/edit`}>
                <Edit className="mr-1 h-4 w-4" /> Editeaza
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="rounded-xl" disabled={deleting}>
                  {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
                  Sterge
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sterge anuntul?</AlertDialogTitle>
                  <AlertDialogDescription>Aceasta actiune este ireversibila.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Anuleaza</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground">Sterge Definitiv</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Left - Gallery + Description */}
        <div className="lg:col-span-2 space-y-6">
          <GalleryCarousel images={product.images} />

          {/* Mobile price + add to cart -- visible on small screens only */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 lg:hidden">
            <h2 className="mb-3 text-xl font-extrabold text-foreground">{product.name}</h2>
            <div className="mb-4 flex items-baseline gap-2 rounded-xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
              <MoneyDisplay
                amount={product.price}
                currency={product.currency}
                className="text-2xl font-extrabold text-primary"
              />
              <span className="text-sm text-muted-foreground">/ {product.unit}</span>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              {product.availableQty > 0 ? (
                <Badge className="rounded-lg bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  In stoc: {product.availableQty.toLocaleString("ro-RO")} {product.unit}
                </Badge>
              ) : (
                <Badge variant="destructive" className="rounded-lg">Indisponibil</Badge>
              )}
            </div>

            {/* Qty */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantitate ({product.unit})</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number" min={1} max={product.availableQty} value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(product.availableQty, Number(e.target.value) || 1)))}
                  className="h-11 w-20 rounded-xl text-center text-lg font-bold"
                />
                <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setQty((q) => Math.min(product.availableQty, q + 1))} disabled={qty >= product.availableQty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <MoneyDisplay amount={product.price * qty} currency={product.currency} className="text-lg font-extrabold text-foreground" />
            </div>

            {!isOwner && (
              added ? (
                <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-4 w-4" /> Adaugat in cos!
                </div>
              ) : (
                <Button
                  className="h-12 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-all"
                  onClick={handleAdd}
                  disabled={product.availableQty === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adauga in cos
                </Button>
              )
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">Descriere</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
          </div>
        </div>

        {/* Right - Price + Cart -- desktop sticky, hidden on mobile */}
        <div className="hidden space-y-4 lg:block lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold text-foreground">{product.name}</h2>

            <div className="mb-4 flex items-baseline gap-2 rounded-xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
              <MoneyDisplay
                amount={product.price}
                currency={product.currency}
                className="text-3xl font-extrabold text-primary"
              />
              <span className="text-base text-muted-foreground">/ {product.unit}</span>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              {product.availableQty > 0 ? (
                <Badge className="rounded-lg bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  In stoc: {product.availableQty.toLocaleString("ro-RO")} {product.unit}
                </Badge>
              ) : (
                <Badge variant="destructive" className="rounded-lg">Indisponibil</Badge>
              )}
            </div>

            {/* Qty */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantitate ({product.unit})</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number" min={1} max={product.availableQty} value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(product.availableQty, Number(e.target.value) || 1)))}
                  className="h-10 w-20 rounded-xl text-center text-lg font-bold"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setQty((q) => Math.min(product.availableQty, q + 1))} disabled={qty >= product.availableQty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <MoneyDisplay amount={product.price * qty} currency={product.currency} className="text-lg font-extrabold text-foreground" />
            </div>

            {!isOwner && (
              added ? (
                <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-4 w-4" /> Adaugat in cos!
                </div>
              ) : (
                <Button
                  className="h-12 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-all"
                  onClick={handleAdd}
                  disabled={product.availableQty === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adauga in cos
                </Button>
              )
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Tranzactie sigura si garantata
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-border/50 pt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Produse Similare</h2>
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link href="/marketplace">Vezi toate</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
