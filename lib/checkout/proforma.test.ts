import { describe, expect, it } from "vitest"
import type { PlacedOrder } from "@/app/checkout/actions"
import { allowedProformaCopies, buildProforma } from "./proforma"
import { orderAmounts } from "@/lib/pricing/commission"

// Mirrors the live place_order v4 test: 30 t at 75 RON + 2 trips x 500 RON, 10% commission.
function order(overrides: Partial<PlacedOrder> = {}): PlacedOrder {
  return {
    id: "o1",
    order_number: "ORD-20261120-0002",
    deviz_number: "DEV-20261120-0002",
    platform_doc_number: "COM-20261120-0002",
    buyer_id: "b",
    seller_id: "s",
    currency: "RON",
    subtotal_cents: 225000,
    transport_cents: 100000,
    commission_rate: 0.1,
    commission_cents: 22500,
    seller_vat_cents: 61750,
    platform_vat_cents: 4275,
    vat_cents: 66025,
    vat_rate: 0.19,
    total_cents: 413525,
    payment_due_at: "2026-11-25T00:00:00Z",
    status: "pending",
    payment_status: "demo_paid",
    payment_provider: "demo",
    notes: null,
    billing_json: null,
    shipping_json: null,
    buyer_snapshot: {
      form_billing: { name: "Ion Pop", is_company: true, company_name: "Constructii SRL", vat_number: "RO123", address_line1: "Str. A 1", city: "Cluj" },
    },
    seller_snapshot: {
      company_name: "Cariera SA",
      tax_id: "RO999",
      reg_com: "J12/1/2020",
      iban: "RO49AAAA1B31007593840000",
      bank_name: "Banca X",
      fiscal_address: { line1: "Str. Carierei 2", city: "Turda", county: "Cluj", country: "RO" },
    },
    platform_snapshot: { legal_name: "ConstructionHub SRL", cui: "RO111", address: "Bucuresti", iban: "RO49BBBB1B31007593840000" },
    created_at: "2026-11-20T10:00:00Z",
    transport: null,
    lines: [
      {
        id: 1,
        listing_id: 10,
        title: "Criblura 4-8",
        unit: "TON",
        qty: 30,
        unit_price_cents: 7500,
        transport_cents: 100000,
        line_total_cents: 325000,
        commission_cents: 22500,
        snapshot_json: null,
      },
    ],
    ...overrides,
  }
}

describe("buildProforma", () => {
  it("seller copy: seller prices, no commission, seller VAT", () => {
    const d = buildProforma(order(), "seller")
    expect(d.issuer.name).toBe("Cariera SA")
    expect(d.issuer.address).toBe("Str. Carierei 2, Turda, Cluj, RO")
    expect(d.number).toBe("DEV-20261120-0002")
    expect(d.lines.map((l) => l.valueCents)).toEqual([225000, 100000])
    expect(d.netCents).toBe(325000)
    expect(d.vatCents).toBe(61750)
    expect(d.totalCents).toBe(386750)
    expect(d.warnings).toEqual([])
  })

  it("buyer copy: commission folded into the goods price, total equals the charge", () => {
    const d = buildProforma(order(), "buyer")
    // 75 RON seller price -> 82.50 RON shown to the buyer
    expect(d.lines[0].unitPriceCents).toBe(8250)
    expect(d.lines[0].valueCents).toBe(247500)
    expect(d.totalCents).toBe(413525)
    expect(d.summary[0].cents + d.summary[1].cents).toBe(413525)
    expect(d.customer.name).toBe("Constructii SRL")
    expect(d.customer.cui).toBe("RO123")
  })

  it("platform copy: commission invoice + settlement split", () => {
    const d = buildProforma(order(), "platform")
    expect(d.issuer.name).toBe("ConstructionHub SRL")
    expect(d.lines).toHaveLength(1)
    expect(d.lines[0].valueCents).toBe(22500)
    expect(d.totalCents).toBe(26775)
    const [collected, toSeller, kept] = d.summary
    expect(collected.cents).toBe(413525)
    expect(toSeller.cents).toBe(386750)
    expect(kept.cents).toBe(26775)
    expect(toSeller.cents + kept.cents).toBe(collected.cents)
  })

  it("accepted platform transport appears on buyer and platform copies only", () => {
    const transport = {
      order_id: "o1", mode: "platform" as const, status: "accepted", quote_cents: 120000, quote_vat_cents: 22800,
      quote_note: null, quote_expires_at: null, paid: true, carrier_name: null, carrier_phone: null,
      scheduled_for: null, delivered_at: null, failure_reason: null, requote_count: 0,
    }
    const o = order({ transport, transport_cents: 0, total_cents: 413525 - 100000 - 19000 })
    expect(buildProforma(o, "seller").lines.some((l) => l.description.includes("platformă"))).toBe(false)
    expect(buildProforma(o, "buyer").lines.at(-1)?.valueCents).toBe(120000)
    expect(buildProforma(o, "platform").lines.at(-1)?.valueCents).toBe(120000)
  })

  it("flags missing seller fiscal data instead of printing blanks", () => {
    const d = buildProforma(order({ seller_snapshot: { display_name: "ion" } }), "seller")
    expect(d.warnings.length).toBe(3)
  })

  it("viewer access: each party sees its copy, the middleman sees all", () => {
    expect(allowedProformaCopies("buyer")).toEqual(["buyer"])
    expect(allowedProformaCopies("seller")).toEqual(["seller"])
    expect(allowedProformaCopies("admin")).toEqual(["buyer", "seller", "platform"])
  })
})

describe("orderAmounts mirrors place_order v4", () => {
  it("matches the live test order to the cent", () => {
    const a = orderAmounts(225000, 100000, { commissionRate: 0.1, commissionOnTransport: false, vatRate: 0.19 })
    expect(a.commissionCents).toBe(22500)
    expect(a.sellerVatCents).toBe(61750)
    expect(a.platformVatCents).toBe(4275)
    expect(a.totalCents).toBe(413525)
  })

  it("10,000 RON listing is 11,000 RON to the buyer", () => {
    const a = orderAmounts(1_000_000, 0, { commissionRate: 0.1, commissionOnTransport: false, vatRate: 0.19 })
    expect(a.goodsCents + a.commissionCents).toBe(1_100_000)
  })
})
