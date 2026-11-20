import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DevizPreview } from "@/components/checkout/deviz-preview"
import { DevizPdfDownload } from "@/components/checkout/deviz-pdf-download"
import { getPlacedOrderById } from "@/lib/api/order-payload"
import { getOrderViewerRole } from "@/lib/api/order-viewer"
import { allowedProformaCopies, type ProformaCopy } from "@/lib/checkout/proforma"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ copy?: string }>
}

const COPY_LABEL: Record<ProformaCopy, string> = {
  buyer: "Cumpărător",
  seller: "Furnizor",
  platform: "Intermediar",
}

// Proforma route. Buyer sees the buyer copy, seller the seller copy, the
// platform (admin) all three. Unknown or forbidden ?copy= falls back.
export default async function OrderProformaPage({ params, searchParams }: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const order = await getPlacedOrderById(id)
  if (!order) notFound()
  const role = await getOrderViewerRole(order)
  if (!role) notFound()

  const allowed = allowedProformaCopies(role)
  const copy = allowed.includes(sp.copy as ProformaCopy) ? (sp.copy as ProformaCopy) : allowed[0]!

  return (
    <div className="bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-[210mm] px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/account/orders/${order.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Înapoi la comandă
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {allowed.length > 1 &&
              allowed.map((c) => (
                <Button key={c} size="sm" variant={c === copy ? "default" : "outline"} asChild>
                  <Link href={`?copy=${c}`}>{COPY_LABEL[c]}</Link>
                </Button>
              ))}
            <DevizPdfDownload order={order} copy={copy} variant="default" />
          </div>
        </div>
        <DevizPreview order={order} copy={copy} />
      </div>
    </div>
  )
}
