import type { LucideIcon } from "lucide-react"
import { PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function EmptyState({
  icon: Icon = PackageOpen,
  title = "Nu am gasit nimic",
  description = "Nu exista date de afisat momentan.",
  actionLabel,
  actionHref,
}: {
  icon?: LucideIcon
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-bold text-foreground">{title}</h3>
      <p className="mb-5 max-w-xs text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="rounded-xl shadow-sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
