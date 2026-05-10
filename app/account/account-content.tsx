"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  User, Building2, MapPin, Settings, Bell, Shield, ShieldAlert,
  ShoppingBag, Heart, Star, CreditCard,
  BarChart3, Store, Gavel, Wallet, Truck, FileText,
  MessageSquare, Plus, ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { ProfileTab } from "./tabs/profile-tab"
import { BusinessProfileTab } from "./tabs/business-profile-tab"
import { AddressesTab } from "./tabs/addresses-tab"
import { PreferencesTab } from "./tabs/preferences-tab"
import { NotificationsTab } from "./tabs/notifications-tab"
import { SecurityTab } from "./tabs/security-tab"
import { PrivacyTab } from "./tabs/privacy-tab"
import { OrdersTab } from "./tabs/orders-tab"
import { WishlistTab } from "./tabs/wishlist-tab"
import { ReviewsGivenTab } from "./tabs/reviews-given-tab"
import { PaymentMethodsTab } from "./tabs/payment-methods-tab"
import { SellerDashboardTab } from "./tabs/seller-dashboard-tab"
import { ListingsTab } from "./tabs/listings-tab"
import { AuctionsTab } from "./tabs/auctions-tab"
import { SellerPayoutsTab } from "./tabs/seller-payouts-tab"
import { SellerShippingTab } from "./tabs/seller-shipping-tab"
import { SellerPoliciesTab } from "./tabs/seller-policies-tab"
import { ReviewsReceivedTab } from "./tabs/reviews-received-tab"
import { MessagesTab } from "./tabs/messages-tab"

import type { AccountData, TabId, TabGroupId } from "./tabs/types"

interface AccountContentProps extends AccountData {
  currentUserId: string
}

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
  group: TabGroupId
  badge?: number
}

interface GroupDef {
  id: TabGroupId
  label: string
}

const GROUPS: GroupDef[] = [
  { id: "cont", label: "Cont" },
  { id: "cumparator", label: "Cumpărător" },
  { id: "vanzator", label: "Vânzător" },
  { id: "comunicare", label: "Comunicare" },
]

function useTabs(data: AccountData): TabDef[] {
  return useMemo(
    () => [
      { id: "profile",            label: "Profil",          icon: User,         group: "cont" },
      { id: "business",           label: "Date firma",      icon: Building2,    group: "cont" },
      { id: "addresses",          label: "Adrese",          icon: MapPin,       group: "cont", badge: data.addresses.length },
      { id: "preferences",        label: "Preferinte",      icon: Settings,     group: "cont" },
      { id: "notifications",      label: "Notificari",      icon: Bell,         group: "cont" },
      { id: "security",           label: "Securitate",      icon: Shield,       group: "cont" },
      { id: "privacy",            label: "Confidentialitate", icon: ShieldAlert, group: "cont" },

      { id: "orders",             label: "Comenzi",         icon: ShoppingBag,  group: "cumparator" },
      { id: "wishlist",           label: "Favorite",        icon: Heart,        group: "cumparator", badge: data.wishlist.length },
      { id: "reviews-given",      label: "Recenzii date",   icon: Star,         group: "cumparator", badge: data.reviewsGiven.length },
      { id: "payment-methods",    label: "Metode plata",    icon: CreditCard,   group: "cumparator" },

      { id: "seller-dashboard",   label: "Dashboard",       icon: BarChart3,    group: "vanzator" },
      { id: "listings",           label: "Anunturi",        icon: Store,        group: "vanzator", badge: data.myListings.length },
      { id: "auctions",           label: "Licitatii",       icon: Gavel,        group: "vanzator", badge: data.myAuctions.length },
      { id: "seller-payouts",     label: "Payouts",         icon: Wallet,       group: "vanzator" },
      { id: "seller-shipping",    label: "Livrare",         icon: Truck,        group: "vanzator" },
      { id: "seller-policies",    label: "Politici",        icon: FileText,     group: "vanzator" },
      { id: "reviews-received",   label: "Recenzii primite", icon: Star,        group: "vanzator", badge: data.reviewsReceived.length },

      { id: "messages",           label: "Mesaje",          icon: MessageSquare, group: "comunicare", badge: data.threads.reduce((s, t) => s + t.unread_count, 0) },
    ],
    [data],
  )
}

const DEFAULT_TAB: TabId = "profile"

