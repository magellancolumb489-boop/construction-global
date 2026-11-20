/**
 * Romanian fiscal identifiers, validated by their check digits rather than by
 * shape only. These end up on proformas and invoices, so a typo must be
 * caught at input time, not by the accountant.
 */

/** Strip spaces and an optional "RO" prefix: "RO 1234567" -> "1234567". */
export function normalizeCui(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/^RO/, "")
}

/**
 * CUI / CIF control digit (ANAF algorithm, key 753217532):
 * pad the body (all digits but the last) to 9 digits on the left, multiply
 * digit-wise by the key, sum * 10 mod 11; 10 becomes 0. Must equal the last digit.
 */
export function isValidCui(raw: string): boolean {
  const cui = normalizeCui(raw)
  if (!/^\d{2,10}$/.test(cui)) return false
  const key = "753217532"
  const control = Number(cui.at(-1))
  const body = cui.slice(0, -1).padStart(9, "0")
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(body[i]) * Number(key[i])
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === control
}

/** "ro49 aaaa 1b31..." -> "RO49AAAA1B31..." */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

/** ISO 13616 mod-97 check; Romanian IBANs are exactly 24 characters. */
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  if (iban.startsWith("RO") && iban.length !== 24) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const v = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch
    for (const d of v) remainder = (remainder * 10 + Number(d)) % 97
  }
  return remainder === 1
}

/** "0722 123.456" -> "0722123456" */
export function normalizeRoPhone(raw: string): string {
  return raw.replace(/[\s().-]/g, "")
}

/**
 * Romanian mobile/landline (07x, 02x, 03x; with 0, +40 or 0040) or any
 * international E.164 number. SQL twin: public.ro_phone_valid.
 */
export function isValidRoPhone(raw: string): boolean {
  return /^((\+40|0040|0)[237]\d{8}|\+[1-9]\d{7,14})$/.test(normalizeRoPhone(raw))
}

/**
 * Trade register number. Accepts the classic J12/3456/2020 (also F/C prefixes)
 * and the post-2024 ONRC format (letter + year + digits, e.g. J2024001234401).
 */
export function isValidRegCom(raw: string): boolean {
  const v = raw.replace(/\s+/g, "").toUpperCase()
  return /^[JFC]\d{1,2}\/\d{1,7}\/(19|20)\d{2}$/.test(v) || /^[JFC](19|20)\d{2}\d{6,10}$/.test(v)
}
