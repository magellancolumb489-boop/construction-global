import type { Currency } from "@/types/domain"

export function formatMoney(amount: number, currency: Currency = "RON"): string {
  return (
    amount.toLocaleString("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) +
    " " +
    currency
  )
}

export function MoneyDisplay({
  amount,
  currency = "RON",
  className,
}: {
  amount: number
  currency?: Currency
  className?: string
}) {
  return <span className={className}>{formatMoney(amount, currency)}</span>
}
