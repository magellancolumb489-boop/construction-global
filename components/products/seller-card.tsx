import Link from "next/link"
import { BadgeCheck, Store } from "lucide-react"
import { Button } from "@/components/ui/button"

const ENTITY: Record<string, string> = {
  PF: "Persoană fizică", PFA: "PFA", II: "Întreprindere individuală", IF: "Întreprindere familială", SRL: "SRL", SA: "SA",
}

/**
 * Who sells. Contact data is intentionally absent: buyer and seller exchange
 * details after an order, so deals stay on the platform (and covered by it).
 */
export function SellerCard({
  sellerId,
  name,
  companyName,
  entityType,
  activeListings,
}: {
  sellerId: string
  name: string | null
  companyName: string | null
  entityType: string | null
  activeListings: number
}) {
  const display = companyName || name || "Vânzător"
  const isCompany = !!entityType && entityType !== "PF"
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vânzător</p>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
          {display.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{display}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {isCompany && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
            {entityType ? ENTITY[entityType] ?? entityType : "Vânzător verificat la activare"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {activeListings} {activeListings === 1 ? "anunț activ" : "anunțuri active"} · date fiscale verificate (CUI, IBAN)
      </p>
      <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl" asChild>
        <Link href={`/marketplace?vanzator=${sellerId}`}>
          <Store className="mr-1.5 h-4 w-4" /> Toate anunțurile vânzătorului
        </Link>
      </Button>
    </div>
  )
}
