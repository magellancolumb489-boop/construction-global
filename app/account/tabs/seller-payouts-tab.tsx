import Link from "next/link"
import { Wallet, AlertCircle } from "lucide-react"
import { formatMoney } from "@/components/shared/money-display"
import type { SellerDashboard } from "@/lib/api/seller"
import type { Profile } from "@/lib/api/profile-client"
import type { Currency } from "@/types/domain"

// Real settlement view: what buyers paid for your sales and where the money goes.
// Transfers are done by the platform to the IBAN on file (no automatic payouts yet).
export function SellerPayoutsTab({ profile, data }: { profile: Profile | null; data: SellerDashboard }) {
  const cur = data.currency as Currency
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Decontări</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Plătite de cumpărători, de virat către tine</p>
          <p className="text-2xl font-extrabold">{formatMoney(data.pendingPayouts, cur)}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Total vânzări (fără anulări)</p>
          <p className="text-2xl font-extrabold">{formatMoney(data.lifetimeRevenue, cur)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 text-sm">
        <p className="mb-2 flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" /> Cum primești banii</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Cumpărătorul plătește platforma (prețul tău + comisionul platformei + TVA).</li>
          <li>Comisionul este plătit de cumpărător; suma ta nu scade.</li>
          <li>După confirmarea livrării, platforma virează suma ta (produse + transportul tău + TVA) în IBAN-ul din „Date firmă”.</li>
          <li>Fiecare comandă are proforma ta (exemplar furnizor) în pagina comenzii.</li>
        </ol>
      </div>

      {profile?.iban ? (
        <p className="text-sm text-muted-foreground">
          IBAN pentru virare: <span className="font-mono text-foreground">{profile.iban}</span>
          {profile.bank_name ? ` · ${profile.bank_name}` : ""}
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Nu ai IBAN salvat.{" "}
          <Link href="/account?tab=business" className="font-semibold underline">Adaugă-l în Date firmă</Link>
        </p>
      )}
    </div>
  )
}
