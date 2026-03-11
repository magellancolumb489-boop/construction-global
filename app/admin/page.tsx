"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminStats } from "@/lib/api/admin"
import { MoneyDisplay } from "@/components/shared/money-display"
import type { AdminStats } from "@/types/domain"
import { Gavel, ShoppingBag, Users, CreditCard, TrendingUp, Activity } from "lucide-react"

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats().then((s) => { setStats(s); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Prezentare Generala</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { title: "Total Licitatii", value: stats.totalAuctions, icon: Gavel, color: "text-chart-1" },
    { title: "Licitatii Active", value: stats.activeAuctions, icon: Activity, color: "text-chart-3" },
    { title: "Total Comenzi", value: stats.totalOrders, icon: ShoppingBag, color: "text-chart-4" },
    { title: "Total Utilizatori", value: stats.totalUsers, icon: Users, color: "text-chart-2" },
    { title: "Total Plati", value: stats.totalPayments, icon: CreditCard, color: "text-chart-5" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Prezentare Generala</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={cn("h-5 w-5", c.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Venituri Totale</CardTitle>
            <TrendingUp className="h-5 w-5 text-chart-3" />
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={stats.revenue} currency="RON" className="text-3xl font-bold" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
