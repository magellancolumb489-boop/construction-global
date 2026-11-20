import { describe, expect, it } from "vitest"
import {
  buyerTransportOptions,
  eligibleSellerOffers,
  estimatePlatformTransport,
  estimateTotalMassKg,
  estimateVolumeM3,
} from "./engine"
import type { MaterialLogisticsSpec } from "./engine"
import type { TransportOfferRow } from "./engine"
import {
  isUnitAllowedForMaterial,
  isValidPayload,
  macaraAllowedFor,
  requiresKgPerUnit,
  requiresTanker,
} from "./catalog"

function baseSpec(
  overrides: Partial<MaterialLogisticsSpec> = {},
): MaterialLogisticsSpec {
  return {
    categoryCode: "DIMENSIUNI_MEDII",
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
      categoryCode: "ALTE_MATERIALE",
      materialCode: "bare_de_otel",
      maxPieceLengthM: 3,
    })
    const offers: TransportOfferRow[] = [
      { vehicleCode: "DUBA", payloadT: 1.5 },
      { vehicleCode: "AUTOUTILITARA", payloadT: 3.5 },
      { vehicleCode: "CAMION_BENA", payloadT: 12 },
      { vehicleCode: "CAMION_PLATFORMA", payloadT: 12 },
      { vehicleCode: "TIR", payloadT: 24 },
    ]
    const r = eligibleSellerOffers(spec, offers)
    expect(r.map((x) => x.vehicleCode).sort()).toEqual([
      "AUTOUTILITARA",
      "CAMION_BENA",
      "CAMION_PLATFORMA",
    ])
  })

  it("long material with unknown length only goes on TIR / trailer", () => {
    const spec = baseSpec({ categoryCode: "ALTE_MATERIALE", materialCode: "bare_de_otel" })
    const offers: TransportOfferRow[] = [
      { vehicleCode: "DUBA", payloadT: 1.5 },
      { vehicleCode: "CAMION_BENA", payloadT: 12 },
      { vehicleCode: "TIR", payloadT: 24 },
    ]
    expect(eligibleSellerOffers(spec, offers).map((x) => x.vehicleCode)).toEqual(["TIR"])
  })

  it("tanker materials get no vehicle at all", () => {
    const spec = baseSpec({ categoryCode: "ALTE_MATERIALE", materialCode: "bitum_rutier_50_70" })
    const offers: TransportOfferRow[] = [{ vehicleCode: "DUBA", payloadT: 1 }]
    expect(eligibleSellerOffers(spec, offers, "TON")).toEqual([])
  })
})

describe("buyerTransportOptions", () => {
  it("proposes multi-trip vs larger vehicle (Rule 2 style)", () => {
    // 300 bags x 40 kg = 12 t of bagged cement
    const spec = baseSpec()
    const sellerOffers: TransportOfferRow[] = [
      { vehicleCode: "DUBA", payloadT: 1.5 },
      { vehicleCode: "TIR", payloadT: 24 },
    ]
    const res = buyerTransportOptions({ spec, sellerOffers, qty: 300, unit: "BUC" })
    const optA = res.options.find((o) => o.id === "A")
    expect(optA?.vehicleCode).toBe("DUBA")
    expect(optA?.trips).toBe(8)
    const optB = res.options.find((o) => o.id === "B")
    expect(optB?.trips).toBe(1)
    expect(optB?.vehicleCode).toBe("TIR")
  })

  it("loose cement (ALTE_MATERIALE, TON) becomes a manual tanker offer", () => {
    const spec = baseSpec({ categoryCode: "ALTE_MATERIALE" })
    const res = buyerTransportOptions({ spec, sellerOffers: [], qty: 12, unit: "TON" })
    expect(res.options).toEqual([])
    expect(res.manualReason).toBe("tanker")
  })

  it("bagged cement from the same category travels palletised", () => {
    const spec = baseSpec({ categoryCode: "ALTE_MATERIALE" })
    const res = buyerTransportOptions({ spec, sellerOffers: [], qty: 50, unit: "BUC" })
    expect(res.manualReason).toBeUndefined()
    expect(res.marketplaceAssigned).toBe(true)
    expect(res.options.length).toBeGreaterThan(0)
  })

  it("marketplace defaults never put aggregates on a van", () => {
    const spec = baseSpec({ categoryCode: "AGREGATE_BALASTIERA", materialCode: "nisip_0_4" })
    const res = buyerTransportOptions({ spec, sellerOffers: [], qty: 2, unit: "TON" })
    expect(res.options.every((o) => o.vehicleCode === "AUTOBASCULANTA")).toBe(true)
  })
})

