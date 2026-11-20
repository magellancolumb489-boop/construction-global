/**
 * Proforma documents built from an order snapshot. Pure functions: the PDF
 * and HTML views only render the returned model.
 *
 * Three copies:
 *   seller   — issued by the seller to the buyer: goods + seller transport at
 *              the seller's net prices (no platform commission).
 *   platform — issued by the platform (middleman) to the buyer: commission
 *              (+ platform-organised transport once accepted), plus the
 *              settlement split: collected / owed to seller / kept.
 *   buyer    — what the buyer pays, in one document: goods at buyer prices
 *              (commission included, e.g. 10,000 -> 11,000), transport, VAT,
 *              with a footer saying which part each issuer invoices.
 * None of them is a fiscal invoice (RO e-Factura is issued separately).
 */
import type { PlacedOrder } from "@/app/checkout/actions"
import { orderLineSnapshotSubline } from "@/lib/checkout/order-line-snapshot-detail"

export type ProformaCopy = "seller" | "buyer" | "platform"

export interface ProformaParty {
  name: string
  cui: string | null
  regCom: string | null
  vatId: string | null
  address: string | null
  iban: string | null
  bank: string | null
  email: string | null
  phone: string | null
}

export interface ProformaLine {
  no: number
  description: string
  subline: string | null
  unit: string
  qty: number
  unitPriceCents: number
  valueCents: number
  vatCents: number
}

export interface ProformaSummaryRow {
  label: string
  cents: number
  strong?: boolean
}

export interface ProformaDoc {
  copy: ProformaCopy
  title: string
  subtitle: string
  number: string
  orderNumber: string
  issueDate: string
  dueDate: string | null
  currency: string
  vatRatePct: number
  issuer: ProformaParty
  customer: ProformaParty
  lines: ProformaLine[]
  netCents: number
  vatCents: number
  totalCents: number
  /** Extra summary rows under the totals (buyer split, platform settlement). */
  summary: ProformaSummaryRow[]
  notes: string[]
  warnings: string[]
}

type Snap = Record<string, unknown> | null | undefined

function str(s: Snap, key: string): string | null {
  const v = s?.[key]
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null
}

