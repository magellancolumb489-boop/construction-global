// Notification fan-out stub. Keeps every caller (order placed, bid made,
// message received, seller activated, etc.) at a stable call site so Phase 2
// can swap in Resend / Postmark / WebPush without touching the call sites.
//
// For now, this only logs via `console.info` in non-production and checks
// the user's stored preferences to respect opt-outs. It never throws; it
// never blocks the action. All calls are best-effort.

import { createClient } from "@/lib/supabase/server"

export type NotificationChannel = "email" | "sms" | "push"
export type NotificationTopic =
  | "orders"
  | "bids"
  | "messages"
  | "marketing"
  | "security"

interface NotificationPayload {
  userId: string
  topic: NotificationTopic
  subject: string
  body: string
  data?: Record<string, unknown>
}

interface UserNotificationChannels {
  email?: boolean
  sms?: boolean
  push?: boolean
}

interface UserNotificationTopics {
  orders?: boolean
  bids?: boolean
  messages?: boolean
  marketing?: boolean
  security?: boolean
}

interface UserQuietHours {
  enabled?: boolean
  start?: string
  end?: string
}

// Respects user notification preferences + quiet hours (unless topic=security).
export async function dispatch(payload: NotificationPayload): Promise<void> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("user_notification_preferences")
      .select("channels, topics, quiet_hours")
      .eq("user_id", payload.userId)
      .maybeSingle()

    const channels: UserNotificationChannels =
      (data?.channels as UserNotificationChannels) ?? { email: true }
    const topics: UserNotificationTopics =
      (data?.topics as UserNotificationTopics) ?? {
        orders: true,
        bids: true,
        messages: true,
        marketing: false,
        security: true,
      }
    const quiet: UserQuietHours | undefined =
      (data?.quiet_hours as UserQuietHours | undefined) ?? undefined

    if (topics[payload.topic] === false) return
    if (payload.topic !== "security" && quiet?.enabled && isInQuietHours(quiet)) return

    const active: NotificationChannel[] = (Object.keys(channels) as NotificationChannel[]).filter(
      (c) => channels[c] === true,
    )
    if (active.length === 0) return

    if (process.env.NODE_ENV !== "production") {
      for (const ch of active) {
        console.info(
          `[notifications:${ch}] topic=${payload.topic} user=${payload.userId} subject=${payload.subject}`,
        )
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[notifications] dispatch failed:", err)
    }
  }
}

function isInQuietHours(q: UserQuietHours): boolean {
  if (!q.start || !q.end) return false
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  // Handle windows that cross midnight (22:00 → 07:00).
  return q.start <= q.end ? hhmm >= q.start && hhmm < q.end : hhmm >= q.start || hhmm < q.end
}
