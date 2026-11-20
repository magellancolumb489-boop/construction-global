"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ShoppingBag, Eye, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { EmptyState } from "@/components/shared/empty-state"
import { getOrders } from "@/lib/api/orders"
import type { OrderSummary } from "@/types/domain"

const TRANSPORT_LABEL: Record<string, string> = {
  included: "Transport: urmează programarea",
  scheduled: "Transport programat",
  awaiting_quote: "Transport: așteaptă oferta platformei",
  quoted: "Ofertă de transport primită",
  accepted: "Ofertă transport acceptată",
  declined: "Ofertă transport refuzată",
  expired: "Ofertă transport expirată",
  assigned: "Transportator alocat",
  in_transit: "În curs de livrare",
  delivered: "Livrat",
  failed: "Problemă la livrare",
  cancelled: "Anulat",
}

/** What the viewer should do next, if anything. */
function nextStep(o: OrderSummary): string | null {
  if (o.status === "CANCELLED") return null
  if (o.role === "buyer") {
    if (o.paymentStatus === "PENDING") return "Plătește comanda"
    if (o.transportStatus === "quoted") return "Răspunde la oferta de transport"
    if (o.transportStatus === "declined" || o.transportStatus === "expired") return "Cere o ofertă nouă sau anulează"
    if (o.transportStatus === "in_transit") return "Confirmă livrarea la primire"
    return null
  }
  if (o.transportStatus === "included") return "Programează livrarea"
  if (o.transportStatus === "failed") return "Rezolvă problema de livrare"
  return null
}

// getOrders is a server action; RLS limits it to the user's own purchases and sales.
export function OrdersTab() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"buyer" | "seller">("buyer")

  useEffect(() => {
    let cancelled = false
    getOrders().then((o) => {
      if (cancelled) return
      setOrders(o)
      // Sellers without purchases land on their sales.
      if (!o.some((x) => x.role === "buyer") && o.some((x) => x.role === "seller")) setView("seller")
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const bought = useMemo(() => orders.filter((o) => o.role !== "seller"), [orders])
  const sold = useMemo(() => orders.filter((o) => o.role === "seller"), [orders])
  const list = view === "buyer" ? bought : sold
  const todo = (arr: OrderSummary[]) => arr.filter((o) => nextStep(o)).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">Comenzi</h2>
        <Link href="/ghid#comenzi" className="text-xs text-muted-foreground underline">Cum verific o comandă?</Link>
      </div>
      <div className="inline-flex rounded-xl border border-border/50 p-1 text-sm">
        {(
          [
            ["buyer", `Cumpărături (${bought.length})`, todo(bought)],
            ["seller", `Vânzări (${sold.length})`, todo(sold)],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`rounded-lg px-3 py-1.5 ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {label}
            {n > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{n}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={view === "buyer" ? "Nicio cumpărătură" : "Nicio vânzare"}
          description={view === "buyer" ? "Nu ai comenzi încă." : "Comenzile primite pe anunțurile tale apar aici."}
          actionLabel={view === "buyer" ? "Vizitează magazinul" : "Publică un anunț"}
          actionHref={view === "buyer" ? "/marketplace" : "/sell/listing/new"}
        />
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const step = nextStep(o)
            return (
              <div
                key={o.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-semibold text-foreground">
                    {o.orderNumber ?? `#${o.id.slice(0, 8)}`}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("ro-RO")}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={o.status} />
                    <StatusBadge status={o.paymentStatus} />
                    {o.transportStatus && (
                      <span className="text-xs text-muted-foreground">{TRANSPORT_LABEL[o.transportStatus] ?? o.transportStatus}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{o.itemCount} produse</span>
                  </div>
                  {step && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" /> {step}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <div className="text-right">
                    <MoneyDisplay
                      amount={o.amountForViewer ?? o.total}
                      currency={o.currency}
                      className="text-base font-bold text-foreground"
                    />
                    {o.role === "seller" && <p className="text-[10px] text-muted-foreground">suma ta (cu TVA)</p>}
                  </div>
                  <Button variant={step ? "default" : "outline"} size="sm" className="rounded-xl" asChild>
                    <Link href={`/account/orders/${o.id}`}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> {step ? "Deschide" : "Detalii"}
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
