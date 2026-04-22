import Link from "next/link"
import {
  Store, Gavel, TrendingUp, Star, MessageSquare, Wallet, Plus, BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/shared/kpi-card"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import { StripeSeamCard } from "@/components/shared/stripe-seam-card"
import type { SellerDashboard } from "@/lib/api/seller"
import type { Profile } from "@/lib/api/profile-client"

interface SellerDashboardTabProps {
  profile: Profile | null
  data: SellerDashboard
}

export function SellerDashboardTab({ profile, data }: SellerDashboardTabProps) {
  const isActive = Boolean(profile?.seller_activated_at)
  const hasBusiness = Boolean(profile?.company_name && profile?.tax_id)

  return (
    <div className="space-y-5">
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dashboard vanzator</h2>
          <p className="text-xs text-muted-foreground">Privire rapida asupra contului si activitatii.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/sell/listing/new"><Plus className="mr-1 h-3.5 w-3.5" /> Anunt</Link>
          </Button>
          <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" asChild>
            <Link href="/sell/auction/new"><Plus className="mr-1 h-3.5 w-3.5" /> Licitatie</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={Store}
          label="Anunturi active"
          value={data.activeListings}
          hint={`${data.totalListings} in total`}
        />
        <KpiCard
          icon={Gavel}
          label="Licitatii"
          value={data.activeAuctions}
          hint={`${data.liveAuctions} live`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Oferte (30 zile)"
          value={data.totalBids30d}
          hint="Pe toate licitatiile voastre"
        />
        <KpiCard
          icon={Star}
          label="Nota medie"
          value={data.reviewsCount > 0 ? data.avgRating.toFixed(1) : "-"}
          hint={`${data.reviewsCount} recenzii`}
        />
        <KpiCard
          icon={MessageSquare}
          label="Mesaje necitite"
          value={data.unreadMessages}
          hint="Inbox conversatii"
        />
        <KpiCard
          icon={Wallet}
          label="Venit lifetime"
          value="-"
          hint="Se activeaza dupa Stripe"
        />
      </div>

      <StripeSeamCard
        icon={BarChart3}
        title="Statistici avansate si payouts"
        description="Dupa activarea Stripe veti vedea incasari, comisioane, rambursari, evolutie lunara si rapoarte fiscale."
        bulletPoints={[
          "Comisioane platforma + Stripe",
          "Rambursari si dispute",
          "Rapoarte lunare si anuale",
          "Export CSV pentru contabilitate",
        ]}
      />
    </div>
  )
}
