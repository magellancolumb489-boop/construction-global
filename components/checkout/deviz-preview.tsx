"use client"

import type { PlacedOrder } from "@/app/checkout/actions"
import { buildProforma, type ProformaCopy, type ProformaParty } from "@/lib/checkout/proforma"

function money(cents: number, currency: string): string {
  return (
    (cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency
  )
}

function date(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ro-RO") : "-"
}

function Party({ label, p }: { label: string; p: ProformaParty }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-xs leading-relaxed">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{p.name}</p>
      {p.cui && <p>CUI / CIF: {p.cui}</p>}
      {p.regCom && <p>Nr. Reg. Com.: {p.regCom}</p>}
      {p.vatId && <p>Cod TVA: {p.vatId}</p>}
      {p.address && <p>Sediu: {p.address}</p>}
      {p.iban && <p>IBAN: {p.iban}</p>}
      {p.bank && <p>Banca: {p.bank}</p>}
      {p.email && <p>Email: {p.email}</p>}
      {p.phone && <p>Tel: {p.phone}</p>}
    </div>
  )
}

/** A4 HTML proforma; same model as the PDF (lib/checkout/proforma.ts). Always light, for print. */
export function DevizPreview({ order, copy = "buyer" }: { order: PlacedOrder; copy?: ProformaCopy }) {
  const d = buildProforma(order, copy)
  const cur = d.currency
  return (
    <article className="mx-auto w-full bg-white p-6 text-slate-900 shadow-sm print:shadow-none sm:p-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold">{d.title}</h2>
          <p className="text-xs text-slate-500">{d.subtitle}</p>
        </div>
        <div className="text-right text-xs">
          <p className="text-sm font-bold">Nr. {d.number}</p>
          <p>Data emiterii: {date(d.issueDate)}</p>
          <p>Scadență: {date(d.dueDate)}</p>
          <p>Comanda: {d.orderNumber}</p>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Party label="Furnizor" p={d.issuer} />
        <Party label="Cumpărător" p={d.customer} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border border-slate-300 text-xs">
          <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
            <tr>
              <th className="p-2 text-center">Nr.</th>
              <th className="p-2 text-left">Denumire produs / serviciu</th>
              <th className="p-2 text-center">U.M.</th>
              <th className="p-2 text-right">Cant.</th>
              <th className="p-2 text-right">Preț unitar fără TVA</th>
              <th className="p-2 text-right">Valoare</th>
              <th className="p-2 text-right">TVA {d.vatRatePct}%</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.no} className="border-t border-slate-200 align-top">
                <td className="p-2 text-center">{l.no}</td>
                <td className="p-2">
                  {l.description}
                  {l.subline && <p className="text-[10px] text-slate-500">{l.subline}</p>}
                </td>
                <td className="p-2 text-center">{l.unit}</td>
                <td className="p-2 text-right tabular-nums">{l.qty.toLocaleString("ro-RO")}</td>
                <td className="p-2 text-right tabular-nums">{money(l.unitPriceCents, cur)}</td>
                <td className="p-2 text-right tabular-nums">{money(l.valueCents, cur)}</td>
                <td className="p-2 text-right tabular-nums">{money(l.vatCents, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Total fără TVA</span><span className="tabular-nums">{money(d.netCents, cur)}</span></div>
        <div className="flex justify-between"><span>TVA {d.vatRatePct}%</span><span className="tabular-nums">{money(d.vatCents, cur)}</span></div>
        <div className="flex justify-between border-t border-slate-900 pt-1 text-base font-bold">
          <span>Total de plată</span><span className="tabular-nums">{money(d.totalCents, cur)}</span>
        </div>
      </div>

      {d.summary.length > 0 && (
        <div className="mt-4 space-y-1 rounded-lg border border-slate-200 p-3 text-xs">
          {d.summary.map((r) => (
            <div key={r.label} className={`flex justify-between gap-4 ${r.strong ? "font-semibold" : ""}`}>
              <span>{r.label}</span>
              <span className="tabular-nums">{money(r.cents, cur)}</span>
            </div>
          ))}
        </div>
      )}

      {d.warnings.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-100 p-3 text-xs text-amber-900 print:hidden">
          {d.warnings.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <div className="mt-10 flex justify-between text-xs text-slate-500">
        <span>Semnătura și ștampila furnizorului</span>
        <span>Semnătura de primire</span>
      </div>

      <footer className="mt-6 space-y-1 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
        {d.notes.map((n) => <p key={n}>{n}</p>)}
        {order.notes && <p>Observații: {order.notes}</p>}
      </footer>
    </article>
  )
}
