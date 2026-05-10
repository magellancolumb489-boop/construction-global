"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Send, Loader2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { sendMessage, markThreadRead } from "@/lib/api/messages-client"
import { createClient } from "@/lib/supabase/client"
import type { ThreadSummary, Message } from "@/lib/api/messages"

interface MessagesTabProps {
  threads: ThreadSummary[]
  currentUserId: string
}

const POLL_MS = 30_000

export function MessagesTab({ threads: initialThreads, currentUserId }: MessagesTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [threads, setThreads] = useState<ThreadSummary[]>(initialThreads)
  const [selectedId, setSelectedId] = useState<number | null>(initialThreads[0]?.id ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [draft, setDraft] = useState("")
  const lastPollRef = useRef<number>(0)

  const selected = useMemo(() => threads.find((t) => t.id === selectedId) ?? null, [threads, selectedId])

  // Loads thread messages from Supabase. Relies on RLS — the caller only ever
  // sees messages from threads they are part of.
  async function loadMessages(threadId: number) {
    setLoadingMsgs(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
    setMessages(data ?? [])
    setLoadingMsgs(false)
  }

  useEffect(() => {
    if (selectedId == null) return
    loadMessages(selectedId)
    // Mark as read when the thread is opened.
    markThreadRead(selectedId).then(() => {
      setThreads((ts) => ts.map((t) => (t.id === selectedId ? { ...t, unread_count: 0 } : t)))
    })
  }, [selectedId])

  // Simple 30s polling while the tab is visible. No realtime this iteration.
  useEffect(() => {
    if (selectedId == null) return
    function tick() {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastPollRef.current < POLL_MS - 500) return
      lastPollRef.current = now
      loadMessages(selectedId!)
    }
    const interval = window.setInterval(tick, POLL_MS)
    const onVisibility = () => { if (document.visibilityState === "visible") tick() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [selectedId])

  function handleSend() {
    if (!selectedId || !draft.trim()) return
    const body = draft.trim().slice(0, 4000)
    setDraft("")
    startTransition(async () => {
      const res = await sendMessage({ thread_id: selectedId, body })
      if (res.success) {
        await loadMessages(selectedId)
        router.refresh()
      }
    })
  }

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Inbox gol"
        description="Când porniți o conversație cu un vânzător sau cumpărător, aceasta va apărea aici."
      />
    )
  }

  return (
    <div className="grid h-[600px] grid-cols-1 gap-3 rounded-2xl border border-border/50 bg-card sm:grid-cols-[260px_1fr]">
      {/* Thread list */}
      <div
        className={`flex flex-col overflow-hidden border-border/50 ${
          selectedId && "hidden sm:flex"
        } sm:border-r`}
      >
        <div className="border-b border-border/50 px-4 py-3">
          <h2 className="text-sm font-bold">Mesaje</h2>
          <p className="text-[11px] text-muted-foreground">{threads.length} conversatii</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => {
            const active = t.id === selectedId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full flex-col items-start gap-1 border-b border-border/40 px-4 py-3 text-left text-sm transition-colors ${
                  active ? "bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="flex-1 truncate font-semibold">
                    {t.other_display_name || "Utilizator"}
                  </span>
                  {t.unread_count > 0 && (
                    <Badge className="h-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      {t.unread_count}
                    </Badge>
                  )}
                </div>
                {t.last_message_body && (
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {t.last_message_body}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {t.last_message_at
                    ? new Date(t.last_message_at).toLocaleString("ro-RO")
                    : new Date(t.created_at).toLocaleDateString("ro-RO")}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread view */}
      <div
        className={`flex min-h-0 flex-col overflow-hidden ${
          selectedId ? "flex" : "hidden sm:flex"
        }`}
      >
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl sm:hidden"
                onClick={() => setSelectedId(null)}
                aria-label="Inapoi la lista"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{selected.other_display_name || "Utilizator"}</p>
                {selected.subject && (
                  <p className="truncate text-[11px] text-muted-foreground">{selected.subject}</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-muted/10">
              {loadingMsgs ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Se incarca...
                </p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nu exista mesaje inca.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === currentUserId
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/50 bg-card"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(m.created_at).toLocaleTimeString("ro-RO", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex items-end gap-2 border-t border-border/50 bg-card px-3 py-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Scrieti un mesaj..."
                rows={2}
                maxLength={4000}
                className="flex-1 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
              />
              <Button
                onClick={handleSend}
                disabled={pending || !draft.trim()}
                className="h-11 rounded-xl bg-primary text-primary-foreground"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Selectati o conversatie.
          </div>
        )}
      </div>
    </div>
  )
}
