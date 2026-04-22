"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Settings, Save, Loader2, Globe, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updatePreferencesAction } from "@/app/account/actions"
import type { Profile } from "@/lib/api/profile-client"

interface PreferencesTabProps {
  profile: Profile | null
}

interface PrefsShape {
  language: "ro" | "en"
  currency: "RON" | "EUR"
  timezone: string
  measurement_system: "metric" | "imperial"
}

const DEFAULT_PREFS: PrefsShape = {
  language: "ro",
  currency: "RON",
  timezone: "Europe/Bucharest",
  measurement_system: "metric",
}

function readPrefs(profile: Profile | null): PrefsShape {
  const raw = (profile?.preferences ?? null) as Partial<PrefsShape> | null
  return { ...DEFAULT_PREFS, ...(raw ?? {}) }
}

const LANGUAGES: { id: "ro" | "en"; label: string; flag: string }[] = [
  { id: "ro", label: "Romana", flag: "RO" },
  { id: "en", label: "English", flag: "EN" },
]

const CURRENCIES: { id: "RON" | "EUR"; label: string }[] = [
  { id: "RON", label: "RON - leu romanesc" },
  { id: "EUR", label: "EUR - euro" },
]

const UNITS: { id: "metric" | "imperial"; label: string; hint: string }[] = [
  { id: "metric", label: "Metric", hint: "m3, tone, km" },
  { id: "imperial", label: "Imperial", hint: "ft3, lbs, mi" },
]

const TIMEZONES = ["Europe/Bucharest", "Europe/Chisinau", "Europe/Berlin", "Europe/London", "UTC"]

export function PreferencesTab({ profile }: PreferencesTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [prefs, setPrefs] = useState<PrefsShape>(readPrefs(profile))

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await updatePreferencesAction(prefs)
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Preferinte salvate." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Preferinte</h2>
            <p className="text-xs text-muted-foreground">
              Limba, valuta, fus orar si sistem de masura pentru listinguri.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Globe className="h-3 w-3" /> Limba interfata
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              {LANGUAGES.map((l) => {
                const active = prefs.language === l.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, language: l.id })}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                    aria-pressed={active}
                  >
                    <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                      {l.flag}
                    </span>
                    {l.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Valuta implicita
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              {CURRENCIES.map((c) => {
                const active = prefs.currency === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, currency: c.id })}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                    aria-pressed={active}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" /> Fus orar
            </Label>
            <select
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm sm:max-w-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sistem de masura
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              {UNITS.map((u) => {
                const active = prefs.measurement_system === u.id
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, measurement_system: u.id })}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="font-semibold">{u.label}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{u.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handleSave}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salveaza preferinte
            </Button>
            {message && (
              <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
