"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/status-badge"
import { MoneyDisplay } from "@/components/shared/money-display"
import { EmptyState } from "@/components/shared/empty-state"
import { getOrders } from "@/lib/api/orders"
import { updateProfile, type Profile } from "@/lib/api/profile-client"
import { deleteListing, type Listing } from "@/lib/api/listings-client"
import { deleteAuction } from "@/lib/api/auctions-client"
import type { AuctionLot } from "@/lib/api/auctions"
import type { OrderSummary } from "@/types/domain"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  User, Gavel, ShoppingBag, FileText, Store, Plus, Eye, Edit, Trash2,
  Loader2, ChevronRight, Mail, Phone, Save, Tag, TrendingUp, Download,
} from "lucide-react"

interface MyListing extends Listing {
  category_name: string
}

interface MyAuction extends AuctionLot {
  category_name: string
}

interface AccountContentProps {
  userEmail: string
  profile: Profile | null
  myListings?: MyListing[]
  myAuctions?: MyAuction[]
}

type TabId = "profile" | "listings" | "auctions" | "orders" | "payments"

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profil", icon: User },
  { id: "listings", label: "Anunturi", icon: Store },
  { id: "auctions", label: "Licitatii", icon: Gavel },
  { id: "orders", label: "Comenzi", icon: ShoppingBag },
  { id: "payments", label: "Plati", icon: FileText },
]

