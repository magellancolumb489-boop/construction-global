import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DevizPreview } from "@/components/checkout/deviz-preview"
import { DevizPdfDownload } from "@/components/checkout/deviz-pdf-download"
import { getPlacedOrderById } from "@/lib/api/order-payload"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

// Standalone deviz route. Mounts DevizPreview at A4 width so the user can
// re-print or save the PDF anytime after the original checkout flow.
export default async function OrderDevizPage({ params }: PageProps) {
  const { id } = await params
  const order = await getPlacedOrderById(id)
  if (!order) notFound()

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
          <DevizPdfDownload order={order} variant="default" />
        </div>
        <DevizPreview order={order} />
      </div>
    </div>
  )
}
