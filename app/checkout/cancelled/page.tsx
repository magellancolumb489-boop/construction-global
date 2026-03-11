import Link from "next/link"
import { XCircle, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function CheckoutCancelledPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">
            Plata anulata
          </h1>
          <p className="text-muted-foreground">
            Plata a fost anulata sau a esuat. Produsele sunt inca in cosul
            dumneavoastra.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/cart">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Inapoi la cos
              </Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="mailto:suport@constructionhub.ro">Contacteaza suportul</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
