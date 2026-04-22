import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type MessageThread = Tables<"message_threads">
export type Message = Tables<"messages">

export interface ThreadSummary extends MessageThread {
  other_user_id: string
  other_display_name: string | null
  last_message_body: string | null
  last_message_sender_id: string | null
  unread_count: number
}

export interface ThreadWithMessages extends ThreadSummary {
  messages: Message[]
}

// Lists threads involving the caller + last message preview + unread count.
export async function getMyThreads(): Promise<ThreadSummary[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: threads, error } = await supabase
    .from("message_threads")
    .select("*")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false })

  if (error) {
    console.error("getMyThreads error:", error.message)
    return []
  }
  if (!threads || threads.length === 0) return []

  const threadIds = threads.map((t) => t.id)

  // Fetch last message per thread in one pass, then the unread counts.
  const [{ data: allMessages }, { data: unreadRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, thread_id, sender_id, body, created_at, read_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("thread_id")
      .in("thread_id", threadIds)
      .is("read_at", null)
      .neq("sender_id", user.id),
  ])

  const lastByThread = new Map<number, { body: string; sender_id: string }>()
  for (const m of allMessages ?? []) {
    if (!lastByThread.has(m.thread_id)) {
      lastByThread.set(m.thread_id, { body: m.body, sender_id: m.sender_id })
    }
  }

  const unreadCounts = new Map<number, number>()
  for (const r of unreadRows ?? []) {
    unreadCounts.set(r.thread_id, (unreadCounts.get(r.thread_id) ?? 0) + 1)
  }

  // Resolve other-party display names in one batch.
  const otherIds = Array.from(
    new Set(threads.map((t) => (t.buyer_id === user.id ? t.seller_id : t.buyer_id))),
  )
  const nameMap = new Map<string, string | null>()
  if (otherIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds)
    for (const p of data ?? []) nameMap.set(p.id, p.display_name)
  }

  return threads.map((t) => {
    const otherId = t.buyer_id === user.id ? t.seller_id : t.buyer_id
    const last = lastByThread.get(t.id)
    return {
      ...t,
      other_user_id: otherId,
      other_display_name: nameMap.get(otherId) ?? null,
      last_message_body: last?.body ?? null,
      last_message_sender_id: last?.sender_id ?? null,
      unread_count: unreadCounts.get(t.id) ?? 0,
    }
  })
}

// Single-thread read used by the messages tab composer.
export async function getThreadMessages(threadId: number): Promise<ThreadWithMessages | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: thread, error } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle()

  if (error || !thread) return null
  if (thread.buyer_id !== user.id && thread.seller_id !== user.id) return null

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  const otherId = thread.buyer_id === user.id ? thread.seller_id : thread.buyer_id
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", otherId)
    .maybeSingle()

  return {
    ...thread,
    other_user_id: otherId,
    other_display_name: otherProfile?.display_name ?? null,
    last_message_body: messages?.[messages.length - 1]?.body ?? null,
    last_message_sender_id: messages?.[messages.length - 1]?.sender_id ?? null,
    unread_count: (messages ?? []).filter((m) => m.read_at == null && m.sender_id !== user.id).length,
    messages: messages ?? [],
  }
}
