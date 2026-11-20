import { describe, expect, it } from "vitest"
import { isValidCui, isValidIban, isValidRegCom, normalizeCui, normalizeIban } from "./ro-fiscal"

describe("CUI check digit", () => {
  it("accepts valid CUIs with or without RO prefix", () => {
    // 18547290 is a commonly cited valid example for the ANAF algorithm.
    expect(isValidCui("18547290")).toBe(true)
    expect(isValidCui("RO18547290")).toBe(true)
    expect(isValidCui("ro 18547290")).toBe(true)
  })
  it("rejects a wrong check digit or garbage", () => {
    expect(isValidCui("18547291")).toBe(false)
    expect(isValidCui("RO12345678")).toBe(false)
    expect(isValidCui("ABC")).toBe(false)
  })
  it("normalizes", () => {
    expect(normalizeCui(" ro 123 ")).toBe("123")
  })
})

describe("IBAN mod-97", () => {
  it("accepts a valid Romanian IBAN in any spacing/case", () => {
    expect(isValidIban("RO49AAAA1B31007593840000")).toBe(true)
    expect(isValidIban("ro49 aaaa 1b31 0075 9384 0000")).toBe(true)
    expect(normalizeIban("ro49 aaaa")).toBe("RO49AAAA")
  })
  it("rejects typos and wrong length", () => {
    expect(isValidIban("RO49AAAA1B31007593840001")).toBe(false)
    expect(isValidIban("RO49AAAA1B3100759384000")).toBe(false)
  })
})

describe("Reg. Com.", () => {
  it("accepts old and new ONRC formats", () => {
    expect(isValidRegCom("J12/3456/2020")).toBe(true)
    expect(isValidRegCom("J40/12345/1998")).toBe(true)
    expect(isValidRegCom("J2024001234401")).toBe(true)
  })
  it("rejects malformed numbers", () => {
    expect(isValidRegCom("J12-3456-2020")).toBe(false)
    expect(isValidRegCom("12/3456/2020")).toBe(false)
  })
})
