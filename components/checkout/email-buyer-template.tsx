// Pure JSX template — table-based + inline styles so any future
// SendGrid/Mailgun adapter just renders it to a string. No Tailwind.

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
  accent: "#0f766e",
}

export interface EmailBuyerTemplateProps {
  order: PlacedOrder
}

export function EmailBuyerTemplate({ order }: EmailBuyerTemplateProps) {
  const currency = order.currency || "RON"
  const buyer = order.buyer_snapshot
  const buyerForm = readObject(buyer, "form_billing")
  const supplier = order.seller_snapshot
  const buyerName =
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
                {/* Header */}
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
                      Confirmare comandă
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

                {/* Body */}
                <tr>
                  <td style={{ padding: "24px", color: palette.text }}>
                    <p style={{ margin: 0, fontSize: 14 }}>Salut {buyerName},</p>
                    <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55 }}>
                      Mulțumim pentru comandă! Am înregistrat plata în mod{" "}
                      <strong>demo</strong> și am pregătit devizul cu numărul{" "}
                      <strong>{order.deviz_number ?? "DEV-—"}</strong> atașat
                      acestui email. Furnizorul{" "}
                      <strong>
                        {readString(supplier, "company_name") ||
                          readString(supplier, "display_name") ||
                          "—"}
                      </strong>{" "}
                      a fost notificat și te va contacta pentru livrare.
                    </p>
                  </td>
                </tr>

                {/* Lines summary */}
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
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{line.title}</div>
                              {subline && (
                                <div
                                  style={{
                                    color: palette.muted,
                                    fontSize: 10,
                                    marginTop: 3,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {subline}
                                </div>
                              )}
                              <div
                                style={{
                                  color: palette.muted,
                                  fontSize: 11,
                                  marginTop: 2,
                                }}
                              >
                                {Number(line.qty).toLocaleString("ro-RO")} {line.unit} ·{" "}
                                {formatRO(line.unit_price_cents, currency)}
                              </div>
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

                {/* Totals */}
                <tr>
                  <td style={{ padding: "8px 24px 4px" }}>
                    <table width="100%" cellPadding={0} cellSpacing={0}>
                      <tbody>
                        <tr>
                          <td style={{ color: palette.muted, fontSize: 12 }}>
                            Subtotal
                          </td>
                          <td
                            align="right"
                            style={{ color: palette.text, fontSize: 12 }}
                          >
                            {formatRO(order.subtotal_cents, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: palette.muted, fontSize: 12 }}>
                            Transport
                          </td>
                          <td
                            align="right"
                            style={{ color: palette.text, fontSize: 12 }}
                          >
                            {formatRO(order.transport_cents, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: palette.muted, fontSize: 12 }}>
                            TVA 19%
                          </td>
                          <td
                            align="right"
                            style={{ color: palette.text, fontSize: 12 }}
                          >
                            {formatRO(order.vat_cents, currency)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              borderTop: `1px solid ${palette.border}`,
                              paddingTop: 8,
                              color: palette.text,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            Total
                          </td>
                          <td
                            align="right"
                            style={{
                              borderTop: `1px solid ${palette.border}`,
                              paddingTop: 8,
                              color: palette.text,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {formatRO(order.total_cents, currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* CTA */}
                <tr>
                  <td style={{ padding: "16px 24px 24px" }}>
                    <a
                      href={`/account/orders/${order.id}`}
                      style={{
                        display: "inline-block",
                        backgroundColor: palette.accent,
                        color: "#ffffff",
                        padding: "10px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Vezi comanda în cont →
                    </a>
                  </td>
                </tr>

                {/* Footer */}
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
                    Acest email este generat automat de ConstructionHub Romania.
                    Pentru întrebări, răspunde direct sau contactează furnizorul
                    din pagina comenzii.
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