describe("estimateTotalMassKg", () => {
  it("pallet count can raise but never lower the quantity-based mass", () => {
    const spec = baseSpec({ palletTotalKg: 1000 })
    // 1000 bags x 40 kg = 40 t; buyer types 1 pallet
    expect(estimateTotalMassKg({ qty: 1000, unit: "BUC", spec, palletCount: 1 })).toBe(40000)
    // 10 bags = 400 kg; 3 full pallets declared = 3 t
    expect(estimateTotalMassKg({ qty: 10, unit: "BUC", spec, palletCount: 3 })).toBe(3000)
  })

  it("uses the seller's kg per unit over the profile default", () => {
    const spec = baseSpec({ palletSacKg: 25 })
    expect(estimateTotalMassKg({ qty: 100, unit: "BUC", spec })).toBe(2500)
  })

  it("uses material density for M3, not a flat 1600", () => {
    const vata = baseSpec({ materialCode: "vata_minerala_sticla" })
    expect(estimateTotalMassKg({ qty: 10, unit: "M3", spec: vata })).toBe(200)
    const balast = baseSpec({ categoryCode: "AGREGATE_BALASTIERA", materialCode: "balast_0_63" })
    expect(estimateTotalMassKg({ qty: 10, unit: "M3", spec: balast })).toBe(19000)
  })

  it("derives volume for volumetric pieces from kg per unit and density", () => {
    const vata = baseSpec({ materialCode: "vata_minerala_bazaltica", palletSacKg: 10 })
    expect(estimateVolumeM3({ qty: 50, unit: "BUC", spec: vata })).toBe(5)
  })
})

describe("catalog rules", () => {
  it("aggregates cannot be sold by KG or piece", () => {
    expect(isUnitAllowedForMaterial("AGREGATE_CARIERA", "criblura_8_16", "KG")).toBe(false)
    expect(isUnitAllowedForMaterial("AGREGATE_CARIERA", "criblura_8_16", "BUC")).toBe(false)
    expect(isUnitAllowedForMaterial("AGREGATE_CARIERA", "criblura_8_16", "TON")).toBe(true)
  })

  it("van payload is capped at legal load", () => {
    expect(isValidPayload("DUBA", 1.5)).toBe(true)
    expect(isValidPayload("DUBA", 2)).toBe(false)
    expect(isValidPayload("DUBA", 3.5)).toBe(false)
  })

  it("pieces without a safe default require the seller's kg per unit", () => {
    expect(requiresKgPerUnit("DIMENSIUNI_MEDII", "caramizi", "BUC")).toBe(true)
    expect(requiresKgPerUnit("DIMENSIUNI_MEDII", "ciment", "BUC")).toBe(false)
    expect(requiresKgPerUnit("DIMENSIUNI_MICI", "cuie", "KG")).toBe(false)
  })

  it("tanker and crane rules", () => {
    expect(requiresTanker("ALTE_MATERIALE", "ciment", "TON")).toBe(true)
    expect(requiresTanker("ALTE_MATERIALE", "ciment", "BUC")).toBe(false)
    expect(requiresTanker("DIMENSIUNI_MEDII", "ciment", "TON")).toBe(false)
    expect(macaraAllowedFor("AGREGATE_CARIERA", "criblura_4_8", "TON")).toBe(false)
    expect(macaraAllowedFor("DIMENSIUNI_MEDII", "caramizi", "BUC")).toBe(true)
  })
})

describe("estimatePlatformTransport", () => {
  it("applies the 200 RON minimum and 12 RON/km one way per trip", () => {
    expect(estimatePlatformTransport(10, 1)).toBe(200)
    expect(estimatePlatformTransport(30, 1)).toBe(360)
    expect(estimatePlatformTransport(30, 2)).toBe(720)
    expect(estimatePlatformTransport(null, 1)).toBeNull()
  })
})
