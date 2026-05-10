"use client"

import Link from "next/link"
import { Gavel, Plus, Eye, Edit, Tag, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import type { MyAuction } from "./types"
import type { Profile } from "@/lib/api/profile-client"

interface AuctionsTabProps {
  profile: Profile | null
  auctions: MyAuction[]
}

export function AuctionsTab({ profile, auctions }: AuctionsTabProps) {
  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  return (
    <div className="space-y-4">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} />}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Licitatiile mele</h2>
        <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Link href="/sell/auction/new">
            <Plus className="mr-1 h-4 w-4" /> Licitatie noua
          </Link>
        </Button>
      </div>

      {auctions.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Nicio licitatie"
          description="Nu aveti licitatii persistente — functionalitatea este in relansare."
          actionLabel="Formular demonstrativ"
          actionHref="/sell/auction/new"
        />
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-semibold text-foreground">{a.title}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {a.category_name && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" /> {a.category_name}
                    </span>
                  )}
                  <StatusBadge status={a.status} />
                  <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <MoneyDisplay amount={a.current_price} currency={a.currency as "EUR" | "RON"} />
                  </span>
                  <Badge variant="secondary" className="rounded-lg text-[11px]">
                    {a.bid_count} oferte
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:shrink-0">
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link href={`/auctions/${a.slug}-${a.id}`}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Vezi</span>
                  </Link>
                </Button>
                {(a.status === "draft" || a.status === "scheduled") && (
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link href={`/sell/auction/${a.id}/edit`}>
                      <Edit className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Editeaza</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
