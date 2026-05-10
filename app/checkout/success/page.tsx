import Link from "next/link"
import { CheckCircle2, ArrowRight, FileText, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getOrderDetail } from "@/lib/api/orders"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ orderId?: string | string[] }>
}

// Server component: when ?orderId= is present, hit the orders API to surface
// the deviz / order numbers prominently. Falls back to the generic copy
// for older flows that didn't carry the id.
export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const rawId = Array.isArray(sp.orderId) ? sp.orderId[0] : sp.orderId
  const orderId = rawId?.trim() || null

  let orderNumber: string | null = null
  let devizNumber: string | null = null

  if (orderId) {
    // Validate the user is allowed to read this order (RLS does the heavy
    // lifting). We pull order_number / deviz_number out via a tiny query
    // separate from getOrderDetail to keep the page snappy.
    const supabase = await createClient()
    const { data } = await supabase
      .from("orders")
      .select("order_number, deviz_number")
      .eq("id", orderId)
      .maybeSingle()

    orderNumber = data?.order_number ?? null
    devizNumber = data?.deviz_number ?? null

    // Touch the orders detail so revalidation primes the cache too.
    if (!data) {
      // Best-effort: ignore failure; the user still sees the generic success card.
      await getOrderDetail(orderId).catch(() => null)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">
            Comandă plasată cu succes!
          </h1>
          {orderNumber || devizNumber ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              {orderNumber && (
                <p>
                  Comanda{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {orderNumber}
                  </span>{" "}
                  este înregistrată în sistem.
                </p>
              )}
              {devizNumber && (
                <p>
                  Deviz{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {devizNumber}
                  </span>{" "}
                  — îl poți redescărca oricând din pagina comenzii.
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Mulțumim pentru comandă. Vei primi un email de confirmare în
              curând cu detaliile comenzii.
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {orderId && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/account/orders/${orderId}/deviz`}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Vezi deviz
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/account/orders/${orderId}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Detalii comandă
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" asChild>
              <Link href="/account?tab=orders">Comenzile mele</Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/marketplace">
                Continuă cumpărăturile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
