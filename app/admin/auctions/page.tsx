"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { getAdminAuctions, cancelAuction, forceCloseAuction } from "@/lib/api/admin"
import type { AuctionListItem } from "@/types/domain"
import { Search, XCircle, Lock } from "lucide-react"

export default function AdminAuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    getAdminAuctions().then((a) => { setAuctions(a); setLoading(false) })
  }, [])

  const filtered = auctions.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.categoryName.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCancel(id: string) {
    await cancelAuction(id)
    setAuctions((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" as const } : a))
  }

  async function handleForceClose(id: string) {
    await forceCloseAuction(id)
    setAuctions((prev) => prev.map((a) => a.id === id ? { ...a, status: "ended" as const } : a))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Gestionare Licitatii</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cauta licitatii..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
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
                  <TableHead className="text-right">Actiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.id}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.categoryName}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell><MoneyDisplay amount={a.currentHighestBid} currency={a.currency} /></TableCell>
                    <TableCell>{a.bidCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {a.status === "active" && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><XCircle className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Anulare Licitatie</AlertDialogTitle>
                                  <AlertDialogDescription>Sunteti sigur ca doriti sa anulati licitatia &quot;{a.title}&quot;? Aceasta actiune nu poate fi anulata.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Nu</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancel(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Anuleaza</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Lock className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Inchidere Fortata</AlertDialogTitle>
                                  <AlertDialogDescription>Sunteti sigur ca doriti sa inchideti fortat licitatia &quot;{a.title}&quot;?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Nu</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleForceClose(a.id)}>Inchide</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nicio licitatie gasita.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
