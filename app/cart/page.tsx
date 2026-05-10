"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { MoneyDisplay } from "@/components/shared/money-display"
import { EmptyState } from "@/components/shared/empty-state"
import { CONSISTENCY_LABELS } from "@/lib/listing-wizard-types"
import { VEHICLE_LABELS, type VehicleCode } from "@/lib/materials-logistics/catalog"
import { useCart } from "@/lib/cart-context"

export default function CartPage() {
  const { items, updateQty, removeItem, totalPrice, clearCart } = useCart()

  const checkoutBlocked = useMemo(
    () =>
      items.some(
        (i) =>
          i.configurationRequired === true &&
          i.configurationComplete !== true,
      ),
    [items],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Cos de cumparaturi" }]} />
      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Cos de cumparaturi
      </h1>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Cosul este gol"
          description="Adauga produse din magazin pentru a continua."
          actionLabel="Mergi la magazin"
          actionHref="/marketplace"
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.productId}>
                <CardContent className="flex gap-4 p-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {item.name}
                      </h3>
                      {item.configureConcreteSelection && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Beton: {item.configureConcreteSelection.classCode} ·{" "}
                          {item.configureConcreteSelection.consistency in
                          CONSISTENCY_LABELS
                            ? CONSISTENCY_LABELS[
                                item.configureConcreteSelection
                                  .consistency as keyof typeof CONSISTENCY_LABELS
                              ]
                            : item.configureConcreteSelection.consistency}{" "}
                          (
                          <MoneyDisplay
                            amount={item.configureConcreteSelection.unitPrice}
                            currency={item.configureConcreteSelection.currency}
                            className="inline"
                          />
                          /{item.configureConcreteSelection.unit})
                        </p>
                      )}
                      {item.configureMaterialsSelection && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Transport:{" "}
                          {VEHICLE_LABELS[item.configureMaterialsSelection.vehicleCode as VehicleCode]}{" "}
                          {item.configureMaterialsSelection.payloadT}t ·{" "}
                          {item.configureMaterialsSelection.trips} cursă
                          {item.configureMaterialsSelection.marketplaceAssigned
                            ? " · propus platformă"
                            : ""}
                          {item.configureMaterialsSelection.macaraAddon ? " · +macara" : ""}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        <MoneyDisplay amount={item.price} currency={item.currency} />{" "}
                        / {item.unit}
                      </p>
                      {item.quoteSummary && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.quoteSummary.isManual ? (
                            <Badge
                              variant="outline"
                              className="rounded-md border-amber-300 bg-amber-50 text-amber-900 text-[10px]"
                            >
                              Transport manual / parțial
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-900 text-[10px]"
                            >
                              Ofertă calculată
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            Total estimat cu TVA:{" "}
                            <MoneyDisplay
                              amount={item.quoteSummary.totalGross}
                              currency={item.currency}
                              className="inline font-medium text-foreground"
                            />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                          disabled={item.qty <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={item.availableQty}
                          value={item.qty}
                          onChange={(e) =>
                            updateQty(item.productId, Number(e.target.value) || 1)
                          }
                          className="h-8 w-16 text-center text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQty(item.productId, item.qty + 1)}
                          disabled={item.qty >= item.availableQty}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="ml-auto text-right">
                        <MoneyDisplay
                          amount={item.price * item.qty + (item.transportFee ?? 0)}
                          currency={item.currency}
                          className="font-bold text-card-foreground"
                        />
                        {(item.transportFee ?? 0) > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            inclus transport fix
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={clearCart}
            >
              Goleste cosul
            </Button>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Sumar comanda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Produse ({items.length})
                  </span>
                  <MoneyDisplay
                    amount={totalPrice}
                    currency="RON"
                    className="font-semibold text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Livrare</span>
                  <span className="text-sm text-muted-foreground">
                    {items.some((i) => i.quoteSummary?.isManual)
                      ? "Parțială — verificați oferta"
                      : "Inclusă în linii (estimativ)"}
                  </span>
                </div>
                {checkoutBlocked && (
                  <p className="text-sm text-destructive">
                    Unele produse necesită configurare înainte de plată.
                  </p>
                )}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">Total</span>
                    <MoneyDisplay
                      amount={totalPrice}
                      currency="RON"
                      className="text-lg font-bold text-foreground"
                    />
                  </div>
                </div>
                {checkoutBlocked ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled
                  >
                    Continua la plata
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link href="/checkout">
                      Continua la plata
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
