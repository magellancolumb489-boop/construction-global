"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Gavel, ShoppingBag, Users, CreditCard, ArrowLeft } from "lucide-react"

const navItems = [
  { href: "/admin", label: "Prezentare Generala", icon: LayoutDashboard },
  { href: "/admin/auctions", label: "Licitatii", icon: Gavel },
  { href: "/admin/orders", label: "Comenzi", icon: ShoppingBag },
  { href: "/admin/users", label: "Utilizatori", icon: Users },
  { href: "/admin/payments", label: "Plati", icon: CreditCard },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-secondary text-secondary-foreground">
      <div className="p-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-secondary-foreground/60 hover:text-secondary-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Inapoi la site
        </Link>
        <h2 className="mb-6 text-lg font-bold">Admin Panel</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-secondary-foreground/70 hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
