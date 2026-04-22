"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  threadOpenSchema,
  messageSendSchema,
  type ThreadOpenInput,
  type MessageSendInput,
} from "@/lib/validation"
import { dispatch } from "@/lib/notifications/dispatch"

type ActionResult = { success: true } | { success: false; error: string }
type OpenResult =
  | { success: true; thread_id: number }
  | { success: false; error: string }

function firstIssue(issues: { message: string }[] | undefined): string {
  return issues?.[0]?.message ?? "Date invalide"
}

// Opens (or reuses) a thread between the caller (buyer) and the seller bound
// to a listing/auction/order. Always dispatches the first message so the
// caller sees a populated thread immediately.
export async function openThreadAction(raw: ThreadOpenInput): Promise<OpenResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = threadOpenSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }
  if (parsed.data.seller_id === user.id) {
    return { success: false, error: "Nu puteti deschide un thread cu dumneavoastra." }
  }

  // Look for an existing thread that matches the caller + seller + context.
  let existingQuery = supabase
    .from("message_threads")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", parsed.data.seller_id)
  if (parsed.data.context_type) {
    existingQuery = existingQuery.eq("context_type", parsed.data.context_type)
  }
  if (parsed.data.context_id != null) {
    existingQuery = existingQuery.eq("context_id", parsed.data.context_id)
  }
  const { data: existing, error: findErr } = await existingQuery.maybeSingle()
  if (findErr) return { success: false, error: findErr.message }

  let threadId = existing?.id
  if (!threadId) {
    const { data: inserted, error: insErr } = await supabase
      .from("message_threads")
      .insert({
        buyer_id: user.id,
        seller_id: parsed.data.seller_id,
        subject: parsed.data.subject ?? null,
        context_type: parsed.data.context_type ?? null,
        context_id: parsed.data.context_id ?? null,
      })
      .select("id")
      .single()
    if (insErr || !inserted) {
      return { success: false, error: insErr?.message ?? "Nu am putut deschide thread-ul." }
    }
    threadId = inserted.id
  }

  const { error: msgErr } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    body: parsed.data.body,
  })
  if (msgErr) return { success: false, error: msgErr.message }

  // Best-effort outbound notification to the seller (stub).
  await dispatch({
    userId: parsed.data.seller_id,
    topic: "messages",
    subject: parsed.data.subject ?? "Mesaj nou",
    body: parsed.data.body.slice(0, 200),
    data: { thread_id: threadId },
  })

  revalidatePath("/account")
  return { success: true, thread_id: threadId }
}

export async function sendMessageAction(raw: MessageSendInput): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const parsed = messageSendSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error.issues) }

  const { data: thread, error: threadErr } = await supabase
    .from("message_threads")
    .select("id, buyer_id, seller_id")
    .eq("id", parsed.data.thread_id)
    .maybeSingle()
  if (threadErr) return { success: false, error: threadErr.message }
  if (!thread) return { success: false, error: "Thread inexistent." }
  if (thread.buyer_id !== user.id && thread.seller_id !== user.id) {
    return { success: false, error: "Nu aveti acces la acest thread." }
  }

  const { error } = await supabase.from("messages").insert({
    thread_id: parsed.data.thread_id,
    sender_id: user.id,
    body: parsed.data.body,
  })
  if (error) return { success: false, error: error.message }

  const recipientId = thread.buyer_id === user.id ? thread.seller_id : thread.buyer_id
  await dispatch({
    userId: recipientId,
    topic: "messages",
    subject: "Mesaj nou",
    body: parsed.data.body.slice(0, 200),
    data: { thread_id: parsed.data.thread_id },
  })

  revalidatePath("/account")
  return { success: true }
}

export async function markThreadReadAction(threadId: number): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nu esti autentificat." }

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .is("read_at", null)
  if (error) return { success: false, error: error.message }
  revalidatePath("/account")
  return { success: true }
}
