"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Plus, Edit, Trash2, Loader2, Check, Star, Home, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  createAddress, updateAddress, deleteAddress, setDefaultAddress,
} from "@/lib/api/addresses-client"
import type { UserAddress } from "@/lib/api/addresses"
import type { AddressUpsertInput } from "@/lib/validation"

interface AddressesTabProps {
  addresses: UserAddress[]
}

// Local draft mirrors the upsert schema shape so we can post directly.
interface Draft {
  id?: number
  label: string
  recipient: string
  line1: string
  line2: string
  city: string
  county: string
  postal_code: string
  phone: string
  notes: string
  is_default_billing: boolean
  is_default_shipping: boolean
}

function emptyDraft(): Draft {
  return {
    label: "",
    recipient: "",
    line1: "",
    line2: "",
    city: "",
    county: "",
    postal_code: "",
    phone: "",
    notes: "",
    is_default_billing: false,
    is_default_shipping: false,
  }
}

function draftFrom(addr: UserAddress): Draft {
  return {
    id: addr.id,
    label: addr.label ?? "",
    recipient: addr.recipient ?? "",
    line1: addr.line1 ?? "",
    line2: addr.line2 ?? "",
    city: addr.city ?? "",
    county: addr.county ?? "",
    postal_code: addr.postal_code ?? "",
    phone: addr.phone ?? "",
    notes: addr.notes ?? "",
    is_default_billing: Boolean(addr.is_default_billing),
    is_default_shipping: Boolean(addr.is_default_shipping),
  }
}

function draftToUpsert(d: Draft): AddressUpsertInput {
  return {
    label: d.label || null,
    recipient: d.recipient || null,
    line1: d.line1.trim(),
    line2: d.line2 || null,
    city: d.city.trim(),
    county: d.county || null,
    postal_code: d.postal_code || null,
    country: "RO",
    phone: d.phone || null,
    notes: d.notes || null,
    is_default_billing: d.is_default_billing,
    is_default_shipping: d.is_default_shipping,
  }
}

export function AddressesTab({ addresses }: AddressesTabProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Draft | null>(null)

  function submit() {
    if (!editing) return
    setError(null)
    startTransition(async () => {
      const payload = draftToUpsert(editing)
      const res = editing.id
        ? await updateAddress(editing.id, payload)
        : await createAddress(payload)
      if (!res.success) {
        setError(res.error)
        return
      }
      setEditing(null)
      router.refresh()
    })
  }

  async function remove(id: number) {
    const res = await deleteAddress(id)
    if (res.success) router.refresh()
  }

  async function makeDefault(id: number, kind: "billing" | "shipping") {
    const res = await setDefaultAddress(id, kind)
    if (res.success) router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Adrese</h2>
          <p className="text-xs text-muted-foreground">
            Adrese pentru livrare, ridicare si emitere facturi.
          </p>
        </div>
        <Button
          onClick={() => setEditing(emptyDraft())}
          className="rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <Plus className="mr-1 h-4 w-4" /> Adauga adresa
        </Button>
      </div>

      {addresses.length === 0 && !editing ? (
        <EmptyState
          icon={MapPin}
          title="Nicio adresa salvata"
          description="Adaugati o adresa pentru a urgenta check-out-ul si emiterea facturilor."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {a.label || a.recipient || a.city || "Adresa"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[a.line1, a.line2].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[a.city, a.county, a.postal_code, a.country].filter(Boolean).join(" &middot; ")}
                  </p>
                  {a.phone && <p className="mt-1 text-xs text-muted-foreground">{a.phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {a.is_default_billing && (
                    <Badge className="gap-1 rounded-lg bg-primary/10 text-[10px] text-primary">
                      <Receipt className="h-3 w-3" /> Facturare
                    </Badge>
                  )}
                  {a.is_default_shipping && (
                    <Badge className="gap-1 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-600">
                      <Home className="h-3 w-3" /> Livrare
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!a.is_default_billing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => makeDefault(a.id, "billing")}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" /> Facturare
                  </Button>
                )}
                {!a.is_default_shipping && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => makeDefault(a.id, "shipping")}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" /> Livrare
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto rounded-xl"
                  onClick={() => setEditing(draftFrom(a))}
                >
                  <Edit className="mr-1 h-3.5 w-3.5" /> Editeaza
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Stergere adresa</AlertDialogTitle>
                      <AlertDialogDescription>Nu se poate recupera.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Anuleaza</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl bg-destructive text-destructive-foreground"
                        onClick={() => remove(a.id)}
                      >
                        Sterge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
          <h3 className="mb-4 text-base font-bold text-foreground">
            {editing.id ? "Editeaza adresa" : "Adresa noua"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Eticheta
              </Label>
              <Input
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="Acasa, Birou, Santier Nord..."
                className="h-11 rounded-xl"
                maxLength={80}
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Destinatar
              </Label>
              <Input
                value={editing.recipient}
                onChange={(e) => setEditing({ ...editing, recipient: e.target.value })}
                placeholder="Persoana de contact"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Strada, numar
              </Label>
              <Input
                value={editing.line1}
                onChange={(e) => setEditing({ ...editing, line1: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="Str. Exemplu 12"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Adresa completa (bloc, scara, etaj)
              </Label>
              <Input
                value={editing.line2}
                onChange={(e) => setEditing({ ...editing, line2: e.target.value })}
                className="h-11 rounded-xl"
                placeholder="Bl. A2, Sc. 1, Ap. 5"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Oras
              </Label>
              <Input
                value={editing.city}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Judet
              </Label>
              <Input
                value={editing.county}
                onChange={(e) => setEditing({ ...editing, county: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Cod postal
              </Label>
              <Input
                value={editing.postal_code}
                onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })}
                className="h-11 rounded-xl"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Telefon
              </Label>
              <Input
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="h-11 rounded-xl"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Note pentru curier
              </Label>
              <Textarea
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_default_billing}
                  onChange={(e) =>
                    setEditing({ ...editing, is_default_billing: e.target.checked })
                  }
                />
                Facturare implicita
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_default_shipping}
                  onChange={(e) =>
                    setEditing({ ...editing, is_default_shipping: e.target.checked })
                  }
                />
                Livrare implicita
              </label>
            </div>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={submit}
              disabled={pending}
              className="h-11 rounded-xl bg-primary text-primary-foreground"
            >
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salveaza adresa
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => setEditing(null)}
            >
              Anuleaza
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
