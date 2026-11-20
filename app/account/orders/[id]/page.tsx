import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatMoney } from "@/components/shared/money-display"
import { ArrowLeft, Receipt } from "lucide-react"
import { getOrderDetail } from "@/lib/api/orders"
import { getPlacedOrderById } from "@/lib/api/order-payload"
import { getOrderViewerRole } from "@/lib/api/order-viewer"
import { DevizPdfDownload } from "@/components/checkout/deviz-pdf-download"
import { TransportPanel } from "@/components/orders/transport-panel"
import { PayButton } from "@/components/orders/pay-button"
import { allowedProformaCopies } from "@/lib/checkout/proforma"
import type { Currency } from "@/types/domain"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

const COPY_LABEL = { buyer: "Proformă cumpărător", seller: "Proformă furnizor", platform: "Proformă intermediar" } as const

export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const [order, placed] = await Promise.all([getOrderDetail(id), getPlacedOrderById(id)])
  if (!order || !placed) notFound()
  const role = await getOrderViewerRole(placed)
  if (!role) notFound()

  const cur = placed.currency as Currency
  const m = (cents: number) => formatMoney(cents / 100, cur)
  const vatPct = Math.round((placed.vat_rate ?? 0.19) * 100)
  // Sellers see their own prices; buyers and the platform see buyer prices (commission included).
  const sellerView = role === "seller"
  const copies = allowedProformaCopies(role)
  const canPayOrder = role === "buyer" && placed.payment_status === "pending" && placed.status !== "cancelled"

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/account?tab=orders"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la cont
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comanda {placed.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(placed.created_at).toLocaleString("ro-RO")}
            {placed.payment_due_at ? ` · scadență ${new Date(placed.payment_due_at).toLocaleDateString("ro-RO")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {sp.payment === "success" && (
        <p className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          Plata a fost trimisă. Statusul se actualizează automat după confirmarea procesatorului.
        </p>
      )}
      {sp.payment === "cancelled" && (
        <p className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          Plata a fost anulată. Poți încerca din nou mai jos.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {copies.map((c) => (
          <Button key={c} variant="outline" size="sm" asChild>
            <Link href={`/account/orders/${placed.id}/deviz?copy=${c}`}>
              <Receipt className="mr-2 h-4 w-4" />
              {COPY_LABEL[c]}
            </Link>
          </Button>
        ))}
        <DevizPdfDownload order={placed} copy={copies[0]} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Produse comandate</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produs</TableHead>
                  <TableHead>Cantitate</TableHead>
                  <TableHead>Preț unitar</TableHead>
                  <TableHead className="text-right">Valoare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placed.lines.map((l) => {
                  const goods = l.line_total_cents - l.transport_cents + (sellerView ? 0 : (l.commission_cents ?? 0))
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.title}</TableCell>
                      <TableCell>{l.qty.toLocaleString("ro-RO")} {l.unit}</TableCell>
                      <TableCell className="tabular-nums">{m(l.qty > 0 ? Math.round(goods / l.qty) : goods)}</TableCell>
                      <TableCell className="text-right tabular-nums">{m(goods)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {placed.transport && (
          <TransportPanel
            orderId={placed.id}
            role={role}
            transport={placed.transport}
            events={placed.transport_events}
            currency={cur}
            orderStatus={placed.status}
          />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Adresa de livrare</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{order.shippingAddress.line1}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.county}
                </p>
                <p className="text-muted-foreground">{order.shippingAddress.country}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{sellerView ? "Sumar vânzare" : "Sumar plată"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {sellerView ? (
                <>
                  <Row label="Produse" value={m(placed.subtotal_cents)} />
                  <Row label="Transport" value={m(placed.transport_cents)} />
                  <Row label={`TVA ${vatPct}%`} value={m(placed.seller_vat_cents ?? placed.vat_cents)} />
                  <Total
                    label="Total furnizor"
                    value={m(placed.subtotal_cents + placed.transport_cents + (placed.seller_vat_cents ?? placed.vat_cents))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comisionul platformei ({Math.round((placed.commission_rate ?? 0) * 100)}%) este plătit de cumpărător
                    și nu se scade din suma ta.
                  </p>
                </>
              ) : (
                <>
                  <Row label="Produse" value={m(placed.subtotal_cents + (placed.commission_cents ?? 0))} />
                  <Row label="Transport" value={m(placed.transport_cents)} />
                  <Row label={`TVA ${vatPct}%`} value={m(placed.vat_cents)} />
                  <Total label="Total" value={m(placed.total_cents)} />
                  {role === "admin" && (
                    <p className="text-xs text-muted-foreground">
                      Comision platformă {m(placed.commission_cents ?? 0)} + TVA {m(placed.platform_vat_cents ?? 0)} · de
                      virat furnizorului{" "}
                      {m(placed.subtotal_cents + placed.transport_cents + (placed.seller_vat_cents ?? placed.vat_cents))}
                    </p>
                  )}
                </>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Status plată</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              {canPayOrder && <PayButton purpose="order" refId={placed.id} label="Plătește comanda" className="pt-2" />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-t pt-2">
      <span className="text-base font-bold text-foreground">{label}</span>
      <span className="text-base font-bold tabular-nums text-foreground">{value}</span>
    </div>
  )
}
