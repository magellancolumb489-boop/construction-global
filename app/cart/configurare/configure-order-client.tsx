"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  saveConfigureDraft,
  type ConfigureDraftV1,
} from "@/lib/configure-draft"
import { refreshProductDetailForConfigureAction } from "@/app/cart/configurare/actions"
import type {
  CartItem,
  OrderConfigureBuyerBilling,
  ProductDetail,
} from "@/types/domain"
import { ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  /** When set, invoice uses this address instead of livrare. */
  billing: OrderConfigureBuyerBilling | undefined,
): CartItem {
  const qty = Math.max(1, snap.currentQuantity)
  const total = snap.result.total_gross
  const unitPrice =
    total != null && qty > 0 ? total / qty : product.price

  return {
    productId: product.id,
    sellerId: product.sellerId,
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
    ...(billing
      ? {
          configureBilling: billing,
        }
      : {}),
    ...(snap.concreteSelection
      ? { configureConcreteSelection: snap.concreteSelection }
      : {}),
  }
}

export function ConfigureOrderClient() {
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()
  const [draft, setDraft] = useState<ConfigureDraftV1 | null>(null)
  const [quoteSnap, setQuoteSnap] = useState<FlowQuoteSnapshot | null>(null)

  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [county, setCounty] = useState("")
  const [country, setCountry] = useState("Romania")
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [vatNumber, setVatNumber] = useState("")

  /** Facturare la adresă diferită de livrare */
  const [useAlternateBilling, setUseAlternateBilling] = useState(false)
  const [billingAddressLine1, setBillingAddressLine1] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingCounty, setBillingCounty] = useState("")
  const [billingCountry, setBillingCountry] = useState("Romania")

  /** Per-field refs: opresc suprascrierea automată după prima editare manuală. */
  const deliveryLine1UserEditedRef = useRef(false)
  const deliveryCityUserEditedRef = useRef(false)
  const deliveryCountyUserEditedRef = useRef(false)
  const deliveryCountryUserEditedRef = useRef(false)

  /** Previne afișarea repetată a notificării de tip toast. */
  const nudgeShownRef = useRef(false)

  /** Refs facturare: una per câmp, se blochează la prima editare manuală. */
  const billingLine1UserEditedRef = useRef(false)
  const billingCityUserEditedRef = useRef(false)
  const billingCountyUserEditedRef = useRef(false)
  const billingCountryUserEditedRef = useRef(false)

  /** Evită bucle infinite dacă reîncărcarea nu aduce nume (produs sau eroare). */
  const sellerHydrateAttemptedRef = useRef<string | null>(null)

  useEffect(() => {
    const d = readConfigureDraft()
    if (!d) {
      router.replace("/marketplace")
      return
    }
    setDraft(d)
  }, [router])

  // Reîmprospătează produsul de pe server când ciorna din sessionStorage nu are nume vânzător.
  useEffect(() => {
    if (!draft?.product?.slug) return
    const p = draft.product
    const hasSellerName =
      Boolean(p.sellerDisplayName?.trim()) ||
      Boolean(p.sellerCompanyName?.trim())
    if (hasSellerName) return

    const attemptKey = `${p.id}:${p.slug}`
    if (sellerHydrateAttemptedRef.current === attemptKey) return
    sellerHydrateAttemptedRef.current = attemptKey

    let cancelled = false
    void (async () => {
      const res = await refreshProductDetailForConfigureAction(p.slug)
      if (cancelled || !res.ok) return
      setDraft((prev) => {
        if (!prev || prev.product.id !== res.product.id) return prev
        const next: ConfigureDraftV1 = { ...prev, product: res.product }
        saveConfigureDraft(res.product, prev.qty)
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [draft])

  const onQuoteUpdate = useCallback((s: FlowQuoteSnapshot) => {
    setQuoteSnap((prev) => {
      const sameConcrete =
        prev?.concreteSelection === s.concreteSelection ||
        (prev?.concreteSelection &&
          s.concreteSelection &&
          prev.concreteSelection.classCode === s.concreteSelection.classCode &&
          prev.concreteSelection.consistency ===
            s.concreteSelection.consistency &&
          prev.concreteSelection.unitPrice === s.concreteSelection.unitPrice)
      if (
        prev &&
        prev.result.is_valid === s.result.is_valid &&
        prev.result.is_manual === s.result.is_manual &&
        prev.result.total_gross === s.result.total_gross &&
        prev.calcType === s.calcType &&
        prev.currentQuantity === s.currentQuantity &&
        prev.deliveryAddress === s.deliveryAddress &&
        prev.deliveryParts === s.deliveryParts &&
        prev.vatRatePercent === s.vatRatePercent &&
        prev.result.validation_issues?.length ===
          s.result.validation_issues?.length &&
        sameConcrete
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

  const billingOk = useMemo(() => {
    if (!useAlternateBilling) return true
    return deliveryComplete(billingAddressLine1, billingCity, billingCounty)
  }, [
    useAlternateBilling,
    billingAddressLine1,
    billingCity,
    billingCounty,
  ])

  // Autofill câmpuri Livrare din sugestia selectată în pasul 3.
  // Fiecare câmp se completează o singură dată; dacă utilizatorul editează manual,
  // ref-ul corespunzător blochează suprascrierea ulterioară.
  useEffect(() => {
    const parts = quoteSnap?.deliveryParts
    if (parts) {
      if (!deliveryLine1UserEditedRef.current && !addressLine1.trim() && parts.street) {
        setAddressLine1(parts.street)
      }
      if (!deliveryCityUserEditedRef.current && !city.trim() && parts.city) {
        setCity(parts.city)
      }
      if (!deliveryCountyUserEditedRef.current && !county.trim() && parts.county) {
        setCounty(parts.county)
      }
      if (!deliveryCountryUserEditedRef.current && parts.country) {
        setCountry(parts.country)
      }
      return
    }
    // Nicio sugestie selectată — afișează un singur toast de îndrumare
    // odată ce calculatorul produce un rezultat valid cu o adresă introdusă.
    if (
      !nudgeShownRef.current &&
      quoteSnap?.result.is_valid &&
      quoteSnap.deliveryAddress.trim().length > 0
    ) {
      nudgeShownRef.current = true
      toast({
        title: "Selectați o sugestie de adresă",
        description:
          "Așteptați câteva secunde și alegeți o sugestie din lista de adrese — completăm automat strada, localitatea și județul mai jos.",
      })
    }
  }, [
    quoteSnap?.deliveryParts,
    quoteSnap?.result.is_valid,
    quoteSnap?.deliveryAddress,
    addressLine1,
    city,
    county,
    toast,
  ])

  // Când utilizatorul activează facturare la adresă diferită, pre-completează
  // câmpurile cu adresa de livrare (o singură dată per câmp needictat).
  useEffect(() => {
    if (!useAlternateBilling) return
    if (!billingLine1UserEditedRef.current && !billingAddressLine1.trim() && addressLine1.trim()) {
      setBillingAddressLine1(addressLine1)
    }
    if (!billingCityUserEditedRef.current && !billingCity.trim() && city.trim()) {
      setBillingCity(city)
    }
    if (!billingCountyUserEditedRef.current && !billingCounty.trim() && county.trim()) {
      setBillingCounty(county)
    }
    if (!billingCountryUserEditedRef.current && !billingCountry.trim() && country.trim()) {
      setBillingCountry(country)
    }
  }, [useAlternateBilling, addressLine1, city, county, country, billingAddressLine1, billingCity, billingCounty, billingCountry])

  const canAddToCart = useMemo(() => {
    if (!draft || !quoteSnap) return false
    if (!quoteSnap.result.is_valid) return false
    if (!deliveryOk || !fiscalOk || !billingOk) return false
    return true
  }, [draft, quoteSnap, deliveryOk, fiscalOk, billingOk])

  function handleAddToCart() {
    if (!draft || !quoteSnap || !canAddToCart) return
    const billingPayload: OrderConfigureBuyerBilling | undefined =
      useAlternateBilling
        ? {
            addressLine1: billingAddressLine1.trim(),
            city: billingCity.trim(),
            county: billingCounty.trim(),
            country: billingCountry.trim() || "Romania",
            isCompany,
            companyName: isCompany ? companyName.trim() : undefined,
            vatNumber: isCompany ? vatNumber.trim() : undefined,
          }
        : undefined
    const line = buildCartLine(
      draft.product,
      quoteSnap,
      {
        addressLine1,
        city,
        county,
        country,
        isCompany,
        companyName,
        vatNumber,
      },
      billingPayload,
    )
    // Un singur vânzător per coș — mesaj clar dacă utilizatorul are deja alt furnizor.
    const added = addItem(line)
    if (!added.ok && added.reason === "seller_mismatch") {
      toast({
        variant: "destructive",
        title: "Alt vânzător în coș",
        description:
          "Puteți comanda de la un singur vânzător per plată. Finalizați sau goliți coșul, apoi reveniți la acest anunț.",
      })
      return
    }
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
              {product.sellerCompanyName?.trim() ||
                product.sellerDisplayName?.trim() ||
                "—"}
            </span>
            {product.sellerCompanyName?.trim() &&
              product.sellerDisplayName?.trim() &&
              product.sellerCompanyName.trim() !==
                product.sellerDisplayName.trim() && (
                <span className="block text-xs font-normal text-muted-foreground">
                  {product.sellerDisplayName.trim()}
                </span>
              )}
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
                    onChange={(e) => {
                      deliveryLine1UserEditedRef.current = true
                      setAddressLine1(e.target.value)
                    }}
                    className="mt-1 rounded-xl"
                    placeholder="Stradă, număr"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completat automat din sugestia selectată în pasul 3. Poți edita oricând.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">Localitate</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => {
                        deliveryCityUserEditedRef.current = true
                        setCity(e.target.value)
                      }}
                      className="mt-1 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="county">Județ</Label>
                    <Input
                      id="county"
                      value={county}
                      onChange={(e) => {
                        deliveryCountyUserEditedRef.current = true
                        setCounty(e.target.value)
                      }}
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
                    onChange={(e) => {
                      deliveryCountryUserEditedRef.current = true
                      setCountry(e.target.value)
                    }}
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

            <Card className="rounded-2xl border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Facturare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Folosește altă adresă pentru facturare
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Implicit, factura folosește adresa de livrare de mai sus.
                    </p>
                  </div>
                  <Switch
                    checked={useAlternateBilling}
                    onCheckedChange={setUseAlternateBilling}
                  />
                </div>
                {useAlternateBilling && (
                  <div className="space-y-4 border-t border-border/60 pt-4">
                    <div>
                      <Label htmlFor="bill-addr1">Adresă facturare</Label>
                      <Input
                        id="bill-addr1"
                        value={billingAddressLine1}
                        onChange={(e) => {
                          billingLine1UserEditedRef.current = true
                          setBillingAddressLine1(e.target.value)
                        }}
                        className="mt-1 rounded-xl"
                        placeholder="Stradă, număr"
                        required={useAlternateBilling}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="bill-city">Localitate</Label>
                        <Input
                          id="bill-city"
                          value={billingCity}
                          onChange={(e) => {
                            billingCityUserEditedRef.current = true
                            setBillingCity(e.target.value)
                          }}
                          className="mt-1 rounded-xl"
                          required={useAlternateBilling}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bill-county">Județ</Label>
                        <Input
                          id="bill-county"
                          value={billingCounty}
                          onChange={(e) => {
                            billingCountyUserEditedRef.current = true
                            setBillingCounty(e.target.value)
                          }}
                          className="mt-1 rounded-xl"
                          required={useAlternateBilling}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bill-country">Țară</Label>
                      <Input
                        id="bill-country"
                        value={billingCountry}
                        onChange={(e) => {
                          billingCountryUserEditedRef.current = true
                          setBillingCountry(e.target.value)
                        }}
                        className="mt-1 rounded-xl"
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
                {quoteSnap?.result.is_valid &&
                  deliveryOk &&
                  fiscalOk &&
                  useAlternateBilling &&
                  !billingOk && (
                    <p className="text-muted-foreground">
                      Completați adresa de facturare (toate câmpurile obligatorii).
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
