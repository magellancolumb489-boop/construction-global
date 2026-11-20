import { ListChecks } from "lucide-react"
import { LISTING_GUIDE, type ListingType } from "@/lib/listings/rules"

/** Rules for the chosen listing type, shown before the seller types anything. */
export function ListingGuide({ type }: { type: ListingType }) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <ListChecks className="h-4 w-4 text-primary" /> Reguli pentru acest tip de anunț
      </p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {LISTING_GUIDE[type].map((r) => (
          <li key={r}>{r}</li>
        ))}
        <li>Titlu clar (minim 10 caractere), descriere de minim 40 de caractere, fără telefon / email / site.</li>
        <li>Localitatea de livrare și cantitatea disponibilă sunt obligatorii.</li>
      </ul>
    </div>
  )
}
