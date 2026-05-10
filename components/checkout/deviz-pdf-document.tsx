"use client"

// `@react-pdf/renderer` is a heavy client-only bundle. The Document is
// exported alone here; consumers wrap PDFDownloadLink with next/dynamic to
// keep the SSR bundle thin. See deviz-pdf-download.tsx for the lazy client.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { PlacedOrder } from "@/app/checkout/actions"

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

function formatRO(amountCents: number, currency: string): string {
  const value = amountCents / 100
  return (
    value.toLocaleString("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    currency
  )
}

// Stylesheet kept in one place; @react-pdf/renderer doesn't accept Tailwind
// so we mirror the visual rhythm of the HTML deviz manually.
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 12,
    marginBottom: 14,
  },
  eyebrow: { fontSize: 8, color: "#64748b", letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: 700, color: "#0f172a" },
  subTitle: { fontSize: 9, color: "#475569", marginTop: 2 },
  small: { fontSize: 9, color: "#475569" },
  smallStrong: { fontSize: 10, color: "#1e293b", fontWeight: 700 },
  twoCol: { flexDirection: "row", gap: 24, marginBottom: 18 },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: { fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 2 },
  partyMeta: { fontSize: 9, color: "#334155", marginTop: 1 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  th: { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
  thProduct: { flex: 1 },
  thQty: { width: 40, textAlign: "right" },
  thUnit: { width: 40 },
  thUnitPrice: { width: 80, textAlign: "right" },
  thSubtotal: { width: 80, textAlign: "right" },
  tbodyRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  tdProduct: { flex: 1, paddingRight: 4 },
  tdQty: { width: 40, textAlign: "right" },
  tdUnit: { width: 40 },
  tdUnitPrice: { width: 80, textAlign: "right" },
  tdSubtotal: { width: 80, textAlign: "right", fontWeight: 700 },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: { fontSize: 11, fontWeight: 700, color: "#0f172a" },
  grandValue: { fontSize: 12, fontWeight: 700, color: "#0f172a" },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    fontSize: 8,
    color: "#64748b",
  },
})

export interface DevizPdfDocumentProps {
  order: PlacedOrder
}

