import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">
            Comanda plasata cu succes!
          </h1>
          <p className="text-muted-foreground">
            Multumim pentru comanda. Veti primi un email de confirmare in
            curand cu detaliile comenzii.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/account?tab=orders">Comenzile mele</Link>
            </Button>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/marketplace">
                Continua cumparaturile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
