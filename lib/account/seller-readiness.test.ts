import { describe, expect, it } from "vitest"
import { sellerMissing } from "./seller-readiness"
import { isValidRoPhone } from "@/lib/validation/ro-fiscal"

describe("sellerMissing (twin of public.seller_missing_requirements)", () => {
  it("lists everything for an empty profile", () => {
    expect(sellerMissing({})).toEqual(["display_name", "phone", "entity_type", "fiscal_address", "iban"])
  })

  it("company sellers also need name and a valid CUI", () => {
    const m = sellerMissing({
      display_name: "Ion",
      phone: "0722123456",
      entity_type: "SRL",
      fiscal_address: { line1: "Str. A 1", city: "Cluj" },
      iban: "RO49AAAA1B31007593840000",
      tax_id: "18547291",
    })
    expect(m).toEqual(["company_name", "tax_id"])
  })

  it("a complete PF seller is ready", () => {
    expect(
      sellerMissing({
        display_name: "Ion Pop",
        phone: "+40 722 123 456",
        entity_type: "PF",
        fiscal_address: { line1: "Str. A 1", city: "Cluj" },
        iban: "RO49AAAA1B31007593840000",
      }),
    ).toEqual([])
  })
})

describe("isValidRoPhone (twin of public.ro_phone_valid)", () => {
  it("accepts RO mobile/landline and E.164, rejects junk", () => {
    expect(isValidRoPhone("0722 123 456")).toBe(true)
    expect(isValidRoPhone("+40 722.123.456")).toBe(true)
    expect(isValidRoPhone("0040212345678")).toBe(true)
    expect(isValidRoPhone("+4915112345678")).toBe(true)
    expect(isValidRoPhone("12345")).toBe(false)
    expect(isValidRoPhone("0822123456")).toBe(false)
  })
})
