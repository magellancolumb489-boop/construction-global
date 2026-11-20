import Link from "next/link"
import { CreditCard, ShieldCheck } from "lucide-react"

// No stored cards: every payment goes through the processor's hosted page.
// This tab explains the flow instead of showing fake card slots.
export function PaymentMethodsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Plăți</h2>
      <div className="rounded-2xl border border-border/50 bg-card p-4 text-sm">
        <p className="mb-2 flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" /> Cum plătești</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Plătești fiecare comandă la finalizare, pe pagina securizată a procesatorului de plăți.</li>
          <li>Transportul organizat de platformă se plătește separat, după ce accepți oferta, din pagina comenzii.</li>
          <li>Dacă plata nu reușește, comanda rămâne „În așteptare” și poți reîncerca din pagina ei.</li>
        </ul>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        Nu stocăm datele cardului tău. <Link href="/ghid#plati" className="underline">Detalii în ghid</Link>
      </p>
    </div>
  )
}
