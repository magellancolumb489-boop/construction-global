"use client"

import { useId, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Package, Edit, Trash2, Loader2, User as UserIcon, Shield, ShoppingCart, MapPin } from "lucide-react"
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
import { saveConfigureDraft } from "@/lib/configure-draft"
import { useCart } from "@/lib/cart-context"
import { deleteListing } from "@/lib/api/listings-client"
import { useToast } from "@/hooks/use-toast"
import type { ProductDetail } from "@/types/domain"

interface ProductDetailClientProps {
  product: ProductDetail
  isOwner?: boolean
  listingId?: number | null
  /** Server-rendered technical details (left column, under the description). */
  specsSlot?: ReactNode
  /** Server-rendered seller card (right column, under the purchase panel). */
  sellerSlot?: ReactNode
}

const KIND_LABEL: Record<string, string> = { concrete: "Beton", materials: "Materiale", equipment: "Utilaje", services: "Servicii" }

/** Concrete is priced per class/consistency: show the lowest as "de la". */
function headlinePrice(product: ProductDetail): { amount: number; from: boolean } {
  if (product.listingKind === "concrete") {
    const prices = product.concreteClasses
      .flatMap((c) => Object.values(c.consistencyPrices).map(Number))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (prices.length) return { amount: Math.min(...prices), from: true }
  }
  return { amount: product.price, from: false }
}

function PriceHeadline({ product, size }: { product: ProductDetail; size: "md" | "lg" }) {
  const hp = headlinePrice(product)
  return (
    <div className="mb-4 rounded-xl bg-primary/10 px-4 py-3 ring-1 ring-primary/20">
      <div className="flex items-baseline gap-2">
        {hp.from && <span className="text-sm text-muted-foreground">de la</span>}
        <MoneyDisplay
          amount={hp.amount}
          currency={product.currency}
          className={`${size === "lg" ? "text-3xl" : "text-2xl"} font-extrabold text-primary`}
        />
        <span className="text-sm text-muted-foreground">/ {product.unit} + TVA</span>
      </div>
      {product.minOrderQty != null && product.minOrderQty > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Comandă minimă: {product.minOrderQty.toLocaleString("ro-RO")} {product.unit}
        </p>
      )}
    </div>
  )
}

function TitleBlock({ product }: { product: ProductDetail }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Badge className="rounded-lg">{KIND_LABEL[product.listingKind] ?? product.listingKind}</Badge>
        {product.materialLabel && <Badge variant="secondary" className="rounded-lg">{product.materialLabel}</Badge>}
        <Badge variant="outline" className="rounded-lg">
          {product.sellerAssumesTransport ? "Livrare de la vânzător" : "Transport prin platformă"}
        </Badge>
      </div>
      <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">{product.name}</h1>
      {product.location && (
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {product.location}
        </p>
      )}
    </div>
  )
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
  const needsMaterialsConfigurator =
    product.listingKind === "materials" && product.materialLogistics != null
  const allowQty =
    product.listingKind === "materials" && !needsMaterialsConfigurator
  const maxQ = Math.max(1, product.availableQty)
  const minQ = Math.min(maxQ, product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1)

  function handleContinueToConfigure() {
    const q = isConcrete
      ? 1
      : Math.min(Math.max(minQ, qty), maxQ)
    saveConfigureDraft(product, q)
    router.push("/cart/configurare")
  }

  function handleAddToCart() {
    const q = allowQty ? Math.min(Math.max(minQ, qty), maxQ) : 1
    const res = addItem({
      productId: product.id,
      sellerId: product.sellerId,
      name: product.name,
      price: product.price,
      unit: product.unit,
      currency: product.currency,
      qty: q,
      availableQty: product.availableQty,
      thumbnailUrl: product.images[0] ?? "",
      // Seller's flat fee only when the seller delivers; platform transport is quoted later.
      transportFee:
        product.sellerAssumesTransport && product.transportFee != null && product.transportFee > 0
          ? product.transportFee
          : undefined,
      configurationRequired: false,
      configurationComplete: true,
    })
    if (!res.ok && res.reason === "seller_mismatch") {
      toast({
        variant: "destructive",
        title: "Alt vânzător în coș",
        description:
          "Puteți comanda de la un singur vânzător per plată. Finalizați sau goliți coșul înainte de a adăuga produse de la alt furnizor.",
      })
      return
    }
    toast({
      title: "Adaugat in cos",
      description: "Puteti continua cumparaturile sau finaliza comanda.",
    })
  }

  if (isConcrete || needsMaterialsConfigurator) {
    return (
      <div className="space-y-2">
        {needsMaterialsConfigurator && product.availableQty > 0 && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor={qtyFieldId} className="text-xs text-muted-foreground">
                Cantitate
              </Label>
              <Input
                id={qtyFieldId}
                type="number"
                min={minQ}
                max={maxQ}
                value={qty}
                onChange={(e) => onQtyChange(Math.min(maxQ, Number(e.target.value) || 0))}
                onBlur={() => onQtyChange(Math.min(maxQ, Math.max(minQ, qty)))}
                className="mt-1 h-11 rounded-xl"
              />
            </div>
          </div>
        )}
        {needsMaterialsConfigurator &&
          product.sellerAssumesTransport &&
          product.transportFee != null &&
          product.transportFee > 0 && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Transport per cursă (înmulțit cu numărul de curse la configurare):{" "}
              <MoneyDisplay
                amount={product.transportFee}
                currency={product.currency}
                className="inline font-semibold text-foreground"
              />
            </p>
          )}
        <Button
          className="h-12 w-full rounded-2xl bg-foreground text-base font-bold text-background shadow-md hover:bg-foreground/90 active:scale-[0.98] transition-all"
          onClick={handleContinueToConfigure}
          disabled={product.availableQty === 0}
        >
          Continua la configurare
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground leading-snug px-1">
          {isConcrete
            ? "Cantitatea, TVA-ul, transportul si oferta finala se stabilesc in calculator si in cos, inainte de comanda."
            : "Alegeti varianta de transport, TVA-ul si totalul se calculeaza la configurare."}
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
              min={minQ}
              max={maxQ}
              value={qty}
              onChange={(e) => onQtyChange(Math.min(maxQ, Number(e.target.value) || 0))}
              onBlur={() => onQtyChange(Math.min(maxQ, Math.max(minQ, qty)))}
              className="mt-1 h-11 rounded-xl"
            />
          </div>
        </div>
      )}
      {!product.sellerAssumesTransport && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Transport organizat de platforma: costul nu este inclus in comanda si se confirma de
          operator (orientativ min. 200 RON / cursa, 12 RON / km, distanta doar dus).
        </p>
      )}
      {product.sellerAssumesTransport && product.transportFee != null && product.transportFee > 0 && (
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
  specsSlot,
  sellerSlot,
}: ProductDetailClientProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  /** Shared between mobile and desktop purchase panels (only one visible per breakpoint). */
  const [purchaseQty, setPurchaseQty] = useState(
    product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1,
  )

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
            <TitleBlock product={product} />
            <PriceHeadline product={product} size="md" />
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
            <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {product.description || "Vânzătorul nu a adăugat o descriere."}
            </p>
          </div>

          {specsSlot}

          <div className="lg:hidden">{sellerSlot}</div>
        </div>

        <div className="hidden space-y-4 lg:block lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <TitleBlock product={product} />
            <PriceHeadline product={product} size="lg" />

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
              Plată prin platformă, proformă pentru fiecare comandă
            </div>
          </div>
          {sellerSlot}
        </div>
      </div>

    </div>
  )
}
