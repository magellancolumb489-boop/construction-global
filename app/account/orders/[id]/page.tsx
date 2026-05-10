import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay, formatMoney } from "@/components/shared/money-display"
import { ArrowLeft, FileText, Receipt } from "lucide-react"
import { getOrderDetail } from "@/lib/api/orders"
import { getPlacedOrderById } from "@/lib/api/order-payload"
import { DevizPdfDownload } from "@/components/checkout/deviz-pdf-download"
import type { Currency } from "@/types/domain"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

// Server component: fetch the order summary + the rich placed-order shape (so
// the PDF download button has the same payload as the freshly-placed flow).
export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const [order, placed] = await Promise.all([
    getOrderDetail(id),
    getPlacedOrderById(id),
  ])

  if (!order) notFound()

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
          <h1 className="text-2xl font-bold text-foreground">
            Comandă{" "}
            <span className="font-mono text-base text-muted-foreground">
              #{order.id.slice(0, 8)}…
            </span>
          </h1>
          {placed?.order_number && (
            <p className="mt-1 text-sm text-muted-foreground">
              {placed.order_number}
              {placed.deviz_number ? ` · Deviz ${placed.deviz_number}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {placed && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/account/orders/${order.id}/deviz`}>
                <Receipt className="mr-2 h-4 w-4" />
                Vezi deviz
              </Link>
            </Button>
            <DevizPdfDownload order={placed} />
          </>
        )}
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
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.qty} {item.unit}
                    </TableCell>
                    <TableCell>
                      <MoneyDisplay amount={item.price} currency={item.currency} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyDisplay
                        amount={item.price * item.qty}
                        currency={item.currency}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                <p className="text-muted-foreground">
                  {order.shippingAddress.country}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Sumar plată</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {placed && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-foreground">
                      {formatMoney(
                        placed.subtotal_cents / 100,
                        placed.currency as Currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Transport</span>
                    <span className="tabular-nums text-foreground">
                      {formatMoney(
                        placed.transport_cents / 100,
                        placed.currency as Currency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>TVA 19%</span>
                    <span className="tabular-nums text-foreground">
                      {formatMoney(
                        placed.vat_cents / 100,
                        placed.currency as Currency,
                      )}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-base font-bold text-foreground">Total</span>
                <MoneyDisplay
                  amount={order.total}
                  currency={order.currency}
                  className="text-base font-bold text-foreground"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Status plată</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              {order.receiptUrl && (
                <Button variant="outline" className="mt-2 w-full" asChild>
                  <a href={order.receiptUrl}>
                    <FileText className="mr-2 h-4 w-4" /> Descarcă factura
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
