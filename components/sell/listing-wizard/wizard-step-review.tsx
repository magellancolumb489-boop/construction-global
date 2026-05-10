import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"
import { CONCRETE_CLASS_CATALOG, CONSISTENCY_LABELS, type ListingWizardType } from "@/lib/listing-wizard-types"

const TYPE_LABELS: Record<ListingWizardType, string> = {
  concrete: "Beton cu transport",
  materials: "Materiale de constructii",
  equipment: "Echipamente",
  services: "Servicii",
}

interface Props {
  form: WizardFormState
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>
}

/** Step 4: summary + active toggle before publish. */
export function WizardStepReview({ form, setForm }: Props) {
  const t = form.listingType
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Rezumat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border/50 py-2">
            <dt className="text-muted-foreground">Tip anunt</dt>
            <dd className="font-medium text-right">
              {t ? TYPE_LABELS[t] : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/50 py-2">
            <dt className="text-muted-foreground">Titlu</dt>
            <dd className="max-w-[60%] text-right font-medium">{form.title || "—"}</dd>
          </div>
          {t === "concrete" && (
            <>
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground">Incarcare</dt>
                <dd className="max-w-[60%] text-right text-xs">
                  {form.pickupAddress || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground shrink-0">Betoane</dt>
                <dd className="max-w-[65%] text-right text-xs leading-relaxed">
                  {form.concreteClasses.length === 0 ? (
                    "—"
                  ) : (
                    <ul className="ml-auto space-y-2 text-right">
                      {form.concreteClasses.map((row) => {
                        const meta = CONCRETE_CLASS_CATALOG[row.classCode]
                        return (
                          <li key={row.classCode}>
                            <span className="font-medium">{meta.label}</span>
                            {meta.bMark ? ` (${meta.bMark})` : ""}
                            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {row.consistencies.map((c) => (
                                <li key={c}>
                                  {CONSISTENCY_LABELS[c] ?? c}:{" "}
                                  <span className="font-medium text-foreground">
                                    {row.consistencyPrices[c] ?? "—"}
                                  </span>{" "}
                                  {form.currency}/{form.unit}
                                </li>
                              ))}
                            </ul>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground">Transport</dt>
                <dd className="text-right font-medium">
                  {[form.transportCifa && "CIFA", form.transportPompa && "POMPĂ"]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border/50 py-2">
                <dt className="text-muted-foreground">Comanda minima</dt>
                <dd className="font-medium">
                  {form.minOrderQty} {form.unit}
                </dd>
              </div>
            </>
          )}
          {t === "materials" && (
            <div className="flex justify-between gap-4 border-b border-border/50 py-2">
              <dt className="text-muted-foreground">Transport fix</dt>
              <dd className="font-medium">
                {form.transportFee || "0"} {form.currency}
              </dd>
            </div>
          )}
          {t === "equipment" && (
            <div className="flex justify-between gap-4 border-b border-border/50 py-2">
              <dt className="text-muted-foreground">Detalii</dt>
              <dd className="max-w-[60%] text-right text-xs">
                {[form.equipmentModel, form.equipmentCondition, form.equipmentYear]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
          )}
          {t === "services" && (
            <div className="flex justify-between gap-4 border-b border-border/50 py-2">
              <dt className="text-muted-foreground">Zona</dt>
              <dd className="max-w-[60%] text-right">{form.serviceArea || "—"}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-muted-foreground">Pret</dt>
            <dd className="font-semibold">
              {(() => {
                if (t === "concrete" && form.concreteClasses.length > 0) {
                  const nums: number[] = []
                  for (const c of form.concreteClasses) {
                    for (const cons of c.consistencies) {
                      const n = Number(c.consistencyPrices[cons])
                      if (Number.isFinite(n) && n > 0) nums.push(n)
                    }
                  }
                  if (nums.length > 0) return `de la ${Math.min(...nums)}`
                }
                return form.price || "—"
              })()}{" "}
              {form.currency}
              {t && t !== "services" && t !== "equipment" ? ` / ${form.unit}` : ""}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Label htmlFor="seller-transport-switch" className="text-base">
              Transport Asigurat
            </Label>
            <p className="text-xs text-muted-foreground">
              {form.sellerAssumesTransport
                ? "Asiguri tu transportul. Comision platforma: 10% din total comanda."
                : "Platforma organizeaza transportul. Comision: 10% + valoarea transportului."}
            </p>
          </div>
          <Switch
            id="seller-transport-switch"
            checked={form.sellerAssumesTransport}
            onCheckedChange={(c) =>
              setForm((f) => ({ ...f, sellerAssumesTransport: c }))
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="active-switch" className="text-base">
              Anunt activ
            </Label>
            <p className="text-xs text-muted-foreground">
              Dezactivati pentru a salva ca ciorna din pasul urmator.
            </p>
          </div>
          <Switch
            id="active-switch"
            checked={form.isActive}
            onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))}
          />
        </div>
      </CardContent>
    </Card>
  )
}
