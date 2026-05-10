"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProcessingPhaseStatus = "pending" | "active" | "done" | "warn" | "error"

export interface ProcessingPhase {
  id: string
  label: string
  status: ProcessingPhaseStatus
  hint?: string
}

export interface ProcessingOverlayProps {
  open: boolean
  phases: ProcessingPhase[]
  // Optional title / subtitle in case the caller wants to override defaults.
  title?: string
  subtitle?: string
}

// Default 4-phase script the action drives. The component stays generic so the
// caller (checkout client) is the only place that knows about the RPC contract.
export const DEFAULT_PROCESSING_PHASES: ProcessingPhase[] = [
  { id: "validate",  label: "Validăm comanda",        status: "pending" },
  { id: "recompute", label: "Recalculăm prețuri",     status: "pending" },
  { id: "persist",   label: "Salvăm în baza de date", status: "pending" },
  { id: "deviz",     label: "Generăm devizul",        status: "pending" },
]

// PhaseRow: one row in the overlay list. Memoization is overkill — the parent
// re-renders the whole overlay only on phase status change.
function PhaseRow({ phase, index }: { phase: ProcessingPhase; index: number }) {
  const Icon =
    phase.status === "done" ? CheckCircle2
      : phase.status === "warn" || phase.status === "error" ? AlertTriangle
      : Loader2

  const tone =
    phase.status === "done"  ? "text-emerald-600"
    : phase.status === "warn" ? "text-amber-600"
    : phase.status === "error" ? "text-red-600"
    : phase.status === "active" ? "text-primary"
    : "text-muted-foreground"

  const dotTone =
    phase.status === "done"  ? "bg-emerald-100 ring-emerald-200 dark:bg-emerald-900/40 dark:ring-emerald-800/40"
    : phase.status === "warn" ? "bg-amber-100 ring-amber-200 dark:bg-amber-900/40 dark:ring-amber-800/40"
    : phase.status === "error" ? "bg-red-100 ring-red-200 dark:bg-red-900/40 dark:ring-red-800/40"
    : phase.status === "active" ? "bg-primary/10 ring-primary/30"
    : "bg-muted ring-border"

  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
          dotTone,
        )}
        aria-hidden
      >
        <Icon
          className={cn(
            "h-5 w-5",
            tone,
            phase.status === "active" ? "animate-spin" : "",
          )}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-tight",
            phase.status === "pending" ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span className="mr-2 text-xs font-semibold tabular-nums text-muted-foreground">
            {String(index + 1).padStart(2, "0")}
          </span>
          {phase.label}
        </p>
        {phase.hint && (
          <p className={cn("mt-0.5 text-xs", tone)}>{phase.hint}</p>
        )}
      </div>
    </li>
  )
}

export function ProcessingOverlay({
  open,
  phases,
  title = "Procesăm comanda",
  subtitle = "Rămâi pe pagină — durează doar câteva secunde.",
}: ProcessingOverlayProps) {
  // Prevent body scroll while the overlay is up (keeps focus on the spinner).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Defer mounting to avoid a hydration mismatch when SSR renders the page.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-overlay-title"
      className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 px-4 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-4">
          <h2
            id="processing-overlay-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ol className="space-y-3">
          {phases.map((p, i) => (
            <PhaseRow key={p.id} phase={p} index={i} />
          ))}
        </ol>
      </div>
    </div>
  )
}
