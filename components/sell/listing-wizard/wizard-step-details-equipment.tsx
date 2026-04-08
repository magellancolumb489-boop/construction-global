import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"

const CURRENCIES = [
  { value: "RON", label: "RON" },
  { value: "EUR", label: "EUR" },
]

interface CategoryOption {
  id: number
  name: string
}

interface Props {
  form: WizardFormState
  setForm: React.Dispatch<React.SetStateAction<WizardFormState>>
  categories: CategoryOption[]
}

/** Step 2 for equipment: single item, no quantity field. */
export function WizardStepDetailsEquipment({ form, setForm, categories }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalii echipament</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Titlu *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1"
              placeholder="ex: Autofiletanta X — stare foarte buna"
            />
          </div>
          <div>
            <Label>Categorie</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecteaza" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Stare</Label>
              <Input
                value={form.equipmentCondition}
                onChange={(e) =>
                  setForm((f) => ({ ...f, equipmentCondition: e.target.value }))
                }
                placeholder="ex: Foarte bun"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={form.equipmentModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, equipmentModel: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>An fabricatie</Label>
              <Input
                type="number"
                min={1970}
                max={2100}
                value={form.equipmentYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, equipmentYear: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Descriere</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={5}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Pret *</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, currency: v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Zona preluare / locatie</Label>
            <Input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="ex: Ilfov — predare la fata locului"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Cost transport fix (optional)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.transportFee}
              onChange={(e) =>
                setForm((f) => ({ ...f, transportFee: e.target.value }))
              }
              className="mt-1"
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
