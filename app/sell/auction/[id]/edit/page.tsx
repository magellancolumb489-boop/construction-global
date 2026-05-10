import Link from "next/link"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Editeaza Licitatie - ConstructionHub Romania",
}

// Auction persistence is disabled — edit UI removed until feature relaunch.
export default function EditAuctionPausedPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Licitatii", href: "/auctions" },
          { label: "Editeaza" },
        ]}
      />
      <h1 className="mb-4 text-2xl font-bold text-foreground">Editare indisponibila</h1>
      <p className="mb-6 text-muted-foreground">
        Licitatiile sunt in mod demonstrativ. Editarea si salvarea in baza de date vor reveni la relansarea functionalitatii.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/auctions">Catre licitatii</Link>
        </Button>
        <Button variant="outline" asChild className="rounded-xl">
          <Link href="/sell/auction/new">Formular demo (nou)</Link>
        </Button>
      </div>
    </div>
  )
}
