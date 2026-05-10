import * as React from "react"
import { Resend } from "resend"
import type { PlacedOrder } from "@/app/checkout/actions"

type Snapshot = Record<string, unknown> | null

/**
 * Renders buyer HTML via react-dom/server using a dynamic import so Turbopack
 * does not reject the static server renderer in the client-facing graph.
 */
async function renderBuyerOrderEmailHtml(order: PlacedOrder): Promise<string> {
  const [{ renderToStaticMarkup }, buyerMod] = await Promise.all([
    import("react-dom/server"),
    import("@/components/checkout/email-buyer-template"),
  ])
  return renderToStaticMarkup(
    React.createElement(buyerMod.EmailBuyerTemplate, { order }),
  )
}

/** Same as buyer path, for the seller notification template. */
async function renderSellerOrderEmailHtml(order: PlacedOrder): Promise<string> {
  const [{ renderToStaticMarkup }, sellerMod] = await Promise.all([
    import("react-dom/server"),
    import("@/components/checkout/email-seller-template"),
  ])
  return renderToStaticMarkup(
    React.createElement(sellerMod.EmailSellerTemplate, { order }),
  )
}

/** Reads a string field from a JSON snapshot object. */
function readString(s: Snapshot, key: string): string {
  if (!s) return ""
  const v = s[key]
  return typeof v === "string" ? v : ""
}

/** Reads a nested object from a JSON snapshot. */
function readObject(s: Snapshot, key: string): Snapshot {
  if (!s) return null
  const v = s[key]
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Snapshot) : null
}

/** Resend `from` header: env override or sandbox default for local testing. */
function resolveFromAddress(): string {
  const custom = process.env.RESEND_FROM?.trim()
  if (custom) return custom
  return "ConstructionHub Romania <onboarding@resend.dev>"
}

/** Minimal format check before calling the provider. */
function isLikelyEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export interface SendOrderEmailsResult {
  buyerSent: boolean
  sellerSent: boolean
  /** Non-fatal messages (e.g. skipped seller, API error copy). */
  messages: string[]
}

/**
 * Sends buyer + seller order emails via Resend when `RESEND_API_KEY` is set.
 * Seller mail is skipped if `seller_snapshot.auth_email` is missing (pre-migration orders).
 */
export async function sendOrderEmails(order: PlacedOrder): Promise<SendOrderEmailsResult> {
  const messages: string[] = []
  const result: SendOrderEmailsResult = {
    buyerSent: false,
    sellerSent: false,
    messages,
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    messages.push("RESEND_API_KEY lipsește.")
    return result
  }

  const resend = new Resend(apiKey)
  const from = resolveFromAddress()

  const buyerForm = readObject(order.buyer_snapshot, "form_billing")
  const buyerEmail = readString(buyerForm, "email").trim()
  const sellerEmail = readString(order.seller_snapshot, "auth_email").trim()

  const buyerName =
    readString(buyerForm, "name") ||
    readString(order.buyer_snapshot, "display_name") ||
    "client"

  const buyerSubject = `Confirmare comandă ${order.order_number ?? ""} · Deviz ${order.deviz_number ?? ""}`
  const sellerSubject = `Comandă nouă ${order.order_number ?? ""} de la ${buyerName}`

  if (isLikelyEmail(buyerEmail)) {
    const html = await renderBuyerOrderEmailHtml(order)
    const { error } = await resend.emails.send({
      from,
      to: buyerEmail,
      subject: buyerSubject,
      html,
    })
    if (error) {
      messages.push(`Cumpărător: ${error.message}`)
    } else {
      result.buyerSent = true
    }
  } else {
    messages.push("Email cumpărător lipsă sau invalid.")
  }

  if (isLikelyEmail(sellerEmail)) {
    const html = await renderSellerOrderEmailHtml(order)
    const { error } = await resend.emails.send({
      from,
      to: sellerEmail,
      subject: sellerSubject,
      html,
    })
    if (error) {
      messages.push(`Furnizor: ${error.message}`)
    } else {
      result.sellerSent = true
    }
  } else if (!sellerEmail) {
    messages.push(
      "Email furnizor indisponibil (comenzi vechi fără auth_email în snapshot).",
    )
  }

  return result
}
