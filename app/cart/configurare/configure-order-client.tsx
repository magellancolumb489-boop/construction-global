"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import PriceCalculator, {
  type FlowQuoteSnapshot,
} from "@/components/shared/calc-price"
import { useCart } from "@/lib/cart-context"
import {
  clearConfigureDraft,
  readConfigureDraft,
  type ConfigureDraftV1,
} from "@/lib/configure-draft"
import type { CartItem, ProductDetail } from "@/types/domain"
import { ShoppingCart } from "lucide-react"

function deliveryComplete(
  line1: string,
  city: string,
  county: string,
): boolean {
  return (
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    county.trim().length > 0
  )
}

function buildCartLine(
  product: ProductDetail,
  snap: FlowQuoteSnapshot,
  delivery: {
    addressLine1: string
    city: string
    county: string
    country: string
    isCompany: boolean
    companyName: string
    vatNumber: string
  },
): CartItem {
  const qty = Math.max(1, snap.currentQuantity)
  const total = snap.result.total_gross
  const unitPrice =
    total != null && qty > 0 ? total / qty : product.price

  return {
    productId: product.id,
    name: product.name,
    price: unitPrice,
    unit: product.unit,
    currency: product.currency,
    qty,
    availableQty: product.availableQty,
    thumbnailUrl: product.thumbnailUrl,
    configurationRequired: true,
    configurationComplete: true,
    quoteSummary: {
      totalGross: total ?? 0,
      isManual: snap.result.is_manual,
      calcType: snap.calcType,
      transportNote: snap.result.transport_description,
    },
    configureDelivery: {
      addressLine1: delivery.addressLine1.trim(),
      city: delivery.city.trim(),
      county: delivery.county.trim(),
      country: delivery.country.trim() || "Romania",
      isCompany: delivery.isCompany,
      companyName: delivery.isCompany
        ? delivery.companyName.trim()
        : undefined,
      vatNumber: delivery.isCompany ? delivery.vatNumber.trim() : undefined,
    },
  }
}

export function ConfigureOrderClient() {
  const router = useRouter()
  const { addItem } = useCart()
  const [draft, setDraft] = useState<ConfigureDraftV1 | null>(null)
  const [quoteSnap, setQuoteSnap] = useState<FlowQuoteSnapshot | null>(null)

  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [county, setCounty] = useState("")
  const [country, setCountry] = useState("Romania")
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [vatNumber, setVatNumber] = useState("")

  useEffect(() => {
    const d = readConfigureDraft()
    if (!d) {
      router.replace("/marketplace")
      return
    }
    setDraft(d)
  }, [router])

  const onQuoteUpdate = useCallback((s: FlowQuoteSnapshot) => {
    setQuoteSnap((prev) => {
      if (
        prev &&
        prev.result.is_valid === s.result.is_valid &&
        prev.result.is_manual === s.result.is_manual &&
        prev.result.total_gross === s.result.total_gross &&
        prev.calcType === s.calcType &&
        prev.currentQuantity === s.currentQuantity &&
        prev.deliveryAddress === s.deliveryAddress &&
        prev.vatRatePercent === s.vatRatePercent &&
        prev.result.validation_issues?.length ===
          s.result.validation_issues?.length
      ) {
        return prev
      }
      return s
    })
  }, [])

  const fiscalOk = useMemo(() => {
    if (!isCompany) return true
    return companyName.trim().length > 0 && vatNumber.trim().length > 0
  }, [isCompany, companyName, vatNumber])

  const deliveryOk = useMemo(
    () => deliveryComplete(addressLine1, city, county),
    [addressLine1, city, county],
  )

  const canAddToCart = useMemo(() => {
    if (!draft || !quoteSnap) return false
    if (!quoteSnap.result.is_valid) return false
    if (!deliveryOk || !fiscalOk) return false
    return true
  }, [draft, quoteSnap, deliveryOk, fiscalOk])

  function handleAddToCart() {
    if (!draft || !quoteSnap || !canAddToCart) return
    const line = buildCartLine(draft.product, quoteSnap, {
      addressLine1,
      city,
      county,
      country,
      isCompany,
      companyName,
      vatNumber,
    })
    addItem(line)
    clearConfigureDraft()
    router.push("/cart")
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-muted-foreground">
        Se încarcă…
      </div>
    )
  }

  const { product, qty } = draft

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Magazin", href: "/marketplace" },
          { label: "Coș", href: "/cart" },
          { label: "Configurare comandă" },
        ]}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Configurare comandă
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Produs:{" "}
            <span className="font-medium text-foreground">{product.name}</span>{" "}
            — cantitate inițială: {qty} {product.unit}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vânzător:{" "}
            <span className="font-medium text-foreground">
              {product.sellerDisplayName?.trim() || "—"}
            </span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href={`/products/${product.slug}-${product.id}`}>
            Înapoi la produs
          </Link>
        </Button>
      </div>

      <PriceCalculator
        mode="flow"
        initialProduct={product}
        initialQty={qty}
        onFlowQuoteUpdate={onQuoteUpdate}
        flowFooter={
          <div className="flex w-full max-w-3xl flex-col gap-4">
            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Livrare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="addr1">Adresă livrare</Label>
                  <Input
                    id="addr1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="mt-1 rounded-xl"
                    placeholder="Stradă, număr"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">Localitate</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="county">Județ</Label>
                    <Input
                      id="county"
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Țară</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Tip cumpărător</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Persoană juridică</p>
                    <p className="text-xs text-muted-foreground">
                      Facturare pe firmă (CUI / TVA)
                    </p>
                  </div>
                  <Switch checked={isCompany} onCheckedChange={setIsCompany} />
                </div>
                {isCompany && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="co">Denumire firmă</Label>
                      <Input
                        id="co"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1 rounded-xl"
                        required={isCompany}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="vat">CUI / TVA</Label>
                      <Input
                        id="vat"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        className="mt-1 rounded-xl"
                        required={isCompany}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Revizuire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!quoteSnap && (
                  <p className="text-muted-foreground">
                    Completați calculatorul pentru a vedea totalul estimat.
                  </p>
                )}
                {quoteSnap && !quoteSnap.result.is_valid && (
                  <p className="text-destructive">
                    Oferta nu este validă încă — corectați câmpurile marcate în
                    calculator.
                  </p>
                )}
                {quoteSnap?.result.is_valid && quoteSnap.result.is_manual && (
                  <p className="text-amber-800 dark:text-amber-200">
                    Transport manual sau parțial: totalul poate să nu includă
                    toate costurile de cursă. Veți vedea acest mesaj și în coș.
                  </p>
                )}
                {quoteSnap?.result.is_valid && !deliveryOk && (
                  <p className="text-muted-foreground">
                    Completați adresa de livrare pentru a continua.
                  </p>
                )}
                {quoteSnap?.result.is_valid && deliveryOk && !fiscalOk && (
                  <p className="text-muted-foreground">
                    Completați datele firmei pentru facturare.
                  </p>
                )}
                <Button
                  type="button"
                  size="lg"
                  className="w-full rounded-2xl"
                  disabled={!canAddToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adaugă în coș
                </Button>
                <Button variant="ghost" className="w-full rounded-xl" asChild>
                  <Link href="/cart">Renunță — mergi la coș</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      />
    </div>
  )
}
