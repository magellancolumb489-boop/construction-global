"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { getOrderDetail } from "@/lib/api/orders"
import type { OrderDetail } from "@/types/domain"
import { ArrowLeft, FileText } from "lucide-react"

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrderDetail(id).then((o) => { setOrder(o); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-muted-foreground">Comanda nu a fost gasita.</p>
        <Link href="/account" className="mt-4 inline-block text-primary underline">Inapoi la cont</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Inapoi la cont
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Comanda #{order.id}</h1>
        <div className="flex gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Produse Comandate</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produs</TableHead>
                  <TableHead>Cantitate</TableHead>
                  <TableHead>Pret unitar</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.qty} {item.unit}</TableCell>
                    <TableCell><MoneyDisplay amount={item.price} currency={item.currency} /></TableCell>
                    <TableCell className="text-right"><MoneyDisplay amount={item.price * item.qty} currency={item.currency} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {order.shippingAddress && (
            <Card>
              <CardHeader><CardTitle>Adresa de Livrare</CardTitle></CardHeader>
              <CardContent>
                <p className="text-foreground">{order.shippingAddress.line1}</p>
                <p className="text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.county}</p>
                <p className="text-muted-foreground">{order.shippingAddress.country}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Sumar Plata</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <MoneyDisplay amount={order.total} currency={order.currency} className="text-lg font-bold" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status plata</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              {order.receiptUrl && (
                <Button variant="outline" className="mt-2 w-full" asChild>
                  <a href={order.receiptUrl}><FileText className="mr-2 h-4 w-4" /> Descarca Factura</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
