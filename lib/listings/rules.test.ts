import { describe, expect, it } from "vitest"
import { checkPrice, containsContactInfo, listingCoreIssues, priceRange, type ListingCore } from "./rules"

const base: ListingCore = {
  listing_type: "materials",
  title: "Nisip 0-4 spalat, balastiera Ilfov",
  description: "Nisip spalat 0-4, livrare zilnic intre 7 si 17, incarcare cu buldoexcavator.",
  price: 60,
  unit: "TON",
  available_qty: 500,
  min_order_qty: 5,
  location: "Ilfov",
}

describe("listingCoreIssues", () => {
  it("accepts a complete listing", () => {
    expect(listingCoreIssues(base)).toEqual([])
  })

  it("blocks contact data that would bypass the platform", () => {
    for (const desc of [
      "Sunati la 0722 123 456 pentru detalii suplimentare despre livrare.",
      "Scrieti pe vanzari@firma.ro pentru oferta speciala de volum mare.",
      "Detalii pe www.firma.ro si pe pagina noastra de facebook oficiala.",
      "Contact rapid pe WhatsApp pentru comenzi mari si livrari urgente.",
    ]) {
      expect(listingCoreIssues({ ...base, description: desc }).map((i) => i.path)).toContain("description")
    }
  })

  it("does not flag ordinary numbers (fractions, quantities, years)", () => {
    expect(containsContactInfo("Sort 16-31.5, 24 tone pe cursa, an 2021")).toBe(false)
  })

  it("requires equipment details and service area", () => {
    const eq = listingCoreIssues({ ...base, listing_type: "equipment", unit: "BUC" }).map((i) => i.path)
    expect(eq).toEqual(expect.arrayContaining(["equipment_condition", "equipment_model", "equipment_year"]))
    const sv = listingCoreIssues({ ...base, listing_type: "services", unit: "BUC" }).map((i) => i.path)
    expect(sv).toContain("service_area")
  })

  it("rejects min order above stock and short titles", () => {
    const paths = listingCoreIssues({ ...base, title: "Nisip", min_order_qty: 900 }).map((i) => i.path)
    expect(paths).toEqual(expect.arrayContaining(["title", "min_order_qty"]))
  })
})

describe("price plausibility", () => {
  it("catches the KG vs TON mistake on aggregates", () => {
    const r = priceRange("materials", "TON", "AGREGATE_CARIERA", "criblura_8_16")
    expect(checkPrice(60, r).status).toBe("ok")
    expect(checkPrice(400, r).status).toBe("warn")
    expect(checkPrice(20000, r).status).toBe("block")
  })
  it("has no opinion on materials without a reference range", () => {
    expect(priceRange("materials", "KG", "DIMENSIUNI_MICI", "cuie")).toBeNull()
  })
})
