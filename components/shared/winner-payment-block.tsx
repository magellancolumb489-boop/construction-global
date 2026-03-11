"use client"

import { Trophy, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoneyDisplay } from "./money-display"
import type { AuctionDetail } from "@/types/domain"

// Payment statuses are not in DB yet; this component becomes active once
// payment flow is implemented. Until then it renders null for all DB statuses.
const PAYMENT_STATUSES = ["AWAITING_PAYMENT", "PAID", "EXPIRED_UNPAID"]

export function WinnerPaymentBlock({ auction }: { auction: AuctionDetail }) {
  const status = auction.status as string

  if (!PAYMENT_STATUSES.includes(status)) {
    return null
  }

  return (
    <Card className="border-primary/30 bg-accent/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Ati castigat aceasta licitatie!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "AWAITING_PAYMENT" && (
          <>
            <p className="text-sm text-muted-foreground">
              Felicitari! Va rugam sa efectuati plata pentru a finaliza
              achizitia.
            </p>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <a href="#">
                <CreditCard className="mr-2 h-4 w-4" />
                Plateste acum
              </a>
            </Button>
          </>
        )}

        {status === "PAID" && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Plata efectuata cu succes!</p>
          </div>
        )}

        {status === "EXPIRED_UNPAID" && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">
                Termenul de plata a expirat.
              </p>
              <p className="text-sm">
                Contactati suportul la{" "}
                <a
                  href="mailto:suport@constructionhub.ro"
                  className="underline"
                >
                  suport@constructionhub.ro
                </a>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
