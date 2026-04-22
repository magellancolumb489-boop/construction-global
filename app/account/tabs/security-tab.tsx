"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Shield, KeyRound, Save, Loader2, LogOut, AlertTriangle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { changePassword, revokeOtherSessions } from "@/lib/api/security-client"
import type { LoginEvent } from "@/lib/api/security"

interface SecurityTabProps {
  loginEvents: LoginEvent[]
}

const EVENT_LABELS: Record<LoginEvent["event"], string> = {
  login: "Autentificare",
  logout: "Deconectare",
  password_change: "Schimbare parola",
  session_revoked: "Sesiuni terminate",
}

export function SecurityTab({ loginEvents }: SecurityTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  function submitPassword() {
    setMessage(null)
    if (password.length < 8) {
      setMessage({ kind: "err", text: "Parola trebuie sa aiba cel putin 8 caractere." })
      return
    }
    if (password !== confirm) {
      setMessage({ kind: "err", text: "Parolele nu coincid." })
      return
    }
    startTransition(async () => {
      const res = await changePassword(password)
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setPassword("")
      setConfirm("")
      setMessage({ kind: "ok", text: "Parola a fost schimbata." })
      router.refresh()
    })
  }

  function signOthers() {
    setMessage(null)
    startTransition(async () => {
      const res = await revokeOtherSessions()
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Sesiunile celorlalte dispozitive au fost terminate." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Parola</h2>
            <p className="text-xs text-muted-foreground">Minim 8 caractere. Recomandam o expresie de pasaj.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Parola noua</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">Confirmare</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 rounded-xl"
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={submitPassword}
            disabled={pending}
            className="h-11 rounded-xl bg-primary text-primary-foreground"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Schimba parola
          </Button>
          {message && (
            <span className={`text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>

      {/* Sessions + MFA placeholder */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Sesiuni si 2FA</h2>
            <p className="text-xs text-muted-foreground">
              Terminati sesiunile de pe celelalte dispozitive sau activati autentificarea in 2 pasi (in curand).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={signOthers}
            disabled={pending}
          >
            <LogOut className="mr-2 h-4 w-4" /> Termina celelalte sesiuni
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled
            aria-disabled="true"
          >
            <Shield className="mr-2 h-4 w-4" /> Configureaza 2FA (in curand)
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Activitate recenta</h2>
            <p className="text-xs text-muted-foreground">Ultimele {loginEvents.length || 0} evenimente de cont.</p>
          </div>
        </div>
        {loginEvents.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Inca nu am inregistrat evenimente.
          </p>
        ) : (
          <div className="divide-y divide-border/40 rounded-2xl border border-border/50">
            {loginEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{EVENT_LABELS[e.event]}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("ro-RO")}
                    {e.ip ? ` · ${e.ip}` : ""}
                  </p>
                </div>
                {e.user_agent && (
                  <Badge variant="secondary" className="hidden sm:inline-flex max-w-[260px] truncate rounded-lg">
                    {e.user_agent}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
