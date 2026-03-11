"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { getAdminPayments } from "@/lib/api/admin"
import type { AdminPayment } from "@/types/domain"
import { Search } from "lucide-react"

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getAdminPayments().then((p) => { setPayments(p); setLoading(false) })
  }, [])

  const filtered = payments.filter((p) =>
    p.providerId.toLowerCase().includes(search.toLowerCase()) ||
    p.linkedEntityId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestionare Plati</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cauta plati..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Tip Entitate</TableHead>
                  <TableHead>ID Entitate</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.providerId}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell><MoneyDisplay amount={p.amount} currency={p.currency} /></TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.linkedEntityType === "ORDER" ? "Comanda" : "Licitatie"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.linkedEntityId}</TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString("ro-RO")}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nicio plata gasita.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
