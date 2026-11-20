"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/supabase"

export type OrderActionResult = { ok: true } | { ok: false; error: string }

const uuid = z.string().uuid()
const note = z.string().trim().max(500).optional()

// Allowlisted payload per action. Who may do what is enforced again in
// public.transport_transition; this only rejects malformed input early.
const transportActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("quote"),
    amountRon: z.number().positive().max(1_000_000),
    note,
  }),
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline"), note }),
  z.object({ action: z.literal("request_requote"), note }),
  z.object({
    action: z.literal("schedule"),
    scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    carrierName: z.string().trim().max(120).optional(),
    carrierPhone: z.string().trim().regex(/^[+0-9 ()-]{6,20}$/).optional(),
  }),
  z.object({
    action: z.literal("assign"),
    carrierName: z.string().trim().min(2).max(120),
    carrierPhone: z.string().trim().regex(/^[+0-9 ()-]{6,20}$/).optional(),
    scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ action: z.literal("mark_in_transit") }),
  z.object({ action: z.literal("confirm_delivery") }),
  z.object({ action: z.literal("report_failure"), note: z.string().trim().min(5).max(500) }),
])

export type TransportActionInput = z.infer<typeof transportActionSchema>

function humanize(msg: string): string {
  if (/not authenticated/i.test(msg)) return "Nu ești autentificat."
  if (/not a party|not allowed|admin only/i.test(msg)) return "Nu ai dreptul să faci această acțiune acum."
  if (/closed|already/i.test(msg)) return "Comanda sau transportul este deja închis."
  if (/requote limit/i.test(msg)) return "Ai atins limita de cereri de ofertă nouă. Contactează operatorul."
  if (/not paid/i.test(msg)) return "Transportul nu este plătit încă."
  if (/reason required/i.test(msg)) return "Completează motivul."
  if (/expired/i.test(msg)) return "Oferta de transport a expirat. Cere o ofertă nouă."
  return "Acțiunea nu a putut fi efectuată."
}

export async function transportAction(orderId: string, input: TransportActionInput): Promise<OrderActionResult> {
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Comandă invalidă." }
  const parsed = transportActionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." }
  const v = parsed.data

  const data: Record<string, unknown> = {}
  if ("note" in v && v.note) data.note = v.note
  if (v.action === "quote") data.amount_cents = Math.round(v.amountRon * 100)
  if (v.action === "schedule" || v.action === "assign") {
    if (v.scheduledFor) data.scheduled_for = v.scheduledFor
    if (v.carrierName) data.carrier_name = v.carrierName
    if (v.carrierPhone) data.carrier_phone = v.carrierPhone
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("transport_transition", {
    p_order_id: orderId,
    p_action: v.action,
    p_data: data as Json,
  })
  if (error) return { ok: false, error: humanize(error.message) }
  revalidatePath(`/account/orders/${orderId}`)
  return { ok: true }
}

export async function cancelOrderAction(orderId: string, reason: string): Promise<OrderActionResult> {
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Comandă invalidă." }
  const r = z.string().trim().min(5, "Motivul trebuie să aibă minim 5 caractere.").max(500).safeParse(reason)
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Motiv invalid." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_reason: r.data })
  if (error) return { ok: false, error: humanize(error.message) }
  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath("/account")
  return { ok: true }
}
