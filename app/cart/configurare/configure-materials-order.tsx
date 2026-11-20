"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { MoneyDisplay } from "@/components/shared/money-display"
import { clearConfigureDraft } from "@/lib/configure-draft"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import type {
  CartItem,
  OrderConfigureBuyerBilling,
  ProductDetail,
} from "@/types/domain"
import type { MaterialCategoryCode } from "@/lib/materials-logistics/catalog"
import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  VEHICLE_LABELS,
  type VehicleCode,
} from "@/lib/materials-logistics/catalog"
import type { MaterialLogisticsSpec } from "@/lib/materials-logistics/engine"
import {
  buyerTransportOptions,
  materialSpecSummary,
  PLATFORM_TRANSPORT_DEFAULTS,
  requiresPalletSection,
} from "@/lib/materials-logistics/engine"

function deliveryComplete(line1: string, city: string, county: string): boolean {
  return (
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    county.trim().length > 0
  )
}

function buildMaterialsCartLine(
  product: ProductDetail,
  qty: number,
  params: {
    totalGross: number
    transportNote: string
    selection: NonNullable<CartItem["configureMaterialsSelection"]>
    delivery: {
      addressLine1: string
      city: string
      county: string
      country: string
      isCompany: boolean
      companyName: string
      vatNumber: string
    }
    billing?: OrderConfigureBuyerBilling
  },
): CartItem {
  const unitPrice = qty > 0 ? params.totalGross / qty : product.price
  return {
    productId: product.id,
    sellerId: product.sellerId,
    name: product.name,
    price: unitPrice,
    unit: product.unit,
    currency: product.currency,
    qty,
    availableQty: product.availableQty,
    thumbnailUrl: product.images[0] ?? "",
    configurationRequired: true,
    configurationComplete: true,
    quoteSummary: {
      totalGross: params.totalGross,
      isManual: false,
      calcType: "MATERIALS_LOGISTICS",
      transportNote: params.transportNote,
    },
    configureDelivery: {
      addressLine1: params.delivery.addressLine1.trim(),
      city: params.delivery.city.trim(),
      county: params.delivery.county.trim(),
      country: params.delivery.country.trim() || "Romania",
      isCompany: params.delivery.isCompany,
      companyName: params.delivery.isCompany
        ? params.delivery.companyName.trim()
        : undefined,
      vatNumber: params.delivery.isCompany
        ? params.delivery.vatNumber.trim()
        : undefined,
    },
    ...(params.billing ? { configureBilling: params.billing } : {}),
    configureMaterialsSelection: params.selection,
  }
}

interface Props {
  product: ProductDetail
  initialQty: number
}

/**
 * Configurare pentru materiale cu logistică (fără calculator CIFA).
 * Colectează cantitatea, variante transport A/B, livrare și fiscal.
 */
export function ConfigureMaterialsOrder({ product, initialQty }: Props) {
  // Hooks must not run after a conditional return: guard here, hooks in the inner component.
  if (!product.materialLogistics) return null
  return (
    <ConfigureMaterialsOrderInner
      product={product}
      ml={product.materialLogistics}
      initialQty={initialQty}
    />
  )
}