export default function AccountContent({ userEmail, profile, myListings = [], myAuctions = [] }: AccountContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramTab = searchParams.get("tab") as TabId | null

  const [activeTab, setActiveTab] = useState<TabId>(
    paramTab && tabs.some((t) => t.id === paramTab) ? paramTab : "profile"
  )

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loadingO, setLoadingO] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingAuctionId, setDeletingAuctionId] = useState<number | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    displayName: profile?.display_name ?? "",
    phone: profile?.phone ?? "",
  })

  // Sync URL param to state on mount / param change
  useEffect(() => {
    if (paramTab && tabs.some((t) => t.id === paramTab) && paramTab !== activeTab) {
      setActiveTab(paramTab)
    }
  }, [paramTab]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(id: TabId) {
    setActiveTab(id)
    router.replace(`/account?tab=${id}`, { scroll: false })
  }

  const loadData = useCallback(async () => {
    setLoadingO(true)
    getOrders().then((o) => { setOrders(o); setLoadingO(false) })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function saveProfileHandler() {
    setSaving(true)
    setSaveMsg(null)
    const res = await updateProfile({
      display_name: form.displayName,
      phone: form.phone,
    })
    setSaving(false)
    if (res.success) {
      setSaveMsg("Salvat!")
      router.refresh()
    } else {
      setSaveMsg(res.error ?? "Eroare la salvare.")
    }
  }

  // Count badges
  const counts: Partial<Record<TabId, number>> = {
    listings: myListings.length,
    auctions: myAuctions.length,
  }

  const initials = (profile?.display_name || userEmail)
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* User header card */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary sm:h-16 sm:w-16 sm:text-2xl">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {profile?.display_name || "Utilizator"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/sell/listing/new"><Plus className="mr-1 h-4 w-4" /> Anunt Nou</Link>
          </Button>
          <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" asChild>
            <Link href="/sell/auction/new"><Gavel className="mr-1 h-4 w-4" /> Licitatie Noua</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1 rounded-2xl border border-border/50 bg-card p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = counts[tab.id]
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  {count != null && count > 0 && (
                    <Badge variant="secondary" className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                      {count}
                    </Badge>
                  )}
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Mobile horizontal pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = counts[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-card text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {count != null && count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1 text-[10px]">
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 min-w-0">

          {/* ═══ PROFILE TAB ═══ */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
                <h2 className="mb-5 text-lg font-bold text-foreground">Informatii Personale</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <User className="h-3 w-3" /> Nume
                      </Label>
                      <Input
                        value={form.displayName}
                        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                        className="h-11 rounded-xl"
                        placeholder="Nume complet"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Phone className="h-3 w-3" /> Telefon
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="h-11 rounded-xl"
                        placeholder="07xx xxx xxx"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <Input value={userEmail} disabled className="h-11 rounded-xl bg-muted/50" />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      onClick={saveProfileHandler}
                      disabled={saving}
                      className="h-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salveaza Modificarile
                    </Button>
                    {saveMsg && (
                      <span className={`text-sm font-medium ${saveMsg === "Salvat!" ? "text-emerald-600" : "text-destructive"}`}>
                        {saveMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ LISTINGS TAB ═══ */}
          {activeTab === "listings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Anunturile Mele</h2>
                <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Link href="/sell/listing/new"><Plus className="mr-1 h-4 w-4" /> Anunt Nou</Link>
                </Button>
              </div>

              {myListings.length === 0 ? (
                <EmptyState
                  icon={Store}
                  title="Niciun anunt"
                  description="Nu aveti anunturi create inca."
                  actionLabel="Creeaza primul anunt"
                  actionHref="/sell/listing/new"
                />
              ) : (
                <div className="space-y-3">
                  {myListings.map((l) => (
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
                          <Link href={`/products/${l.slug}-${l.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Vezi</span></Link>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <Link href={`/sell/listing/${l.id}/edit`}><Edit className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Editeaza</span></Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5" disabled={deletingId === l.id}>
                              {deletingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
                                onClick={async () => { setDeletingId(l.id); await deleteListing(l.id); setDeletingId(null); router.refresh() }}
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
          )}

          {/* ═══ AUCTIONS TAB ═══ */}
          {activeTab === "auctions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Licitatiile Mele</h2>
                <Button asChild className="rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Link href="/sell/auction/new"><Plus className="mr-1 h-4 w-4" /> Licitatie Noua</Link>
                </Button>
              </div>

              {myAuctions.length === 0 ? (
                <EmptyState
                  icon={Gavel}
                  title="Nicio licitatie"
                  description="Nu aveti licitatii create inca."
                  actionLabel="Creeaza prima licitatie"
                  actionHref="/sell/auction/new"
                />
              ) : (
                <div className="space-y-3">
                  {myAuctions.map((a) => (
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
                          <Link href={`/auctions/${a.slug}-${a.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Vezi</span></Link>
                        </Button>
                        {(a.status === "draft" || a.status === "scheduled") && (
                          <Button variant="outline" size="sm" className="rounded-xl" asChild>
                            <Link href={`/sell/auction/${a.id}/edit`}><Edit className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Editeaza</span></Link>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5" disabled={deletingAuctionId === a.id}>
                              {deletingAuctionId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sterge &ldquo;{a.title}&rdquo;?</AlertDialogTitle>
                              <AlertDialogDescription>Aceasta actiune este ireversibila.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Anuleaza</AlertDialogCancel>
                              <AlertDialogAction
                                className="rounded-xl bg-destructive text-destructive-foreground"
                                onClick={async () => { setDeletingAuctionId(a.id); await deleteAuction(a.id); setDeletingAuctionId(null); router.refresh() }}
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
          )}

          {/* ═══ ORDERS TAB ═══ */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Comenzile Mele</h2>
              {loadingO ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="Nicio comanda"
                  description="Nu aveti comenzi inca."
                  actionLabel="Viziteaza magazinul"
                  actionHref="/marketplace"
                />
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-sm font-semibold text-foreground">
                          Comanda <span className="font-mono text-xs text-muted-foreground">#{o.id}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={o.status} />
                          <StatusBadge status={o.paymentStatus} />
                          <span className="text-xs text-muted-foreground">{o.itemCount} produse</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <MoneyDisplay amount={o.total} currency={o.currency} className="text-base font-bold text-foreground" />
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <Link href={`/account/orders/${o.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Detalii</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PAYMENTS TAB ═══ */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Plati & Facturi</h2>
              {orders.filter((o) => o.paymentStatus === "PAID").length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Nicio factura"
                  description="Nu aveti facturi inca."
                />
              ) : (
                <div className="space-y-3">
                  {orders.filter((o) => o.paymentStatus === "PAID").map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">Comanda #{o.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ro-RO")}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:shrink-0">
                        <MoneyDisplay amount={o.total} currency={o.currency} className="text-base font-bold" />
                        <Button variant="outline" size="sm" className="rounded-xl">
                          <Download className="mr-1 h-3.5 w-3.5" /> Factura
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
