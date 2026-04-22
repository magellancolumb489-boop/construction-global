"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, ShieldAlert, Trash2, Loader2, X, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  requestDataExport, requestAccountDeletion, cancelAccountDeletion,
} from "@/lib/api/security-client"
import type { DeletionRequest } from "@/lib/api/privacy"

interface PrivacyTabProps {
  deletionRequest: DeletionRequest | null
}

export function PrivacyTab({ deletionRequest }: PrivacyTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  function doExport() {
    setMessage(null)
    startTransition(async () => {
      const res = await requestDataExport()
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Cererea a fost inregistrata. Veti primi link-ul pe email." })
    })
  }

  function doDelete() {
    setMessage(null)
    startTransition(async () => {
      const res = await requestAccountDeletion(reason || undefined)
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setReason("")
      setMessage({ kind: "ok", text: "Cerere de stergere inregistrata. Aveti 14 zile sa anulati." })
      router.refresh()
    })
  }

  function doCancel() {
    setMessage(null)
    startTransition(async () => {
      const res = await cancelAccountDeletion()
      if (!res.success) {
        setMessage({ kind: "err", text: res.error })
        return
      }
      setMessage({ kind: "ok", text: "Cererea de stergere a fost anulata." })
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Export date (GDPR)</h2>
            <p className="text-xs text-muted-foreground">
              Va trimitem un pachet .zip cu toate datele dvs. Raspundem in maxim 7 zile.
            </p>
          </div>
        </div>
        <Button
          onClick={doExport}
          disabled={pending}
          className="h-11 rounded-xl bg-primary text-primary-foreground"
        >
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Solicita export
        </Button>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Stergere cont</h2>
            <p className="text-xs text-muted-foreground">
              Cererea se programeaza pentru 14 zile. In aceasta perioada puteti anula oricand.
            </p>
          </div>
        </div>

        {deletionRequest && deletionRequest.scheduled_for ? (
          <div className="rounded-2xl border border-destructive/30 bg-background p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-destructive" />
              <span className="font-semibold text-foreground">
                Programat pentru {new Date(deletionRequest.scheduled_for).toLocaleDateString("ro-RO")}
              </span>
              <span className="text-muted-foreground">
                (status: {deletionRequest.status})
              </span>
            </div>
            {deletionRequest.reason && (
              <p className="mt-2 text-xs text-muted-foreground">Motiv: {deletionRequest.reason}</p>
            )}
            <Button
              variant="outline"
              className="mt-3 rounded-xl"
              onClick={doCancel}
              disabled={pending}
            >
              <X className="mr-2 h-4 w-4" /> Anuleaza cererea
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Optional: spuneti-ne de ce plecati"
              maxLength={500}
              className="rounded-xl"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="mt-3 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Solicita stergerea contului
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmati cererea</AlertDialogTitle>
                  <AlertDialogDescription>
                    Contul va fi sters dupa 14 zile. Anunturile si licitatiile active se inchid.
                    Puteti anula oricand in acest interval.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Nu</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive text-destructive-foreground"
                    onClick={doDelete}
                  >
                    Da, programeaza stergere
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {message && (
          <p className={`mt-3 text-sm font-medium ${message.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  )
}