export default function AccountContent(props: AccountContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabs = useTabs(props)

  const paramTab = searchParams.get("tab") as TabId | null
  const initialTab: TabId =
    paramTab && tabs.some((t) => t.id === paramTab) ? paramTab : DEFAULT_TAB

  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  useEffect(() => {
    if (paramTab && tabs.some((t) => t.id === paramTab) && paramTab !== activeTab) {
      setActiveTab(paramTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTab])

  function switchTab(id: TabId) {
    setActiveTab(id)
    router.replace(`/account?tab=${id}`, { scroll: false })
  }

  const initials = (props.profile?.display_name || props.userEmail)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  const avatarPath = props.profile?.avatar_path ?? null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const avatarSrc =
    avatarPath && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/avatars/${avatarPath}`
      : null

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Header card */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-xl font-bold text-primary sm:h-16 sm:w-16 sm:text-2xl">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt="Avatar"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {props.profile?.display_name || "Utilizator"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{props.userEmail}</p>
          {props.profile?.seller_activated_at && (
            <Badge className="mt-1 rounded-lg bg-emerald-500/10 text-[10px] text-emerald-600 hover:bg-emerald-500/10">
              Cont vânzător activ
            </Badge>
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/sell/listing/new"><Plus className="mr-1 h-4 w-4" /> Anunt</Link>
          </Button>
          <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" asChild>
            <Link href="/sell/auction/new"><Gavel className="mr-1 h-4 w-4" /> Licitatie</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Desktop grouped sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-20 rounded-2xl border border-border/50 bg-card p-2" aria-label="Navigatie cont">
            {GROUPS.map((group) => (
              <div key={group.id} className="mb-2 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {tabs
                    .filter((t) => t.group === group.id)
                    .map((tab) => {
                      const Icon = tab.icon
                      const isActive = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => switchTab(tab.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{tab.label}</span>
                          {tab.badge != null && tab.badge > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px]"
                            >
                              {tab.badge}
                            </Badge>
                          )}
                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 ${
                              isActive ? "text-primary" : "text-muted-foreground/40"
                            }`}
                          />
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile horizontal tabs grouped by pill row */}
        <div className="lg:hidden space-y-2">
          {GROUPS.map((group) => {
            const groupTabs = tabs.filter((t) => t.group === group.id)
            if (groupTabs.length === 0) return null
            return (
              <div key={group.id}>
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {groupTabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/50 bg-card text-muted-foreground"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.badge != null && tab.badge > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[10px]">
                            {tab.badge}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Content area */}
        <section className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <ProfileTab userEmail={props.userEmail} profile={props.profile} />
          )}
          {activeTab === "business" && <BusinessProfileTab profile={props.profile} />}
          {activeTab === "addresses" && <AddressesTab addresses={props.addresses} />}
          {activeTab === "preferences" && <PreferencesTab profile={props.profile} />}
          {activeTab === "notifications" && (
            <NotificationsTab notificationPrefs={props.notificationPrefs} />
          )}
          {activeTab === "security" && <SecurityTab loginEvents={props.loginEvents} />}
          {activeTab === "privacy" && <PrivacyTab deletionRequest={props.deletionRequest} />}

          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "wishlist" && <WishlistTab wishlist={props.wishlist} />}
          {activeTab === "reviews-given" && <ReviewsGivenTab reviews={props.reviewsGiven} />}
          {activeTab === "payment-methods" && <PaymentMethodsTab />}

          {activeTab === "seller-dashboard" && (
            <SellerDashboardTab profile={props.profile} data={props.sellerDashboard} />
          )}
          {activeTab === "listings" && (
            <ListingsTab profile={props.profile} listings={props.myListings} />
          )}
          {activeTab === "auctions" && (
            <AuctionsTab profile={props.profile} auctions={props.myAuctions} />
          )}
          {activeTab === "seller-payouts" && <SellerPayoutsTab />}
          {activeTab === "seller-shipping" && <SellerShippingTab profile={props.profile} />}
          {activeTab === "seller-policies" && <SellerPoliciesTab profile={props.profile} />}
          {activeTab === "reviews-received" && (
            <ReviewsReceivedTab reviews={props.reviewsReceived} />
          )}

          {activeTab === "messages" && (
            <MessagesTab threads={props.threads} currentUserId={props.currentUserId} />
          )}
        </section>
      </div>
    </div>
  )
}
