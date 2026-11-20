"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/components/shared/money-display"
import { PayButton } from "@/components/orders/pay-button"
import {
  cancelOrderAction,
  transportAction,
  type TransportActionInput,
} from "@/app/account/orders/actions"
import type { OrderTransport } from "@/app/checkout/actions"
import type { Currency } from "@/types/domain"

export type OrderViewerRole = "buyer" | "seller" | "admin"

export interface TransportEvent {
  id: number
  from_status: string | null
  to_status: string
  action: string
  actor_role: string
  note: string | null
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  included: "Transport asigurat de vânzător — urmează programarea",
  scheduled: "Livrare programată",
  awaiting_quote: "Așteaptă oferta de transport de la platformă",
  quoted: "Ofertă de transport primită",
  accepted: "Ofertă acceptată",
  declined: "Ofertă refuzată",
  expired: "Oferta a expirat",
  assigned: "Transportator alocat",
  in_transit: "În curs de livrare",
  delivered: "Livrat",
  failed: "Problemă la livrare",
  cancelled: "Anulat",
}

const MODE_LABEL: Record<OrderTransport["mode"], string> = {
  seller: "Transport asigurat de vânzător",
  platform: "Transport organizat de platformă",
  tanker_manual: "Transport în cisternă (ofertă manuală)",
}

const ACTION_LABEL: Record<string, string> = {
  order_placed: "Comandă plasată",
  quote: "Ofertă trimisă",
  accept: "Ofertă acceptată",
  decline: "Ofertă refuzată",
  request_requote: "Ofertă nouă cerută",
  schedule: "Livrare programată",
  assign: "Transportator alocat",
  mark_in_transit: "Plecat spre client",
  confirm_delivery: "Livrare confirmată",
  report_failure: "Problemă raportată",
  auto_expire: "Oferta a expirat",
  transport_paid: "Transport plătit",
  cancel_order: "Comandă anulată",
}

