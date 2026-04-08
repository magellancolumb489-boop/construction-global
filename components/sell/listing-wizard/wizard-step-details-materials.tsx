import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { WizardFormState } from "@/lib/listing-wizard-form-state"

const UNITS = [
  { value: "TON", label: "Tone (TON)" },
  { value: "KG", label: "Kilograme (KG)" },
  { value: "M3", label: "Metri cubi (M3)" },
  { value: "BUC", label: "Bucati (BUC)" },
  { value: "ML", label: "Metri liniari (ML)" },
]

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

/** Step 2 for bulk materials: classic fields + fixed transport fee. */
export function WizardStepDetailsMaterials({ form, setForm, categories }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalii produs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Titlu *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1"
            placeholder="ex: Saci ciment 25kg"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div>
            <Label>Locatie (optional)</Label>
            <Input
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Oras / judet"
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Pret unitar *</Label>
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
            <Label>Unitate</Label>
            <Select
              value={form.unit}
              onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Cantitate disponibila *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.availableQty}
              onChange={(e) =>
                setForm((f) => ({ ...f, availableQty: e.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label>Cost transport fix *</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.transportFee}
              onChange={(e) =>
                setForm((f) => ({ ...f, transportFee: e.target.value }))
              }
              className="mt-1"
              placeholder="0 = fara taxa"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Se adauga o data la totalul liniei; nu se calculeaza distanta.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