function ConfigureMaterialsOrderInner({
  product,
  ml,
  initialQty,
}: Props & { ml: NonNullable<ProductDetail["materialLogistics"]> }) {
  const router = useRouter()
  const { addItem } = useCart()
  const { toast } = useToast()

  const maxQ = Math.max(1, product.availableQty)
  // Seller's minimum order (place_order rejects below it).
  const minQ = Math.min(maxQ, product.minOrderQty && product.minOrderQty > 0 ? product.minOrderQty : 1)
  const [qty, setQty] = useState(() =>
    Math.min(Math.max(minQ, initialQty), maxQ),
  )
  const [palletCountStr, setPalletCountStr] = useState("")
  const [selectedOptionId, setSelectedOptionId] = useState<string>("A")
  const [macaraBuyer, setMacaraBuyer] = useState(false)

  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [county, setCounty] = useState("")
  const [country, setCountry] = useState("Romania")
  const [isCompany, setIsCompany] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [vatNumber, setVatNumber] = useState("")

  const [useAlternateBilling, setUseAlternateBilling] = useState(false)
  const [billingAddressLine1, setBillingAddressLine1] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingCounty, setBillingCounty] = useState("")
  const [billingCountry, setBillingCountry] = useState("Romania")

  const spec: MaterialLogisticsSpec = useMemo(
    () => ({
      categoryCode: ml.categoryCode as MaterialCategoryCode,
      materialCode: ml.materialCode,
      maxPieceLengthM: ml.maxPieceLengthM,
      palletSacKg: ml.palletSacKg,
      palletPieces: ml.palletPieces,
      palletTotalKg: ml.palletTotalKg,
      macaraAddon: ml.macaraAddon,
      macaraFee: ml.macaraFee,
      allowNonBulkTransport: ml.allowNonBulkTransport,
    }),
    [ml],
  )

  const palletCount =
    palletCountStr.trim() === ""
      ? null
      : Math.max(0, Number(palletCountStr)) || null

  const plan = useMemo(
    () =>
      buyerTransportOptions({
        spec,
        sellerOffers: ml.transportOffers.map((o) => ({
          vehicleCode: o.vehicleCode as VehicleCode,
          payloadT: o.payloadT,
        })),
        qty,
        unit: product.unit,
        palletCount,
      }),
    [spec, ml.transportOffers, qty, product.unit, palletCount],
  )

  const selected =
    plan.options.find((o) => o.id === selectedOptionId) ?? plan.options[0]

  useEffect(() => {
    if (plan.options.length === 0) return
    if (!plan.options.some((o) => o.id === selectedOptionId)) {
      setSelectedOptionId(plan.options[0]!.id)
    }
  }, [plan.options, selectedOptionId])

  // Tanker loads: no vehicle in the list; the operator quotes transport and
  // place_order accepts the line without a vehicle. "no_eligible_vehicle" stays
  // blocked (the server would reject it) until the seller fixes the offers.
  const manualTransport = plan.manualReason === "tanker"
  // Seller's per-trip fee is charged only when the seller delivers.
  const sellerDelivers = product.sellerAssumesTransport

  const totals = useMemo(() => {
    if (!selected && !manualTransport) return null
    const materialNet = product.price * qty
    const feePerLeg = sellerDelivers ? (product.transportFee ?? 0) : 0
    const macaraFee =
      macaraBuyer && ml.macaraAddon && !manualTransport ? (ml.macaraFee ?? 0) : 0
    const trips = selected && !manualTransport ? selected.trips : 0
    const transportNet = feePerLeg * trips + macaraFee
    const net = materialNet + transportNet
    const vat = net * product.vatRate
    const totalGross = net + vat
    // Orientation only (06-aprilie tariff); never charged at checkout.
    const platformMinimum =
      !sellerDelivers && trips > 0 ? PLATFORM_TRANSPORT_DEFAULTS.minPerTrip * trips : null
    return { materialNet, transportNet, totalGross, macaraFee, platformMinimum }
  }, [selected, manualTransport, sellerDelivers, product.price, qty, product.transportFee, macaraBuyer, ml])

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

  const canAdd =
    (!!selected || manualTransport) &&
    !!totals &&
    qty >= minQ &&
    qty <= maxQ &&
    deliveryOk &&
    fiscalOk &&
    billingOk

  function handleAddToCart() {
    if (!totals || !canAdd) return

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

    const selection =
      manualTransport || !selected
        ? {
            vehicleCode: "",
            payloadT: 0,
            trips: 0,
            macaraAddon: false,
            palletCount,
            marketplaceAssigned: true,
            manualTransport: true,
          }
        : {
            vehicleCode: selected.vehicleCode,
            payloadT: selected.payloadT,
            trips: selected.trips,
            macaraAddon: macaraBuyer && ml.macaraAddon,
            palletCount,
            marketplaceAssigned: plan.marketplaceAssigned,
          }

    const transportNote = [
      manualTransport
        ? "Transport în cisternă: ofertă manuală de la operator (neinclus)."
        : selected?.description ?? "",
      !manualTransport && plan.marketplaceAssigned ? "(Vehicul propus de platformă)" : "",
      !manualTransport && !sellerDelivers
        ? "Transport organizat de platformă: cost confirmat de operator (neinclus)."
        : "",
      selection.macaraAddon ? `+ Macara ${totals.macaraFee} ${product.currency}` : "",
    ]
      .filter(Boolean)
      .join(" ")

    const line = buildMaterialsCartLine(product, qty, {
      totalGross: totals.totalGross,
      transportNote,
      selection,
      delivery: {
        addressLine1,
        city,
        county,
        country,
        isCompany,
        companyName,
        vatNumber,
      },
      billing: billingPayload,
    })

    const added = addItem(line)
    if (!added.ok && added.reason === "seller_mismatch") {
      toast({
        variant: "destructive",
        title: "Alt vânzător în coș",
        description:
          "Puteți comanda de la un singur vânzător per plată. Finalizați sau goliți coșul.",
      })
      return
    }
    clearConfigureDraft()
    router.push("/cart")
  }

  const showPallet = requiresPalletSection(spec)

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
            Configurare materiale
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.name} · {materialSpecSummary(spec)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {MATERIAL_CATEGORY_LABELS[spec.categoryCode]} —{" "}
            {MATERIAL_LABELS[spec.materialCode] ?? spec.materialCode}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <Link href={`/products/${product.slug}-${product.id}`}>
            Înapoi la produs
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Cantitate și transport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="mqty">Cantitate ({product.unit})</Label>
                  <Input
                    id="mqty"
                    type="number"
                    min={minQ}
                    max={maxQ}
                    step="any"
                    value={qty}
                    // Clamp the minimum on blur so typing "15" over a minimum of 13 works.
                    onChange={(e) => setQty(Math.min(maxQ, Number(e.target.value) || 0))}
                    onBlur={() => setQty((q) => Math.min(maxQ, Math.max(minQ, q)))}
                    className="mt-1 rounded-xl"
                  />
                  {minQ > 1 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Comandă minimă: {minQ} {product.unit}
                    </p>
                  )}
                </div>
                {showPallet && (
                  <div>
                    <Label htmlFor="palletc">Număr paleți (opțional)</Label>
                    <Input
                      id="palletc"
                      type="number"
                      min={0}
                      step={1}
                      value={palletCountStr}
                      onChange={(e) => setPalletCountStr(e.target.value)}
                      className="mt-1 rounded-xl"
                      placeholder="ex: 10"
                    />
                  </div>
                )}
              </div>

              {plan.manualReason === "tanker" ? (
                <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                  Material vrac: se livrează în cisternă / siloz. Transportul nu este inclus;
                  operatorul platformei vă trimite oferta după plasarea comenzii.
                </p>
              ) : plan.options.length === 0 ? (
                <p className="text-sm text-destructive">
                  Nu există vehicule legale pentru acest material (tip / lungime). Contactați
                  vânzătorul pentru o ofertă de transport.
                </p>
              ) : (
                <RadioGroup
                  value={selectedOptionId}
                  onValueChange={setSelectedOptionId}
                  className="space-y-3"
                >
                  {plan.options.map((o) => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3 has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value={o.id} id={`opt-${o.id}`} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.label}</p>
                        <p className="text-xs text-muted-foreground">{o.description}</p>
                        <p className="mt-1 text-xs font-medium">
                          {VEHICLE_LABELS[o.vehicleCode]} · {o.payloadT}t ·{" "}
                          {o.trips} cursă/o
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {!manualTransport && !sellerDelivers && (
                <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  Transport organizat de platformă: nu este inclus în total. Operatorul confirmă
                  prețul (orientativ min. {PLATFORM_TRANSPORT_DEFAULTS.minPerTrip} RON / cursă,{" "}
                  {PLATFORM_TRANSPORT_DEFAULTS.ratePerKm} RON / km, distanța doar dus).
                </p>
              )}

              {ml.macaraAddon && !manualTransport && (
                <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Macara la descărcare</p>
                    <p className="text-xs text-muted-foreground">
                      Taxă suplimentară:{" "}
                      <MoneyDisplay
                        amount={ml.macaraFee ?? 0}
                        currency={product.currency}
                        className="inline font-semibold"
                      />
                    </p>
                  </div>
                  <Switch checked={macaraBuyer} onCheckedChange={setMacaraBuyer} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Livrare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="m-addr1">Adresă livrare</Label>
                <Input
                  id="m-addr1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="mt-1 rounded-xl"
                  placeholder="Stradă, număr"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="m-city">Localitate</Label>
                  <Input
                    id="m-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="m-county">Județ</Label>
                  <Input
                    id="m-county"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="mt-1 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="m-country">Țară</Label>
                <Input
                  id="m-country"
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
                  <p className="text-xs text-muted-foreground">Facturare pe firmă</p>
                </div>
                <Switch checked={isCompany} onCheckedChange={setIsCompany} />
              </div>
              {isCompany && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="m-co">Denumire firmă</Label>
                    <Input
                      id="m-co"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1 rounded-xl"
                      required={isCompany}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="m-vat">CUI / TVA</Label>
                    <Input
                      id="m-vat"
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
                  <p className="text-sm font-medium">Altă adresă pentru facturare</p>
                </div>
                <Switch
                  checked={useAlternateBilling}
                  onCheckedChange={setUseAlternateBilling}
                />
              </div>
              {useAlternateBilling && (
                <div className="space-y-4 border-t border-border/60 pt-4">
                  <div>
                    <Label htmlFor="mb-addr">Adresă facturare</Label>
                    <Input
                      id="mb-addr"
                      value={billingAddressLine1}
                      onChange={(e) => setBillingAddressLine1(e.target.value)}
                      className="mt-1 rounded-xl"
                      required={useAlternateBilling}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="mb-city">Localitate</Label>
                      <Input
                        id="mb-city"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="mt-1 rounded-xl"
                        required={useAlternateBilling}
                      />
                    </div>
                    <div>
                      <Label htmlFor="mb-county">Județ</Label>
                      <Input
                        id="mb-county"
                        value={billingCounty}
                        onChange={(e) => setBillingCounty(e.target.value)}
                        className="mt-1 rounded-xl"
                        required={useAlternateBilling}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="mb-country">Țară</Label>
                    <Input
                      id="mb-country"
                      value={billingCountry}
                      onChange={(e) => setBillingCountry(e.target.value)}
                      className="mt-1 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Revizuire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {totals && (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Materiale</span>
                    <MoneyDisplay
                      amount={totals.materialNet}
                      currency={product.currency}
                      className="font-medium"
                    />
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {sellerDelivers && !manualTransport ? "Transport" : "Transport inclus"}
                    </span>
                    <MoneyDisplay
                      amount={totals.transportNet}
                      currency={product.currency}
                      className="font-medium"
                    />
                  </div>
                  {(manualTransport || !sellerDelivers) && (
                    <p className="text-xs text-muted-foreground">
                      + transport de confirmat de operator
                      {totals.platformMinimum != null
                        ? ` (minim orientativ ${totals.platformMinimum} RON fără TVA)`
                        : ""}
                    </p>
                  )}
                  <div className="flex justify-between gap-2 border-t border-border/50 pt-2 text-base font-semibold">
                    <span>Total cu TVA</span>
                    <MoneyDisplay
                      amount={totals.totalGross}
                      currency={product.currency}
                    />
                  </div>
                </>
              )}
              {!deliveryOk && (
                <p className="text-xs text-muted-foreground">
                  Completați adresa de livrare.
                </p>
              )}
              {!fiscalOk && (
                <p className="text-xs text-muted-foreground">
                  Completați datele firmei.
                </p>
              )}
              {useAlternateBilling && !billingOk && (
                <p className="text-xs text-muted-foreground">
                  Completați adresa de facturare.
                </p>
              )}
              <Button
                type="button"
                size="lg"
                className="w-full rounded-2xl"
                disabled={!canAdd}
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
      </div>
    </div>
  )
}