function obj(s: Snap, key: string): Snap {
  const v = s?.[key]
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Business-profile fiscal_address uses line1/line2; checkout forms use address_line1. */
function addressLine(a: Snap): string | null {
  if (!a) return null
  const parts = [
    str(a, "line1") ?? str(a, "address_line1"),
    str(a, "line2"),
    str(a, "city"),
    str(a, "county"),
    str(a, "postal_code"),
    str(a, "country"),
  ].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}

export function sellerParty(order: PlacedOrder): ProformaParty {
  const s = order.seller_snapshot
  return {
    name: str(s, "company_name") ?? str(s, "display_name") ?? "Furnizor",
    cui: str(s, "tax_id"),
    regCom: str(s, "reg_com"),
    vatId: str(s, "vat_id"),
    address: addressLine(obj(s, "fiscal_address")),
    iban: str(s, "iban"),
    bank: str(s, "bank_name"),
    email: str(s, "auth_email"),
    phone: str(s, "phone"),
  }
}

export function buyerParty(order: PlacedOrder): ProformaParty {
  const b = order.buyer_snapshot
  const form = obj(b, "form_billing") ?? (order.billing_json as Snap)
  const isCompany = form?.["is_company"] === true
  return {
    name:
      (isCompany ? str(form, "company_name") : null) ??
      str(form, "name") ??
      str(b, "company_name") ??
      str(b, "display_name") ??
      "Client",
    cui: (isCompany ? str(form, "vat_number") : null) ?? str(b, "tax_id"),
    regCom: str(b, "reg_com"),
    vatId: str(b, "vat_id"),
    address: addressLine(form) ?? addressLine(obj(b, "fiscal_address")),
    iban: null,
    bank: null,
    email: str(form, "email"),
    phone: str(form, "phone"),
  }
}

export function platformParty(order: PlacedOrder): ProformaParty {
  const p = order.platform_snapshot ?? null
  return {
    name: str(p, "legal_name") ?? "ConstructionHub Romania",
    cui: str(p, "cui"),
    regCom: str(p, "reg_com"),
    vatId: str(p, "vat_id"),
    address: str(p, "address"),
    iban: str(p, "iban"),
    bank: str(p, "bank"),
    email: str(p, "email"),
    phone: str(p, "phone"),
  }
}

const vatOf = (netCents: number, rate: number) => Math.round(netCents * rate)

function platformTransportAccepted(order: PlacedOrder): { net: number; vat: number } | null {
  const t = order.transport
  if (!t || t.mode === "seller" || t.quote_cents == null) return null
  if (!["accepted", "assigned", "in_transit", "delivered"].includes(t.status)) return null
  return { net: t.quote_cents, vat: t.quote_vat_cents ?? 0 }
}

function partyWarnings(label: string, p: ProformaParty, needsBank: boolean): string[] {
  const w: string[] = []
  if (!p.cui) w.push(`${label}: lipsește CUI / CNP.`)
  if (!p.address) w.push(`${label}: lipsește adresa fiscală.`)
  if (needsBank && !p.iban) w.push(`${label}: lipsește IBAN-ul.`)
  return w
}

export function buildProforma(order: PlacedOrder, copy: ProformaCopy): ProformaDoc {
  const rate = order.vat_rate ?? 0.19
  const vatPct = Math.round(rate * 100)
  const currency = order.currency || "RON"
  const commissionPct = Math.round((order.commission_rate ?? 0) * 1000) / 10
  const seller = sellerParty(order)
  const buyer = buyerParty(order)
  const platform = platformParty(order)
  const base = {
    copy,
    orderNumber: order.order_number,
    issueDate: order.created_at,
    dueDate: order.payment_due_at ?? null,
    currency,
    vatRatePct: vatPct,
  }
  const commonNotes = [
    "Document informativ (factură proformă). Nu ține loc de factură fiscală; factura se emite prin RO e-Factura.",
  ]
  const pendingTransport =
    order.transport && order.transport.mode !== "seller" && !platformTransportAccepted(order)
      ? "Transportul este organizat de platformă și nu este inclus; oferta se confirmă separat."
      : null

  if (copy === "seller") {
    const lines: ProformaLine[] = []
    for (const l of order.lines) {
      const goods = l.line_total_cents - l.transport_cents
      lines.push({
        no: lines.length + 1,
        description: l.title,
        subline: orderLineSnapshotSubline(l.snapshot_json ?? null),
        unit: l.unit,
        qty: l.qty,
        unitPriceCents: l.unit_price_cents,
        valueCents: goods,
        vatCents: vatOf(goods, rate),
      })
      if (l.transport_cents > 0) {
        lines.push({
          no: lines.length + 1,
          description: `Transport — ${l.title}`,
          subline: null,
          unit: "SERV",
          qty: 1,
          unitPriceCents: l.transport_cents,
          valueCents: l.transport_cents,
          vatCents: vatOf(l.transport_cents, rate),
        })
      }
    }
    const net = order.subtotal_cents + order.transport_cents
    const vat = order.seller_vat_cents ?? order.vat_cents
    return {
      ...base,
      title: "FACTURĂ PROFORMĂ",
      subtitle: "Exemplar furnizor",
      number: order.deviz_number,
      issuer: seller,
      customer: buyer,
      lines,
      netCents: net,
      vatCents: vat,
      totalCents: net + vat,
      summary: [],
      notes: [
        ...commonNotes,
        "Încasarea se face prin platformă; suma se decontează furnizorului conform contractului de intermediere.",
        ...(pendingTransport ? [pendingTransport] : []),
      ],
      warnings: partyWarnings("Furnizor", seller, true),
    }
  }

  if (copy === "platform") {
    const lines: ProformaLine[] = []
    if ((order.commission_cents ?? 0) > 0) {
      lines.push({
        no: 1,
        description: `Comision intermediere platformă (${commissionPct}%)`,
        subline: `Comanda ${order.order_number} · valoare bunuri ${(order.subtotal_cents / 100).toFixed(2)} ${currency}`,
        unit: "SERV",
        qty: 1,
        unitPriceCents: order.commission_cents ?? 0,
        valueCents: order.commission_cents ?? 0,
        vatCents: order.platform_vat_cents ?? 0,
      })
    }
    const pt = platformTransportAccepted(order)
    if (pt) {
      lines.push({
        no: lines.length + 1,
        description: "Transport organizat de platformă",
        subline: order.transport?.carrier_name ? `Transportator: ${order.transport.carrier_name}` : null,
        unit: "SERV",
        qty: 1,
        unitPriceCents: pt.net,
        valueCents: pt.net,
        vatCents: pt.vat,
      })
    }
    const net = lines.reduce((a, l) => a + l.valueCents, 0)
    const vat = lines.reduce((a, l) => a + l.vatCents, 0)
    const sellerShare = order.subtotal_cents + order.transport_cents + (order.seller_vat_cents ?? order.vat_cents)
    return {
      ...base,
      title: "FACTURĂ PROFORMĂ",
      subtitle: "Exemplar intermediar (platformă)",
      number: order.platform_doc_number ?? `COM-${order.order_number}`,
      issuer: platform,
      customer: buyer,
      lines,
      netCents: net,
      vatCents: vat,
      totalCents: net + vat,
      summary: [
        { label: "Încasat / de încasat de la cumpărător", cents: order.total_cents + (pt ? pt.net + pt.vat : 0), strong: true },
        { label: `De virat furnizorului (${seller.name})`, cents: sellerShare },
        { label: "Rămâne la platformă (comision + TVA)", cents: (order.commission_cents ?? 0) + (order.platform_vat_cents ?? 0) },
        ...(pt ? [{ label: "Transport de plătit transportatorului (cu TVA)", cents: pt.net + pt.vat }] : []),
      ],
      notes: [...commonNotes, ...(pendingTransport ? [pendingTransport] : [])],
      warnings: partyWarnings("Platformă", platform, true),
    }
  }

  // buyer copy: goods at buyer prices (commission folded in), one total to pay.
  const lines: ProformaLine[] = []
  for (const l of order.lines) {
    const goods = l.line_total_cents - l.transport_cents + (l.commission_cents ?? 0)
    lines.push({
      no: lines.length + 1,
      description: l.title,
      subline: orderLineSnapshotSubline(l.snapshot_json ?? null),
      unit: l.unit,
      qty: l.qty,
      unitPriceCents: l.qty > 0 ? Math.round(goods / l.qty) : goods,
      valueCents: goods,
      vatCents: vatOf(goods, rate),
    })
    if (l.transport_cents > 0) {
      lines.push({
        no: lines.length + 1,
        description: `Transport — ${l.title}`,
        subline: null,
        unit: "SERV",
        qty: 1,
        unitPriceCents: l.transport_cents,
        valueCents: l.transport_cents,
        vatCents: vatOf(l.transport_cents, rate),
      })
    }
  }
  const pt = platformTransportAccepted(order)
  if (pt) {
    lines.push({
      no: lines.length + 1,
      description: "Transport organizat de platformă",
      subline: null,
      unit: "SERV",
      qty: 1,
      unitPriceCents: pt.net,
      valueCents: pt.net,
      vatCents: pt.vat,
    })
  }
  const net = order.subtotal_cents + order.transport_cents + (order.commission_cents ?? 0) + (pt?.net ?? 0)
  // VAT from the order (rounded per issuer) so the total equals what is charged.
  const vat = order.vat_cents + (pt?.vat ?? 0)
  return {
    ...base,
    title: "FACTURĂ PROFORMĂ",
    subtitle: "Exemplar cumpărător",
    number: order.order_number,
    issuer: seller,
    customer: buyer,
    lines,
    netCents: net,
    vatCents: vat,
    totalCents: net + vat,
    summary: [
      {
        label: `Din care furnizor (${seller.name}), proforma ${order.deviz_number}`,
        cents: order.subtotal_cents + order.transport_cents + (order.seller_vat_cents ?? order.vat_cents),
      },
      {
        label: `Din care platformă, proforma ${order.platform_doc_number ?? "-"}`,
        cents: (order.commission_cents ?? 0) + (order.platform_vat_cents ?? 0) + (pt ? pt.net + pt.vat : 0),
      },
    ],
    notes: [...commonNotes, ...(pendingTransport ? [pendingTransport] : [])],
    warnings: partyWarnings("Cumpărător", buyer, false),
  }
}

/** Which copies a viewer may open. Buyer: buyer; seller: seller; admin (middleman): all. */
export function allowedProformaCopies(role: "buyer" | "seller" | "admin"): ProformaCopy[] {
  if (role === "admin") return ["buyer", "seller", "platform"]
  return [role]
}
