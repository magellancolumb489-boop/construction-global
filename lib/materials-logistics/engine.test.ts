import { describe, expect, it } from "vitest"
import {
  buyerTransportOptions,
  eligibleSellerOffers,
  estimateTotalMassKg,
} from "./engine"
import type { MaterialLogisticsSpec } from "./engine"
import type { TransportOfferRow } from "./engine"

function baseSpec(
  overrides: Partial<MaterialLogisticsSpec> = {},
): MaterialLogisticsSpec {
  return {
    categoryCode: "ALTE_MATERIALE",
    materialCode: "ciment",
    maxPieceLengthM: null,
    palletSacKg: null,
    palletPieces: null,
    palletTotalKg: null,
    macaraAddon: false,
    macaraFee: null,
    allowNonBulkTransport: false,
    ...overrides,
  }
}

describe("eligibleSellerOffers", () => {
  it("bulk category rejects non-autobasculanta without override", () => {
    const spec = baseSpec({
      categoryCode: "AGREGATE_CARIERA",
      materialCode: "criblura_0_4",
    })
    const offers: TransportOfferRow[] = [
      { vehicleCode: "TIR", payloadT: 24 },
      { vehicleCode: "AUTOBASCULANTA", payloadT: 18 },
    ]
    const r = eligibleSellerOffers(spec, offers)
    expect(r.map((x) => x.vehicleCode)).toEqual(["AUTOBASCULANTA"])
  })

  it("allows other vehicles when allowNonBulkTransport", () => {
    const spec = baseSpec({
      categoryCode: "AGREGATE_BALASTIERA",
      materialCode: "balast_0_63",
      allowNonBulkTransport: true,
    })
    const offers: TransportOfferRow[] = [{ vehicleCode: "TIR", payloadT: 24 }]
    expect(eligibleSellerOffers(spec, offers)).toHaveLength(1)
  })

  it("long material filters by length band", () => {
    const spec = baseSpec({
      materialCode: "bare_de_otel",
      maxPieceLengthM: 3,
    })
    const offers: TransportOfferRow[] = [
      { vehicleCode: "DUBA", payloadT: 3.5 },
      { vehicleCode: "AUTOUTILITARA", payloadT: 3.5 },
      { vehicleCode: "CAMION_BENA", payloadT: 12 },
      { vehicleCode: "TIR", payloadT: 24 },
    ]
    const r = eligibleSellerOffers(spec, offers)
    expect(r.map((x) => x.vehicleCode).sort()).toEqual(["AUTOUTILITARA", "CAMION_BENA"])
  })
})

describe("buyerTransportOptions", () => {
  it("proposes multi-trip vs larger vehicle (Rule 2 style)", () => {
    const spec = baseSpec()
    const sellerOffers: TransportOfferRow[] = [
      { vehicleCode: "DUBA", payloadT: 3.5 },
      { vehicleCode: "TIR", payloadT: 24 },
    ]
    const res = buyerTransportOptions({
      spec,
      sellerOffers,
      qty: 12,
      unit: "TON",
    })
    expect(res.options.length).toBeGreaterThanOrEqual(1)
    const optA = res.options.find((o) => o.id === "A")
    expect(optA?.trips).toBeGreaterThanOrEqual(4)
    const optB = res.options.find((o) => o.id === "B")
    expect(optB?.trips).toBe(1)
    expect(optB?.vehicleCode).toBe("TIR")
  })
})

describe("estimateTotalMassKg", () => {
  it("uses pallet total when pallet count given", () => {
    const spec = baseSpec({ palletTotalKg: 1000 })
    expect(
      estimateTotalMassKg({
        qty: 1,
        unit: "BUC",
        spec,
        palletCount: 3,
      }),
    ).toBe(3000)
  })
})
