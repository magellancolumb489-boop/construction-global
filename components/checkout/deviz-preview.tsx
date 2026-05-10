"use client"

import type { PlacedOrder } from "@/app/checkout/actions"
import { orderLineSnapshotSubline } from "@/lib/checkout/order-line-snapshot-detail"
import { formatMoney } from "@/components/shared/money-display"
import type { Currency } from "@/types/domain"

// Read snapshot fields safely. The RPC writes JSONB so the runtime shape is
// loose; we keep TypeScript happy without leaning on `any`.
type Snapshot = Record<string, unknown> | null
function readString(s: Snapshot, key: string): string {
  if (!s) return ""
  const v = s[key]
  return typeof v === "string" ? v : ""
}
function readObject(s: Snapshot, key: string): Snapshot {
  if (!s) return null
  const v = s[key]
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Snapshot) : null
}

function fiscalAddressLine(addr: Snapshot): string {
  if (!addr) return ""
  const parts = [
    readString(addr, "address_line1"),
    readString(addr, "city"),
    readString(addr, "county"),
    readString(addr, "country"),
  ].filter(Boolean)
  return parts.join(", ")
}

export interface DevizPreviewProps {
  order: PlacedOrder
  // Compact mode hides the print-friendly large margins for in-app embedding.
  compact?: boolean
}

// A4-styled HTML deviz. max-w-[210mm] gives us roughly the right printable
// width; we use Tailwind print: utilities so Ctrl+P from this view produces
// a clean one-page invoice without the rest of the checkout chrome.
export function DevizPreview({ order, compact = false }: DevizPreviewProps) {
  const currency = (order.currency as Currency) ?? "RON"
  const supplier = order.seller_snapshot
  const supplierFiscal = readObject(supplier, "fiscal_address")
  const buyer = order.buyer_snapshot
  const buyerFormBilling = readObject(buyer, "form_billing")
  const buyerFormShipping = readObject(buyer, "form_shipping")
  const created = new Date(order.created_at)

  return (
    <div
      className={
        compact
          ? "rounded-2xl border bg-white p-6 text-slate-900 shadow-sm dark:bg-zinc-50"
          : "mx-auto w-full max-w-[210mm] rounded-none border bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none dark:bg-zinc-50 sm:p-10"
      }
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Deviz comandă
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {order.deviz_number ?? "DEV-—"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Comandă{" "}
            <span className="font-mono font-semibold text-slate-800">
              {order.order_number ?? "ORD-—"}
            </span>
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Emis la</p>
          <p className="text-sm font-medium text-slate-800">
            {created.toLocaleDateString("ro-RO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {created.toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Furnizor + Client */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Furnizor
          </h2>
          <p className="text-sm font-semibold text-slate-900">
            {readString(supplier, "company_name") ||
              readString(supplier, "display_name") ||
              "Furnizor"}
          </p>
          {readString(supplier, "entity_type") && (
            <p className="text-xs text-slate-500">
              {readString(supplier, "entity_type")}
            </p>
          )}
          {readString(supplier, "vat_id") && (
            <p className="mt-1 text-xs text-slate-700">
              CUI / VAT: {readString(supplier, "vat_id")}
            </p>
          )}
          {readString(supplier, "reg_com") && (
            <p className="text-xs text-slate-700">
              Reg. com.: {readString(supplier, "reg_com")}
            </p>
          )}
          {fiscalAddressLine(supplierFiscal) && (
            <p className="mt-1 text-xs text-slate-700">
              {fiscalAddressLine(supplierFiscal)}
            </p>
          )}
          {readString(supplier, "phone") && (
            <p className="text-xs text-slate-700">
              Tel: {readString(supplier, "phone")}
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Client
          </h2>
          <p className="text-sm font-semibold text-slate-900">
            {readString(buyerFormBilling, "company_name") ||
              readString(buyerFormBilling, "name") ||
              readString(buyer, "company_name") ||
              readString(buyer, "display_name") ||
              "Client"}
          </p>
          {readString(buyerFormBilling, "vat_number") && (
            <p className="mt-1 text-xs text-slate-700">
              CUI / CIF: {readString(buyerFormBilling, "vat_number")}
            </p>
          )}
          {readString(buyerFormShipping, "address_line1") && (
            <p className="mt-1 text-xs text-slate-700">
              {readString(buyerFormShipping, "address_line1")}
            </p>
          )}
          {(readString(buyerFormShipping, "city") ||
            readString(buyerFormShipping, "county")) && (
            <p className="text-xs text-slate-700">
              {[
                readString(buyerFormShipping, "city"),
                readString(buyerFormShipping, "county"),
                readString(buyerFormShipping, "country"),
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {readString(buyerFormBilling, "email") && (
            <p className="mt-1 text-xs text-slate-700">
              Email: {readString(buyerFormBilling, "email")}
            </p>
          )}
          {readString(buyerFormBilling, "phone") && (
            <p className="text-xs text-slate-700">
              Tel: {readString(buyerFormBilling, "phone")}
            </p>
          )}
        </section>
      </div>

      {/* Linii produs */}
      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Produs</th>
              <th className="w-20 px-3 py-2 text-right">Cant.</th>
              <th className="w-20 px-3 py-2">U.M.</th>
              <th className="w-28 px-3 py-2 text-right">Preț unitar</th>
              <th className="w-28 px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => {
              const snap = (line.snapshot_json ?? {}) as Record<string, unknown>
              const subline = orderLineSnapshotSubline(snap)
              return (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-slate-900">{line.title}</p>
                    {subline && (
                      <p className="mt-0.5 text-[11px] text-slate-500">{subline}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Number(line.qty).toLocaleString("ro-RO")}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{line.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(line.unit_price_cents / 100, currency)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatMoney(
                      (line.unit_price_cents * Number(line.qty)) / 100,
                      currency,
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totaluri */}
      <div className="mt-6 flex flex-wrap justify-end">
        <dl className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-700">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">
              {formatMoney(order.subtotal_cents / 100, currency)}
            </dd>
          </div>
          <div className="flex justify-between text-slate-700">
            <dt>Transport</dt>
            <dd className="tabular-nums">
              {formatMoney(order.transport_cents / 100, currency)}
            </dd>
          </div>
          <div className="flex justify-between text-slate-700">
            <dt>TVA 19%</dt>
            <dd className="tabular-nums">
              {formatMoney(order.vat_cents / 100, currency)}
            </dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {formatMoney(order.total_cents / 100, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
        <p>
          Document generat automat de ConstructionHub Romania. Acest deviz nu
          ține loc de factură fiscală — aceasta va fi emisă separat de furnizor.
        </p>
        {order.notes && (
          <p className="mt-2">
            <span className="font-semibold text-slate-700">Observații:</span>{" "}
            {order.notes}
          </p>
        )}
      </div>
    </div>
  )
}
