"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { getAdminAuctions } from "@/lib/api/admin"
import type { AuctionListItem } from "@/types/domain"
import { Search } from "lucide-react"

// Admin table shell: stub API returns []; optional demo rows could be wired later.
export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getAdminAuctions().then((a) => {
      setAuctions(a)
      setLoading(false)
    })
  }, [])

  const filtered = auctions.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.categoryName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestionare Licitatii</h1>
      <p className="text-sm text-muted-foreground">
        Mod administrativ in stand-by — nu exista RPC `close_auction`. Lista ramane goala pana la relansarea licitatiilor.
      </p>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cauta licitatii..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Titlu</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Oferta Curenta</TableHead>
                  <TableHead>Nr. Oferte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.id}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.categoryName}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <MoneyDisplay amount={a.currentHighestBid} currency={a.currency} />
                    </TableCell>
                    <TableCell>{a.bidCount}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nicio licitatie in sistem.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
