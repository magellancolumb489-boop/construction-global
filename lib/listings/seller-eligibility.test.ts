import { describe, expect, it } from "vitest"
import { isCompanyEntity, listingTypeAllowed, materialAllowed } from "./seller-eligibility"

describe("seller eligibility", () => {
  it("treats only non-PF entities as companies", () => {
    expect(isCompanyEntity("PF")).toBe(false)
    expect(isCompanyEntity(null)).toBe(false)
    expect(isCompanyEntity("SRL")).toBe(true)
    expect(isCompanyEntity("PFA")).toBe(true)
  })

  it("blocks concrete listings for PF only", () => {
    expect(listingTypeAllowed("PF", "concrete")).toBe(false)
    expect(listingTypeAllowed("SRL", "concrete")).toBe(true)
    expect(listingTypeAllowed("PF", "materials")).toBe(true)
    expect(listingTypeAllowed("PF", "services")).toBe(true)
  })

  it("blocks company-only materials for PF only", () => {
    expect(materialAllowed("PF", "ciment")).toBe(false)
    expect(materialAllowed("PF", "bitum_rutier_50_70")).toBe(false)
    expect(materialAllowed("SRL", "ciment")).toBe(true)
    expect(materialAllowed("PF", "nisip_0_4")).toBe(true)
  })
})
