import Link from "next/link"
import {
  Store, ShoppingBag, ClipboardList, Star, MessageSquare, Wallet, Plus, HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/shared/kpi-card"
import { SellerActivationBanner } from "@/components/shared/seller-activation-banner"
import { formatMoney } from "@/components/shared/money-display"
import type { Currency } from "@/types/domain"
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
      {!isActive && <SellerActivationBanner hasBusinessProfile={hasBusiness} profile={profile} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dashboard vânzător</h2>
          <p className="text-xs text-muted-foreground">Privire rapida asupra contului si activitatii.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/sell/listing/new"><Plus className="mr-1 h-3.5 w-3.5" /> Anunt</Link>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl" asChild>
            <Link href="/ghid#vanzator"><HelpCircle className="mr-1 h-3.5 w-3.5" /> Ghid</Link>
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
          icon={ShoppingBag}
          label="Comenzi (30 zile)"
          value={data.orders30d}
          hint="Comenzi primite, fără cele anulate"
        />
        <KpiCard
          icon={ClipboardList}
          label="De procesat"
          value={data.ordersToHandle}
          hint="Livrări de programat sau probleme"
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
          label="Vânzări totale (cu TVA)"
          value={formatMoney(data.lifetimeRevenue, data.currency as Currency)}
          hint={`Plătite, de decontat: ${formatMoney(data.pendingPayouts, data.currency as Currency)}`}
        />
      </div>

      {data.ordersToHandle > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Ai {data.ordersToHandle} comenzi care așteaptă programarea livrării.{" "}
          <Link href="/account?tab=orders" className="font-semibold underline">Vezi comenzile</Link>
        </div>
      )}
    </div>
  )
}
