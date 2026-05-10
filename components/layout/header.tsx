"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  HardHat,
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  Gavel,
  Store,
  Plus,
  Home,
  UserCircle,
  ClipboardList,
  Settings,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/lib/cart-context"
import { createClient } from "@/lib/supabase/client"

const navLinks = [
  { href: "/", label: "Acasa", icon: Home },
  { href: "/auctions", label: "Licitatii", icon: Gavel },
  { href: "/marketplace", label: "Magazin", icon: Store },
]

const publishLinks = [
  { href: "/sell/listing/new", label: "Anunt Nou", sublabel: "Vinde pe magazin", icon: Store },
  { href: "/sell/auction/new", label: "Licitatie Noua", sublabel: "Porneste o licitatie", icon: Gavel },
]

interface InitialUser {
  email: string
  displayName: string
}

interface SiteHeaderProps {
  initialUser: InitialUser | null
  isAdmin?: boolean
  wishlistCount?: number
}

export function SiteHeader({ initialUser, isAdmin = false, wishlistCount = 0 }: SiteHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { totalItems } = useCart()
  const [scrolled, setScrolled] = useState(false)

  const [authedUser, setAuthedUser] = useState<InitialUser | null>(initialUser)
  // Radix DropdownMenu assigns unstable ids during SSR vs first client paint; render menus only after mount.
  const [radixMenusReady, setRadixMenusReady] = useState(false)

  useEffect(() => {
    setRadixMenusReady(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setAuthedUser({
            email: session.user.email ?? "",
            displayName: session.user.user_metadata?.display_name ?? "",
          })
        } else {
          setAuthedUser(null)
        }
      }
    )
    return () => { subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8) }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const isLoggedIn = !!authedUser
  const isPublishActive = pathname.startsWith("/sell")

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border/50 shadow-sm"
          : "bg-card/95 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <HardHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">
            Construction<span className="text-primary">Hub</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            )
          })}

          {/* Publica dropdown — mounted client-only so Radix ids match and hydration stays clean */}
          {radixMenusReady ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isPublishActive
                      ? "bg-primary/10 text-primary"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Publica
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                {publishLinks.map((pl) => (
                  <DropdownMenuItem key={pl.href} asChild className="rounded-lg p-0">
                    <Link href={pl.href} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <pl.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pl.label}</p>
                        <p className="text-xs text-muted-foreground">{pl.sublabel}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              disabled
              aria-hidden
              tabIndex={-1}
              className={`inline-flex cursor-default items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold opacity-90 ${
                isPublishActive
                  ? "bg-primary/10 text-primary"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <Plus className="h-4 w-4" />
              Publica
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </nav>

        {/* Desktop Right */}
        <div className="hidden items-center gap-1.5 md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cauta..."
              className="h-9 w-44 rounded-xl border border-border/60 bg-muted/50 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {isLoggedIn && (
            <Link href="/account?tab=wishlist">
              <Button variant="ghost" size="icon" className="relative rounded-xl">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                    {wishlistCount}
                  </span>
                )}
                <span className="sr-only">Lista de favorite</span>
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                  {totalItems}
                </span>
              )}
              <span className="sr-only">Cos de cumparaturi</span>
            </Button>
          </Link>

          {isLoggedIn ? (
            radixMenusReady ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="max-w-[100px] truncate text-sm font-medium">
                      {authedUser.displayName || authedUser.email}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/account" className="gap-2">
                      <UserCircle className="h-4 w-4" /> Contul meu
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/account?tab=orders" className="gap-2">
                      <ClipboardList className="h-4 w-4" /> Comenzile mele
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/account?tab=auctions" className="gap-2">
                      <Gavel className="h-4 w-4" /> Licitatiile mele
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="rounded-lg">
                        <Link href="/admin" className="gap-2">
                          <Settings className="h-4 w-4" /> Panou Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 rounded-lg text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Deconectare
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl" asChild>
                <Link href="/account">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="max-w-[100px] truncate text-sm font-medium">
                    {authedUser.displayName || authedUser.email}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
                </Link>
              </Button>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" asChild className="rounded-xl text-sm">
                <Link href="/login">Autentificare</Link>
              </Button>
              <Button size="sm" asChild className="rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
                <Link href="/register">Inregistrare</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Right */}
        <div className="flex items-center gap-1 md:hidden">
          {isLoggedIn && (
            <Link href="/account?tab=wishlist">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="animate-in slide-in-from-top-2 fade-in-0 duration-200 border-t border-border/50 bg-card px-4 pb-5 pt-3 md:hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cauta produse, licitatii..."
              className="h-11 w-full rounded-xl border border-border/60 bg-muted/50 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Nav links */}
          <nav className="mb-3 grid grid-cols-3 gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Publish actions - two prominent cards */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            {publishLinks.map((pl) => (
              <Link
                key={pl.href}
                href={pl.href}
                onClick={() => setMobileOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-center transition-colors hover:bg-primary/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                  <pl.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-semibold text-primary">{pl.label}</span>
              </Link>
            ))}
          </div>

          {/* Auth section */}
          <div className="border-t border-border/50 pt-3">
            {isLoggedIn ? (
              <div className="space-y-2">
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{authedUser.displayName || "Utilizator"}</p>
                    <p className="truncate text-xs text-muted-foreground">{authedUser.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); handleLogout() }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-2.5 text-sm font-medium text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Deconectare
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild className="h-11 rounded-xl text-sm font-medium">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Autentificare</Link>
                </Button>
                <Button asChild className="h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  <Link href="/register" onClick={() => setMobileOpen(false)}>Inregistrare</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
