import { Wallet } from "lucide-react"
import { StripeSeamCard } from "@/components/shared/stripe-seam-card"

// Stripe-seam only. Payouts go live once Stripe Connect is configured.
export function SellerPayoutsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Payouts</h2>
      <StripeSeamCard
        icon={Wallet}
        title="Plăți către vânzători"
        description="Conectați-vă contul Stripe Connect pentru a primi încasările automat, cu raportare și facturare integrate."
        bulletPoints={[
          "Transferuri automate in contul bancar",
          "Comisioane vizibile pe fiecare tranzactie",
          "Rapoarte lunare de incasari",
          "Conformitate KYC si AML prin Stripe",
        ]}
      />
    </div>
  )
}
