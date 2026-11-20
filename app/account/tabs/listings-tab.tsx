"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Store, Plus, Eye, Edit, Trash2, Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoneyDisplay } from "@/components/shared/money-display"
import { EmptyState } from "@/components/shared/empty-state"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteListing } from "@/lib/api/listings-client"
import type { MyListing } from "./types"
import type { Profile } from "@/lib/api/profile-client"
import type { PlatformCommerce } from "@/lib/api/platform-settings"
import { PayButton } from "@/components/orders/pay-button"
import { updateListing } from "@/lib/api/listings-client"

interface ListingsTabProps {
  profile: Profile | null
  listings: MyListing[]
  commerce?: PlatformCommerce
}

export function ListingsTab({ profile, listings, commerce }: ListingsTabProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  // Seller-side filters. Orders now consume stock, so "fara stoc" matters.
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((l) => {
      if (q && !l.title.toLowerCase().includes(q)) return false
      if (type !== "all" && l.listing_type !== type) return false
      if (status === "active" && !l.is_active) return false
      if (status === "inactive" && l.is_active) return false
      if (status === "out_of_stock" && Number(l.available_qty) > 0) return false
      return true
    })
  }, [listings, query, type, status])

  return (
    <div className="space-y-4">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} profile={profile} />}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Anunturile mele</h2>
        <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Link href="/sell/listing/new"><Plus className="mr-1 h-4 w-4" /> Anunt nou</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Niciun anunt"
          description="Nu aveti anunturi create inca."
          actionLabel="Creeaza primul anunt"
          actionHref="/sell/listing/new"
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cauta in anunturi"
              className="rounded-xl"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                <SelectItem value="concrete">Beton</SelectItem>
                <SelectItem value="materials">Materiale</SelectItem>
                <SelectItem value="equipment">Utilaje</SelectItem>
                <SelectItem value="services">Servicii</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate starile</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="out_of_stock">Fara stoc</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {visible.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Niciun anunt pentru filtrele alese.</p>
          )}
          {visible.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-semibold text-foreground">{l.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {l.category_name && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" /> {l.category_name}
                    </span>
                  )}
                  <MoneyDisplay
                    amount={l.price}
                    currency={l.currency as "EUR" | "RON"}
                    className="text-sm font-bold text-foreground"
                  />
                  <Badge
                    variant={l.is_active ? "default" : "secondary"}
                    className="rounded-lg text-[11px]"
                  >
                    {l.is_active ? "Activ" : "Inactiv"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Stoc: {Number(l.available_qty).toLocaleString("ro-RO")} {l.unit}
                  </span>
                  {Number(l.available_qty) <= 0 && (
                    <Badge variant="destructive" className="rounded-lg text-[11px]">Fara stoc</Badge>
                  )}
                  {!l.seller_assumes_transport && (
                    <span className="text-xs text-muted-foreground">Transport: platforma</span>
                  )}
                </div>
                {!l.is_active && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {commerce?.listingFeesEnabled &&
                      commerce.listingFeeCents > 0 &&
                      !(l.publish_paid_until && new Date(l.publish_paid_until) > new Date()) && (
                        <PayButton
                          purpose="listing_fee"
                          refId={String(l.id)}
                          label={`Plătește publicarea (${(commerce.listingFeeCents / 100).toFixed(2)} RON)`}
                        />
                      )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={async () => {
                        const res = await updateListing(l.id, { is_active: true })
                        if (!res.success) alert(res.error ?? "Anuntul nu a putut fi publicat.")
                        router.refresh()
                      }}
                    >
                      Publică
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:shrink-0">
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link href={`/products/${l.slug}-${l.id}`}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Vezi</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link href={`/sell/listing/${l.id}/edit`}>
                    <Edit className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Editeaza</span>
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5"
                      disabled={deletingId === l.id}
                    >
                      {deletingId === l.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sterge &ldquo;{l.title}&rdquo;?</AlertDialogTitle>
                      <AlertDialogDescription>Aceasta actiune este ireversibila.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Anuleaza</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl bg-destructive text-destructive-foreground"
                        onClick={async () => {
                          setDeletingId(l.id)
                          await deleteListing(l.id)
                          setDeletingId(null)
                          router.refresh()
                        }}
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
    </div>
  )
}
