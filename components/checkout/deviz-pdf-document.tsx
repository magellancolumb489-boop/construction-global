"use client"

// `@react-pdf/renderer` is a heavy client-only bundle; consumers load it via
// deviz-pdf-download.tsx (next/dynamic). Layout follows a Romanian
// "factură proformă": series/number, dates, Furnizor / Cumpărător blocks with
// CUI, Reg. Com., address, IBAN, a numbered table with U.M., cantitate, preț
// unitar fără TVA, valoare, TVA, then totals and mentions.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { PlacedOrder } from "@/app/checkout/actions"
import { buildProforma, type ProformaCopy, type ProformaParty } from "@/lib/checkout/proforma"
import { PDF_FONT_FAMILY, registerPdfFonts } from "@/lib/checkout/pdf-fonts"

registerPdfFonts()

function money(cents: number, currency: string): string {
  return (
    (cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + currency
  )
}

function qty(n: number): string {
  return n.toLocaleString("ro-RO", { maximumFractionDigits: 3 })
}

function date(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("ro-RO", { year: "numeric", month: "2-digit", day: "2-digit" })
}

const s = StyleSheet.create({
  page: { paddingVertical: 32, paddingHorizontal: 36, fontSize: 9, color: "#0f172a", fontFamily: PDF_FONT_FAMILY },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 16, fontWeight: 700 },
  sub: { fontSize: 9, color: "#475569", marginTop: 2 },
  meta: { fontSize: 9, textAlign: "right" },
  metaStrong: { fontSize: 10, fontWeight: 700, textAlign: "right" },
  parties: { flexDirection: "row", gap: 16, marginBottom: 14 },
  party: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 3, padding: 8 },
  partyLabel: { fontSize: 7, color: "#64748b", letterSpacing: 1, marginBottom: 3 },
  partyName: { fontSize: 10, fontWeight: 700, marginBottom: 2 },
  partyRow: { fontSize: 8.5, color: "#334155", marginTop: 1 },
  table: { borderWidth: 1, borderColor: "#cbd5e1" },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  th: { flexDirection: "row", backgroundColor: "#f1f5f9" },
  c: { paddingVertical: 4, paddingHorizontal: 4 },
  cNo: { width: 22, textAlign: "center" },
  cDesc: { flex: 1 },
  cUm: { width: 34, textAlign: "center" },
  cQty: { width: 46, textAlign: "right" },
  cPrice: { width: 70, textAlign: "right" },
  cVal: { width: 74, textAlign: "right" },
  cVat: { width: 64, textAlign: "right" },
  thText: { fontSize: 7, fontWeight: 700, color: "#334155" },
  subline: { fontSize: 7, color: "#64748b", marginTop: 1 },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 250 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#0f172a", paddingTop: 4, marginTop: 3 },
  grandText: { fontSize: 11, fontWeight: 700 },
  summary: { marginTop: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 3, padding: 8 },
  warn: { marginTop: 10, padding: 6, backgroundColor: "#fef3c7", fontSize: 8, color: "#92400e" },
  notes: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6, fontSize: 7.5, color: "#475569" },
  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 28, fontSize: 8, color: "#475569" },
})

function Party({ label, p }: { label: string; p: ProformaParty }) {
  return (
    <View style={s.party}>
      <Text style={s.partyLabel}>{label}</Text>
      <Text style={s.partyName}>{p.name}</Text>
      {p.cui && <Text style={s.partyRow}>CUI / CIF: {p.cui}</Text>}
      {p.regCom && <Text style={s.partyRow}>Nr. Reg. Com.: {p.regCom}</Text>}
      {p.vatId && <Text style={s.partyRow}>Cod TVA: {p.vatId}</Text>}
      {p.address && <Text style={s.partyRow}>Sediu: {p.address}</Text>}
      {p.iban && <Text style={s.partyRow}>IBAN: {p.iban}</Text>}
      {p.bank && <Text style={s.partyRow}>Banca: {p.bank}</Text>}
      {p.email && <Text style={s.partyRow}>Email: {p.email}</Text>}
      {p.phone && <Text style={s.partyRow}>Tel: {p.phone}</Text>}
    </View>
  )
}

