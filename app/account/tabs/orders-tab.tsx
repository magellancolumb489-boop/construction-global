"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { EmptyState } from "@/components/shared/empty-state"
import { getOrders } from "@/lib/api/orders"
import type { OrderSummary } from "@/types/domain"

// Lifted from the old monolith verbatim. When the real order pipeline lands
// this tab will read from a server helper and not need useEffect.
export function OrdersTab() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getOrders().then((o) => {
      if (cancelled) return
      setOrders(o)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Comenzile mele</h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nicio comanda"
          description="Nu aveti comenzi inca."
          actionLabel="Viziteaza magazinul"
          actionHref="/marketplace"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-semibold text-foreground">
                  Comanda <span className="font-mono text-xs text-muted-foreground">#{o.id}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={o.status} />
                  <StatusBadge status={o.paymentStatus} />
                  <span className="text-xs text-muted-foreground">{o.itemCount} produse</span>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <MoneyDisplay amount={o.total} currency={o.currency} className="text-base font-bold text-foreground" />
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link href={`/account/orders/${o.id}`}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> Detalii
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
