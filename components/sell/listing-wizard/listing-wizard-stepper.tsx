import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, label: "Tip" },
  { id: 2, label: "Detalii" },
  { id: 3, label: "Imagini" },
  { id: 4, label: "Publicare" },
] as const

/** Visual progress for the 4-step listing wizard (desktop + mobile). */
export function ListingWizardStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Pasi creare anunt" className="mb-6">
      {/* Mobile: compact progress bar */}
      <div className="mb-4 md:hidden">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Pasul {currentStep} din 4</span>
          <span>{STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: step circles */}
      <ol className="hidden items-center gap-2 md:flex md:flex-wrap">
        {STEPS.map((s, idx) => {
          const done = currentStep > s.id
          const active = currentStep === s.id
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && !done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s.id}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span className="mx-1 hidden h-px w-6 bg-border lg:inline-block" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
