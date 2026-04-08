import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"
import type { ListingWizardType } from "@/lib/listing-wizard-types"

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
                <dt className="text-muted-foreground">Transport</dt>
                <dd className="text-right font-medium">
                  {[
                    form.transportCifa && "CIFA",
                    form.transportPompa && "POMPĂ",
                    form.transportVrac && "VRAC",
                  ]
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
              {form.price || "—"} {form.currency}
              {t && t !== "services" && t !== "equipment" ? ` / ${form.unit}` : ""}
            </dd>
          </div>
        </dl>

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
