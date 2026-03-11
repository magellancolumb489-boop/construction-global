import { Badge } from "@/components/ui/badge"
import type { AuctionStatus, OrderStatus, PaymentStatus } from "@/types/domain"

type StatusType = AuctionStatus | OrderStatus | PaymentStatus | string

const statusConfig: Record<string, { label: string; className: string }> = {
  // Auction statuses (lowercase, matching DB)
  draft: { label: "Ciorna", className: "rounded-lg bg-amber-100/80 text-amber-800 border-amber-200/60 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/40" },
  scheduled: { label: "Programata", className: "rounded-lg bg-blue-100/80 text-blue-800 border-blue-200/60 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40" },
  active: { label: "Activa", className: "rounded-lg bg-emerald-100/80 text-emerald-800 border-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/40" },
  ended: { label: "Finalizata", className: "rounded-lg bg-gray-100/80 text-gray-700 border-gray-200/60 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/40" },
  cancelled: { label: "Anulata", className: "rounded-lg bg-red-100/80 text-red-800 border-red-200/60 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/40" },
  // Order / payment statuses (uppercase, existing)
  PENDING: { label: "In asteptare", className: "rounded-lg bg-amber-100/80 text-amber-800 border-amber-200/60" },
  CONFIRMED: { label: "Confirmata", className: "rounded-lg bg-blue-100/80 text-blue-800 border-blue-200/60" },
  FULFILLED: { label: "Finalizata", className: "rounded-lg bg-emerald-100/80 text-emerald-800 border-emerald-200/60" },
  CANCELLED: { label: "Anulata", className: "rounded-lg bg-red-100/80 text-red-800 border-red-200/60" },
  PAID: { label: "Platita", className: "rounded-lg bg-emerald-100/80 text-emerald-800 border-emerald-200/60" },
  FAILED: { label: "Esuata", className: "rounded-lg bg-red-100/80 text-red-800 border-red-200/60" },
  REFUNDED: { label: "Rambursata", className: "rounded-lg bg-gray-100/80 text-gray-800 border-gray-200/60" },
}

export function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "rounded-lg bg-gray-100/80 text-gray-800 border-gray-200/60",
  }
  return (
    <Badge variant="outline" className={`text-xs font-semibold backdrop-blur-sm ${config.className}`}>
      {config.label}
    </Badge>
  )
}
