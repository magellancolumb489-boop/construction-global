"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Store, Plus, Eye, Edit, Trash2, Loader2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

interface ListingsTabProps {
  profile: Profile | null
  listings: MyListing[]
}

export function ListingsTab({ profile, listings }: ListingsTabProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  return (
    <div className="space-y-4">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} />}

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
          {listings.map((l) => (
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
                </div>
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
