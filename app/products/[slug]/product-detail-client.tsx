"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Package, Edit, Trash2, Loader2, User as UserIcon, Shield, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GalleryCarousel } from "@/components/shared/gallery-carousel"
import { MoneyDisplay } from "@/components/shared/money-display"
import { ProductCard } from "@/components/shared/product-card"
import { saveConfigureDraft } from "@/lib/configure-draft"
import { useCart } from "@/lib/cart-context"
import { deleteListing } from "@/lib/api/listings-client"
import { useToast } from "@/hooks/use-toast"
import type { ProductDetail, ProductListItem } from "@/types/domain"

interface ProductDetailClientProps {
  product: ProductDetail
  isOwner?: boolean
  listingId?: number | null
  relatedProducts?: ProductListItem[]
}

/** Stock / availability line — wording differs for equipment and services. */
function StockBadge({ product }: { product: ProductDetail }) {
  if (product.availableQty <= 0) {
    return <Badge variant="destructive" className="rounded-lg">Indisponibil</Badge>
  }
  if (product.listingKind === "equipment") {
    return (
      <Badge className="rounded-lg bg-slate-500/10 text-slate-800 border-slate-200">
        Un singur obiect disponibil
      </Badge>
    )
  }
  if (product.listingKind === "services") {
    return (
      <Badge className="rounded-lg bg-violet-500/10 text-violet-800 border-violet-200">
        Serviciu
      </Badge>
    )
  }
  return (
    <Badge className="rounded-lg bg-emerald-500/10 text-emerald-700 border-emerald-200">
      In stoc: {product.availableQty.toLocaleString("ro-RO")} {product.unit}
    </Badge>
  )
}

/**
 * CTA: concrete listings use calculator configurare; other kinds add a simple line to the cart
 * with optional fixed transport fee.
 */
function ProductPurchaseBlock({
  product,
  qty,
  onQtyChange,
}: {
  product: ProductDetail
  qty: number
  onQtyChange: (n: number) => void
}) {
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const qtyFieldId = useId()

  const isConcrete = product.listingKind === "concrete"
  const allowQty = product.listingKind === "materials"
  const maxQ = Math.max(1, product.availableQty)

  function handleContinueToConfigure() {
    saveConfigureDraft(product, 1)
    router.push("/cart/configurare")
  }

  function handleAddToCart() {
    const q = allowQty ? Math.min(Math.max(1, qty), maxQ) : 1
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      currency: product.currency,
      qty: q,
      availableQty: product.availableQty,
      thumbnailUrl: product.images[0] ?? "",
      transportFee:
        product.transportFee != null && product.transportFee > 0
          ? product.transportFee
          : undefined,
      configurationRequired: false,
      configurationComplete: true,
    })
    toast({
      title: "Adaugat in cos",
      description: "Puteti continua cumparaturile sau finaliza comanda.",
    })
  }

  if (isConcrete) {
    return (
      <div className="space-y-2">
        <Button
          className="h-12 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-all"
          onClick={handleContinueToConfigure}
          disabled={product.availableQty === 0}
        >
          Continua la configurare
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground leading-snug px-1">
          Cantitatea, TVA-ul, transportul si oferta finala se stabilesc in calculator si in cos,
          inainte de comanda.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {allowQty && product.availableQty > 0 && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor={qtyFieldId} className="text-xs text-muted-foreground">
              Cantitate
            </Label>
            <Input
              id={qtyFieldId}
              type="number"
              min={1}
              max={maxQ}
              value={qty}
              onChange={(e) =>
                onQtyChange(Math.max(1, Math.min(maxQ, Number(e.target.value) || 1)))
              }
              className="mt-1 h-11 rounded-xl"
            />
          </div>
        </div>
      )}
      {product.transportFee != null && product.transportFee > 0 && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Transport fix adaugat o data la linie:{" "}
          <MoneyDisplay
            amount={product.transportFee}
            currency={product.currency}
            className="inline font-semibold text-foreground"
          />
        </p>
      )}
      {product.serviceArea && (
        <p className="text-xs text-muted-foreground">
          Zona: {product.serviceArea}
        </p>
      )}
      <Button
        className="h-12 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-all"
        onClick={handleAddToCart}
        disabled={product.availableQty === 0}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        Adauga in cos
      </Button>
      <Button variant="outline" className="h-11 w-full rounded-2xl" asChild>
        <Link href="/cart">Vezi cosul</Link>
      </Button>
    </div>
  )
}

export function ProductDetailClient({
  product,
  isOwner = false,
  listingId,
  relatedProducts = [],
}: ProductDetailClientProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  /** Shared between mobile and desktop purchase panels (only one visible per breakpoint). */
  const [purchaseQty, setPurchaseQty] = useState(1)

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
        <div className="lg:col-span-2 space-y-6">
          <GalleryCarousel images={product.images} />

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
              <StockBadge product={product} />
            </div>
            {!isOwner && (
              <ProductPurchaseBlock
                product={product}
                qty={purchaseQty}
                onQtyChange={setPurchaseQty}
              />
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">Descriere</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{product.description}</p>
          </div>
        </div>

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
              <StockBadge product={product} />
            </div>

            {!isOwner && (
              <ProductPurchaseBlock
                product={product}
                qty={purchaseQty}
                onQtyChange={setPurchaseQty}
              />
            )}

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Tranzactie sigura si garantata
            </div>
          </div>
        </div>
      </div>

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
