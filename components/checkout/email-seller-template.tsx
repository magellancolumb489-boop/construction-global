import type { PlacedOrder } from "@/app/checkout/actions"
import { orderLineSnapshotSubline } from "@/lib/checkout/order-line-snapshot-detail"

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
function formatRO(amountCents: number, currency: string): string {
  return (
    (amountCents / 100).toLocaleString("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    currency
  )
}

const palette = {
  bg: "#f4f5f7",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#1d4ed8",
}

export interface EmailSellerTemplateProps {
  order: PlacedOrder
}

export function EmailSellerTemplate({ order }: EmailSellerTemplateProps) {
  const currency = order.currency || "RON"
  const buyer = order.buyer_snapshot
  const buyerForm = readObject(buyer, "form_billing")
  const buyerShipping = readObject(buyer, "form_shipping")
  const supplier = order.seller_snapshot

  const buyerName =
    readString(buyerForm, "company_name") ||
    readString(buyerForm, "name") ||
    readString(buyer, "display_name") ||
    "Client"

  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        backgroundColor: palette.bg,
        padding: "24px 0",
        fontFamily:
          "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', sans-serif",
      }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table
              width="600"
              cellPadding={0}
              cellSpacing={0}
              style={{
                backgroundColor: palette.card,
                borderRadius: 12,
                border: `1px solid ${palette.border}`,
                overflow: "hidden",
                width: "100%",
                maxWidth: 600,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: palette.accent,
                      color: "#ffffff",
                      padding: "20px 24px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        letterSpacing: 1.5,
                        opacity: 0.85,
                        textTransform: "uppercase",
                      }}
                    >
                      Comandă nouă
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {order.order_number ?? "ORD-—"}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "24px", color: palette.text }}>
                    <p style={{ margin: 0, fontSize: 14 }}>
                      Salut{" "}
                      {readString(supplier, "company_name") ||
                        readString(supplier, "display_name") ||
                        "Furnizor"}
                      ,
                    </p>
                    <p
                      style={{
                        margin: "12px 0 0",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      Ai primit o comandă nouă pe ConstructionHub Romania.
                      Detaliile clientului și liniile comenzii sunt mai jos —
                      contactează cumpărătorul pentru programarea livrării.
                    </p>
                  </td>
                </tr>

                {/* Buyer details */}
                <tr>
                  <td style={{ padding: "0 24px 12px" }}>
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{
                        border: `1px solid ${palette.border}`,
                        borderRadius: 8,
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ padding: 16 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: palette.muted,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                              }}
                            >
                              Date contact client
                            </p>
                            <p
                              style={{
                                margin: "6px 0 0",
                                fontSize: 14,
                                fontWeight: 700,
                                color: palette.text,
                              }}
                            >
                              {buyerName}
                            </p>
                            {readString(buyerForm, "vat_number") && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 12,
                                  color: palette.text,
                                }}
                              >
                                CUI / CIF: {readString(buyerForm, "vat_number")}
                              </p>
                            )}
                            {readString(buyerForm, "email") && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 12,
                                  color: palette.text,
                                }}
                              >
                                Email:{" "}
                                <a
                                  href={`mailto:${readString(buyerForm, "email")}`}
                                  style={{ color: palette.accent }}
                                >
                                  {readString(buyerForm, "email")}
                                </a>
                              </p>
                            )}
                            {readString(buyerForm, "phone") && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  fontSize: 12,
                                  color: palette.text,
                                }}
                              >
                                Telefon:{" "}
                                <a
                                  href={`tel:${readString(buyerForm, "phone")}`}
                                  style={{ color: palette.accent }}
                                >
                                  {readString(buyerForm, "phone")}
                                </a>
                              </p>
                            )}
                            {readString(buyerShipping, "address_line1") && (
                              <p
                                style={{
                                  margin: "8px 0 0",
                                  fontSize: 12,
                                  color: palette.text,
                                }}
                              >
                                <strong>Livrare:</strong>{" "}
                                {readString(buyerShipping, "address_line1")},{" "}
                                {readString(buyerShipping, "city")},{" "}
                                {readString(buyerShipping, "county")},{" "}
                                {readString(buyerShipping, "country")}
                              </p>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Lines */}
                <tr>
                  <td style={{ padding: "0 24px 8px" }}>
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      style={{ borderCollapse: "collapse", fontSize: 13 }}
                    >
                      <thead>
                        <tr>
                          <th
                            align="left"
                            style={{
                              padding: "8px 0",
                              borderBottom: `1px solid ${palette.border}`,
                              color: palette.muted,
                              fontWeight: 600,
                              fontSize: 11,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Produs
                          </th>
                          <th
                            align="right"
                            style={{
                              padding: "8px 0",
                              borderBottom: `1px solid ${palette.border}`,
                              color: palette.muted,
                              fontWeight: 600,
                              fontSize: 11,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Cant. × Preț
                          </th>
                          <th
                            align="right"
                            style={{
                              padding: "8px 0",
                              borderBottom: `1px solid ${palette.border}`,
                              color: palette.muted,
                              fontWeight: 600,
                              fontSize: 11,
                              textTransform: "uppercase",
                              letterSpacing: 1,
                            }}
                          >
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lines.map((line) => {
                          const snap = (line.snapshot_json ?? {}) as Record<string, unknown>
                          const subline = orderLineSnapshotSubline(snap)
                          return (
                          <tr key={line.id}>
                            <td
                              style={{
                                padding: "8px 0",
                                borderBottom: `1px solid ${palette.border}`,
                                color: palette.text,
                                fontWeight: 600,
                              }}
                            >
                              <div>{line.title}</div>
                              {subline && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontWeight: 400,
                                    fontSize: 10,
                                    color: palette.muted,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {subline}
                                </div>
                              )}
                            </td>
                            <td
                              align="right"
                              style={{
                                padding: "8px 0",
                                borderBottom: `1px solid ${palette.border}`,
                                color: palette.text,
                                fontVariantNumeric: "tabular-nums",
                                fontSize: 12,
                              }}
                            >
                              {Number(line.qty).toLocaleString("ro-RO")} {line.unit} ×{" "}
                              {formatRO(line.unit_price_cents, currency)}
                            </td>
                            <td
                              align="right"
                              style={{
                                padding: "8px 0",
                                borderBottom: `1px solid ${palette.border}`,
                                color: palette.text,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatRO(line.line_total_cents, currency)}
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* Total */}
                <tr>
                  <td style={{ padding: "8px 24px 16px" }}>
                    <p
                      style={{
                        margin: 0,
                        textAlign: "right",
                        fontSize: 16,
                        fontWeight: 700,
                        color: palette.text,
                      }}
                    >
                      Total: {formatRO(order.total_cents, currency)}
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        textAlign: "right",
                        fontSize: 11,
                        color: palette.muted,
                      }}
                    >
                      din care TVA 19%: {formatRO(order.vat_cents, currency)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style={{
                      padding: "16px 24px",
                      borderTop: `1px solid ${palette.border}`,
                      color: palette.muted,
                      fontSize: 11,
                      lineHeight: 1.55,
                    }}
                  >
                    Notă: în modul demo nu se procesează plata reală. Rezolvă
                    livrarea cu clientul și marchează comanda ca finalizată din
                    panoul tău de furnizor.
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  )
}