export interface DevizPdfDocumentProps {
  order: PlacedOrder
  copy?: ProformaCopy
}

export function DevizPdfDocument({ order, copy = "buyer" }: DevizPdfDocumentProps) {
  const d = buildProforma(order, copy)
  const cur = d.currency
  return (
    <Document title={`Proforma ${d.number}`} author={d.issuer.name}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.title}>{d.title}</Text>
            <Text style={s.sub}>{d.subtitle}</Text>
          </View>
          <View>
            <Text style={s.metaStrong}>Nr. {d.number}</Text>
            <Text style={s.meta}>Data emiterii: {date(d.issueDate)}</Text>
            <Text style={s.meta}>Scadență: {date(d.dueDate)}</Text>
            <Text style={s.meta}>Comanda: {d.orderNumber}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <Party label="FURNIZOR" p={d.issuer} />
          <Party label="CUMPĂRĂTOR" p={d.customer} />
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.c, s.cNo, s.thText]}>Nr.</Text>
            <Text style={[s.c, s.cDesc, s.thText]}>Denumire produs / serviciu</Text>
            <Text style={[s.c, s.cUm, s.thText]}>U.M.</Text>
            <Text style={[s.c, s.cQty, s.thText]}>Cant.</Text>
            <Text style={[s.c, s.cPrice, s.thText]}>Preț unitar fără TVA</Text>
            <Text style={[s.c, s.cVal, s.thText]}>Valoare</Text>
            <Text style={[s.c, s.cVat, s.thText]}>TVA {d.vatRatePct}%</Text>
          </View>
          {d.lines.map((l) => (
            <View key={l.no} style={s.tr} wrap={false}>
              <Text style={[s.c, s.cNo]}>{l.no}</Text>
              <View style={[s.c, s.cDesc]}>
                <Text>{l.description}</Text>
                {l.subline ? <Text style={s.subline}>{l.subline}</Text> : null}
              </View>
              <Text style={[s.c, s.cUm]}>{l.unit}</Text>
              <Text style={[s.c, s.cQty]}>{qty(l.qty)}</Text>
              <Text style={[s.c, s.cPrice]}>{money(l.unitPriceCents, cur)}</Text>
              <Text style={[s.c, s.cVal]}>{money(l.valueCents, cur)}</Text>
              <Text style={[s.c, s.cVat]}>{money(l.vatCents, cur)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totRow}>
            <Text>Total fără TVA</Text>
            <Text>{money(d.netCents, cur)}</Text>
          </View>
          <View style={s.totRow}>
            <Text>TVA {d.vatRatePct}%</Text>
            <Text>{money(d.vatCents, cur)}</Text>
          </View>
          <View style={s.grand}>
            <Text style={s.grandText}>Total de plată</Text>
            <Text style={s.grandText}>{money(d.totalCents, cur)}</Text>
          </View>
        </View>

        {d.summary.length > 0 && (
          <View style={s.summary}>
            {d.summary.map((r) => (
              <View key={r.label} style={s.totRow}>
                <Text style={r.strong ? { fontWeight: 700 } : undefined}>{r.label}</Text>
                <Text style={r.strong ? { fontWeight: 700 } : undefined}>{money(r.cents, cur)}</Text>
              </View>
            ))}
          </View>
        )}

        {d.warnings.length > 0 && (
          <View style={s.warn}>
            {d.warnings.map((w) => (
              <Text key={w}>{w}</Text>
            ))}
          </View>
        )}

        <View style={s.sign}>
          <Text>Semnătura și ștampila furnizorului</Text>
          <Text>Semnătura de primire</Text>
        </View>

        <View style={s.notes}>
          {d.notes.map((n) => (
            <Text key={n}>{n}</Text>
          ))}
          {order.notes ? <Text>Observații: {order.notes}</Text> : null}
        </View>
      </Page>
    </Document>
  )
}
