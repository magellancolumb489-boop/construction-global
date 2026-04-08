import { Truck, Package, Wrench, Briefcase } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ListingWizardType } from "@/lib/listing-wizard-types"

const OPTIONS: {
  id: ListingWizardType
  title: string
  hint: string
  icon: typeof Truck
}[] = [
  {
    id: "concrete",
    title: "Beton cu transport",
    hint: "CIFA, POMPĂ sau VRAC — distanța și accesoriile se calculează la comandă.",
    icon: Truck,
  },
  {
    id: "materials",
    title: "Materiale de construcții",
    hint: "Sac, boltari, caramizi etc. — transport fix stabilit de tine.",
    icon: Package,
  },
  {
    id: "equipment",
    title: "Echipamente",
    hint: "Un singur obiect (utilaj, unelte) — fără cantitate la vânzare.",
    icon: Wrench,
  },
  {
    id: "services",
    title: "Servicii",
    hint: "Tarif și zonă de acoperire — fără cantitate în stoc.",
    icon: Briefcase,
  },
]

/** Step 1: choose listing kind — drives fields in step 2. */
export function WizardStepType({
  value,
  onChange,
}: {
  value: ListingWizardType | null
  onChange: (t: ListingWizardType) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-[88px] rounded-xl border-2 p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <Card className="border-0 shadow-none">
              <CardContent className="flex gap-3 p-0">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{opt.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{opt.hint}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
