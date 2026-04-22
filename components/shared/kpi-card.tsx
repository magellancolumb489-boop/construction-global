import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  trend?: { direction: "up" | "down" | "flat"; value: string }
  href?: string
}

// Minimal stat card used across the seller dashboard. Server-safe (no state).
export function KpiCard({ icon: Icon, label, value, hint, trend }: KpiCardProps) {
  const trendTone =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
      ? "text-rose-600"
      : "text-muted-foreground"
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        {trend && (
          <span className={`text-[11px] font-semibold ${trendTone}`}>{trend.value}</span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
