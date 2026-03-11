"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { getAdminOrders, markOrderFulfilled } from "@/lib/api/admin"
import type { OrderSummary } from "@/types/domain"
import { Search, CheckCircle } from "lucide-react"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getAdminOrders().then((o) => { setOrders(o); setLoading(false) })
  }, [])

  const filtered = orders.filter((o) => o.id.toLowerCase().includes(search.toLowerCase()))

  async function handleFulfill(id: string) {
    await markOrderFulfilled(id)
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "FULFILLED" as const } : o))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestionare Comenzi</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cauta comenzi..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Comanda</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plata</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Produse</TableHead>
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-sm">{o.id}</TableCell>
                    <TableCell>{new Date(o.createdAt).toLocaleDateString("ro-RO")}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                    <TableCell><MoneyDisplay amount={o.total} currency={o.currency} /></TableCell>
                    <TableCell>{o.itemCount}</TableCell>
                    <TableCell className="text-right">
                      {(o.status === "CONFIRMED" || o.status === "PENDING") && (
                        <Button variant="ghost" size="sm" onClick={() => handleFulfill(o.id)} className="text-chart-3 hover:text-chart-3">
                          <CheckCircle className="mr-1 h-4 w-4" /> Finalizeaza
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nicio comanda gasita.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