export function DevizPdfDocument({ order }: DevizPdfDocumentProps) {
  const currency = order.currency || "RON"
  const supplier = order.seller_snapshot
  const supplierFiscal = readObject(supplier, "fiscal_address")
  const buyer = order.buyer_snapshot
  const buyerFormBilling = readObject(buyer, "form_billing")
  const buyerFormShipping = readObject(buyer, "form_shipping")
  const created = new Date(order.created_at)

  return (
    <Document
      title={`Deviz ${order.deviz_number ?? order.order_number ?? ""}`}
      author="ConstructionHub Romania"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>DEVIZ COMANDĂ</Text>
            <Text style={styles.title}>{order.deviz_number ?? "DEV-—"}</Text>
            <Text style={styles.subTitle}>
              Comandă {order.order_number ?? "ORD-—"}
            </Text>
          </View>
          <View>
            <Text style={[styles.small, { textAlign: "right" }]}>Emis la</Text>
            <Text style={[styles.smallStrong, { textAlign: "right" }]}>
              {created.toLocaleDateString("ro-RO", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={[styles.small, { textAlign: "right" }]}>
              {created.toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>FURNIZOR</Text>
            <Text style={styles.partyName}>
              {readString(supplier, "company_name") ||
                readString(supplier, "display_name") ||
                "Furnizor"}
            </Text>
            {readString(supplier, "entity_type") !== "" && (
              <Text style={styles.partyMeta}>
                {readString(supplier, "entity_type")}
              </Text>
            )}
            {readString(supplier, "vat_id") !== "" && (
              <Text style={styles.partyMeta}>
                CUI / VAT: {readString(supplier, "vat_id")}
              </Text>
            )}
            {readString(supplier, "reg_com") !== "" && (
              <Text style={styles.partyMeta}>
                Reg. com.: {readString(supplier, "reg_com")}
              </Text>
            )}
            {fiscalAddressLine(supplierFiscal) !== "" && (
              <Text style={styles.partyMeta}>
                {fiscalAddressLine(supplierFiscal)}
              </Text>
            )}
            {readString(supplier, "phone") !== "" && (
              <Text style={styles.partyMeta}>
                Tel: {readString(supplier, "phone")}
              </Text>
            )}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionLabel}>CLIENT</Text>
            <Text style={styles.partyName}>
              {readString(buyerFormBilling, "company_name") ||
                readString(buyerFormBilling, "name") ||
                readString(buyer, "company_name") ||
                readString(buyer, "display_name") ||
                "Client"}
            </Text>
            {readString(buyerFormBilling, "vat_number") !== "" && (
              <Text style={styles.partyMeta}>
                CUI / CIF: {readString(buyerFormBilling, "vat_number")}
              </Text>
            )}
            {readString(buyerFormShipping, "address_line1") !== "" && (
              <Text style={styles.partyMeta}>
                {readString(buyerFormShipping, "address_line1")}
              </Text>
            )}
            {(readString(buyerFormShipping, "city") !== "" ||
              readString(buyerFormShipping, "county") !== "") && (
              <Text style={styles.partyMeta}>
                {[
                  readString(buyerFormShipping, "city"),
                  readString(buyerFormShipping, "county"),
                  readString(buyerFormShipping, "country"),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            {readString(buyerFormBilling, "email") !== "" && (
              <Text style={styles.partyMeta}>
                Email: {readString(buyerFormBilling, "email")}
              </Text>
            )}
            {readString(buyerFormBilling, "phone") !== "" && (
              <Text style={styles.partyMeta}>
                Tel: {readString(buyerFormBilling, "phone")}
              </Text>
            )}
          </View>
        </View>

        {/* Lines table */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.thProduct]}>Produs</Text>
            <Text style={[styles.th, styles.thQty]}>Cant.</Text>
            <Text style={[styles.th, styles.thUnit]}>U.M.</Text>
            <Text style={[styles.th, styles.thUnitPrice]}>Preț unitar</Text>
            <Text style={[styles.th, styles.thSubtotal]}>Subtotal</Text>
          </View>
          {order.lines.map((line) => {
            const snap = (line.snapshot_json ?? {}) as Record<string, unknown>
            const klass =
              typeof snap["concrete_class_code"] === "string"
                ? (snap["concrete_class_code"] as string)
                : ""
            const cons =
              typeof snap["concrete_consistency"] === "string"
                ? (snap["concrete_consistency"] as string)
                : ""
            return (
              <View key={line.id} style={styles.tbodyRow} wrap={false}>
                <View style={styles.tdProduct}>
                  <Text>{line.title}</Text>
                  {(klass || cons) !== "" && (
                    <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
                      {[klass, cons].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </View>
                <Text style={styles.tdQty}>
                  {Number(line.qty).toLocaleString("ro-RO")}
                </Text>
                <Text style={styles.tdUnit}>{line.unit}</Text>
                <Text style={styles.tdUnitPrice}>
                  {formatRO(line.unit_price_cents, currency)}
                </Text>
                <Text style={styles.tdSubtotal}>
                  {formatRO(line.unit_price_cents * Number(line.qty), currency)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatRO(order.subtotal_cents, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Transport</Text>
            <Text>{formatRO(order.transport_cents, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA 19%</Text>
            <Text>{formatRO(order.vat_cents, currency)}</Text>
          </View>
          <View style={styles.totalRowGrand}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>
              {formatRO(order.total_cents, currency)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Document generat automat de ConstructionHub Romania. Acest deviz nu
            ține loc de factură fiscală — aceasta va fi emisă separat de
            furnizor.
          </Text>
          {order.notes ? (
            <Text style={{ marginTop: 6 }}>Observații: {order.notes}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  )
}