export function TransportPanel({
  orderId,
  role,
  transport,
  events,
  currency,
  orderStatus,
}: {
  orderId: string
  role: OrderViewerRole
  transport: OrderTransport
  events: TransportEvent[]
  currency: Currency
  orderStatus: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ amount: "", note: "", carrier: "", phone: "", date: "", reason: "" })

  const t = transport
  const isSellerMode = t.mode === "seller"
  const closed = orderStatus === "cancelled" || t.status === "delivered" || t.status === "cancelled"

  function run(input: TransportActionInput) {
    setError(null)
    startTransition(async () => {
      const res = await transportAction(orderId, input)
      if (!res.ok) return setError(res.error)
      setForm((f) => ({ ...f, note: "", reason: "" }))
      router.refresh()
    })
  }

  function cancel() {
    setError(null)
    startTransition(async () => {
      const res = await cancelOrderAction(orderId, form.reason)
      if (!res.ok) return setError(res.error)
      router.refresh()
    })
  }

  const can = {
    quote: role === "admin" && !isSellerMode && t.status === "awaiting_quote",
    answer: role === "buyer" && t.status === "quoted",
    requote: (role === "buyer" || role === "admin") && (t.status === "declined" || t.status === "expired"),
    pay: role === "buyer" && t.status === "accepted" && !t.paid,
    schedule: isSellerMode && (role === "seller" || role === "admin") && (t.status === "included" || t.status === "failed"),
    assign: !isSellerMode && role === "admin" && (t.status === "accepted" || t.status === "failed"),
    inTransit:
      (isSellerMode && (role === "seller" || role === "admin") && (t.status === "included" || t.status === "scheduled")) ||
      (!isSellerMode && role === "admin" && t.status === "assigned"),
    deliver:
      ["in_transit", "scheduled", "assigned"].includes(t.status) &&
      (role === "buyer" || role === "admin" || (role === "seller" && isSellerMode)),
    fail:
      ["included", "scheduled", "accepted", "assigned", "in_transit"].includes(t.status) &&
      (role === "admin" || role === "buyer" || (role === "seller" && isSellerMode)),
    cancel:
      role === "admin"
        ? !["in_transit"].includes(t.status)
        : ["included", "scheduled", "awaiting_quote", "quoted", "declined", "expired", "failed"].includes(t.status),
  }

  const quoteTotal = (t.quote_cents ?? 0) + (t.quote_vat_cents ?? 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Truck className="h-5 w-5 text-primary" />
        <CardTitle>Transport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{MODE_LABEL[t.mode]}</p>
          <p className="font-semibold">{STATUS_LABEL[t.status] ?? t.status}</p>
          {t.carrier_name && (
            <p className="text-muted-foreground">
              Transportator: {t.carrier_name}
              {t.carrier_phone ? ` · ${t.carrier_phone}` : ""}
            </p>
          )}
          {t.scheduled_for && <p className="text-muted-foreground">Data: {t.scheduled_for}</p>}
          {t.failure_reason && <p className="text-destructive">Motiv: {t.failure_reason}</p>}
        </div>

        {t.quote_cents != null && (
          <div className="rounded-xl border border-border/60 p-3">
            <p>
              Ofertă transport: <strong>{formatMoney(t.quote_cents / 100, currency)}</strong> + TVA{" "}
              {formatMoney((t.quote_vat_cents ?? 0) / 100, currency)} ={" "}
              <strong>{formatMoney(quoteTotal / 100, currency)}</strong>
            </p>
            {t.quote_note && <p className="text-muted-foreground">{t.quote_note}</p>}
            {t.quote_expires_at && t.status === "quoted" && (
              <p className="text-xs text-muted-foreground">
                Valabilă până la {new Date(t.quote_expires_at).toLocaleString("ro-RO")}
              </p>
            )}
            {t.status === "accepted" && (
              <p className="text-xs">{t.paid ? "Plătit" : "De plătit înainte de alocarea transportatorului"}</p>
            )}
          </div>
        )}

        {!closed && (
          <div className="space-y-3">
            {can.quote && (
              <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                <Label>Preț transport fără TVA ({currency})</Label>
                <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <Textarea placeholder="Detalii (vehicul, curse, termen)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
                <Button size="sm" disabled={pending} onClick={() => run({ action: "quote", amountRon: Number(form.amount), note: form.note || undefined })}>
                  Trimite oferta
                </Button>
              </div>
            )}

            {can.answer && (
              <div className="flex gap-2">
                <Button size="sm" disabled={pending} onClick={() => run({ action: "accept" })}>Accept oferta</Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ action: "decline" })}>Refuz</Button>
              </div>
            )}

            {can.requote && (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ action: "request_requote" })}>
                Cer o ofertă nouă
              </Button>
            )}

            {can.pay && <PayButton purpose="transport" refId={orderId} label="Plătește transportul" />}

            {(can.schedule || can.assign) && (
              <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Transportator" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
                  <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      can.assign
                        ? { action: "assign", carrierName: form.carrier, carrierPhone: form.phone || undefined, scheduledFor: form.date || undefined }
                        : { action: "schedule", carrierName: form.carrier || undefined, carrierPhone: form.phone || undefined, scheduledFor: form.date || undefined },
                    )
                  }
                >
                  {can.assign ? "Alocă transportatorul" : "Programează livrarea"}
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {can.inTransit && (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ action: "mark_in_transit" })}>
                  Marchează plecat
                </Button>
              )}
              {can.deliver && (
                <Button size="sm" disabled={pending} onClick={() => run({ action: "confirm_delivery" })}>
                  Confirm livrarea
                </Button>
              )}
            </div>

            {(can.fail || can.cancel) && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <Textarea
                  placeholder="Motiv (obligatoriu pentru problemă sau anulare)"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  {can.fail && (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ action: "report_failure", note: form.reason })}>
                      Raportează problemă
                    </Button>
                  )}
                  {can.cancel && (
                    <Button size="sm" variant="destructive" disabled={pending} onClick={cancel}>
                      Anulează comanda
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Anularea readuce cantitatea în stoc. Sumele achitate intră în procedura de rambursare.
                </p>
              </div>
            )}
          </div>
        )}

        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {error && <p className="text-xs text-destructive">{error}</p>}

        {events.length > 0 && (
          <ol className="space-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
            {events.map((e) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString("ro-RO")} · {ACTION_LABEL[e.action] ?? e.action} ({e.actor_role})
                {e.note ? ` — ${e.note}` : ""}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
