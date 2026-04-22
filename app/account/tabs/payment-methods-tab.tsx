import { CreditCard } from "lucide-react"
import { StripeSeamCard } from "@/components/shared/stripe-seam-card"

// Stripe-seam card only. Buttons disabled; no network call until Phase 2.
export function PaymentMethodsTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Metode de plata</h2>
      <StripeSeamCard
        icon={CreditCard}
        title="Metode de plata salvate"
        description="Salvati card-ul de debit/credit pentru check-out rapid. Totul se cripteaza prin Stripe: nu vedem niciodata datele complete ale cardului."
        bulletPoints={[
          "3D Secure 2 pentru tranzactii europene",
          "Detalii tokenizate, stocate la Stripe",
          "Expirare si re-autorizare automata",
          "Rambursari si dispute direct din cont",
        ]}
      />
    </div>
  )
}
