"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, Save, Loader2, Mail, MessageSquare, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateNotificationPrefsAction } from "@/app/account/actions"
import type { NotificationPrefs } from "@/lib/api/notification-prefs"

interface NotificationsTabProps {
  notificationPrefs: NotificationPrefs | null
}

interface ChannelsShape {
  email: boolean
  sms: boolean
  push: boolean
}

interface TopicsShape {
  orders: boolean
  bids: boolean
  messages: boolean
  marketing: boolean
  security: boolean
}

interface QuietShape {
  enabled: boolean
  start: string
  end: string
}

const DEFAULT_CHANNELS: ChannelsShape = { email: true, sms: false, push: false }
const DEFAULT_TOPICS: TopicsShape = {
  orders: true, bids: true, messages: true, marketing: false, security: true,
}
const DEFAULT_QUIET: QuietShape = { enabled: false, start: "22:00", end: "07:00" }

const TOPIC_LABELS: { id: keyof TopicsShape; label: string; hint: string; locked?: boolean }[] = [
  { id: "orders", label: "Comenzi", hint: "Confirmari, livrare, retururi" },
  { id: "bids", label: "Licitatii", hint: "Oferte noi, castig, depasire" },
  { id: "messages", label: "Mesaje", hint: "Notificari din inbox" },
  { id: "marketing", label: "Marketing", hint: "Oferte, noutati, recomandari" },
  { id: "security", label: "Securitate", hint: "Login-uri, schimbari de parola", locked: true },
]

const CHANNEL_LABELS: { id: keyof ChannelsShape; label: string; icon: typeof Mail; hint?: string }[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "push", label: "Push", icon: Smartphone, hint: "Disponibil cand instalati aplicatia" },
  { id: "sms", label: "SMS", icon: MessageSquare, hint: "Se activeaza dupa verificarea telefonului" },
]

export function NotificationsTab({ notificationPrefs }: NotificationsTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const [channels, setChannels] = useState<ChannelsShape>({
    ...DEFAULT_CHANNELS,
    ...((notificationPrefs?.channels as Partial<ChannelsShape> | null) ?? {}),
  })
  const [topics, setTopics] = useState<TopicsShape>({
    ...DEFAULT_TOPICS,
    ...((notificationPrefs?.topics as Partial<TopicsShape> | null) ?? {}),
  })
  const [quiet, setQuiet] = useState<QuietShape>({
    ...DEFAULT_QUIET,
    ...((notificationPrefs?.quiet_hours as Partial<QuietShape> | null) ?? {}),
  })

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updateNotificationPrefsAction({
        channels, topics, quiet_hours: quiet.enabled ? quiet : null,
      })
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Preferinte notificari salvate." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Notificari</h2>
            <p className="text-xs text-muted-foreground">
              Alegeti pe ce canale si pentru ce subiecte vreti sa primiti notificari.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Canale
          </Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {CHANNEL_LABELS.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-2xl border border-border/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold">{c.label}</p>
                      {c.hint && <p className="text-[11px] text-muted-foreground">{c.hint}</p>}
                    </div>
                  </div>
                  <Switch
                    checked={channels[c.id]}
                    onCheckedChange={(v) => setChannels({ ...channels, [c.id]: Boolean(v) })}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-6">
          <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Subiecte
          </Label>
          <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/50">
            {TOPIC_LABELS.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                </div>
                <Switch
                  checked={topics[t.id]}
                  disabled={t.locked}
                  onCheckedChange={(v) => setTopics({ ...topics, [t.id]: Boolean(v) })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Ore de liniste</p>
              <p className="text-[11px] text-muted-foreground">
                Nu primiti push/SMS in acest interval (Europe/Bucharest).
              </p>
            </div>
            <Switch
              checked={quiet.enabled}
              onCheckedChange={(v) => setQuiet({ ...quiet, enabled: Boolean(v) })}
            />
          </div>
          {quiet.enabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Incepe la</span>
                <input
                  type="time"
                  value={quiet.start}
                  onChange={(e) => setQuiet({ ...quiet, start: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Se termina la</span>
                <input
                  type="time"
                  value={quiet.end}
                  onChange={(e) => setQuiet({ ...quiet, end: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={handleSave}
            disabled={pending}
            className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salveaza notificari
          </Button>
          {message && (
            <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
