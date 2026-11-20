"use client"

// Lazy wrapper around @react-pdf/renderer's <PDFDownloadLink>. The renderer
// is a heavy bundle (PDF.js, fontkit, etc.) so we keep it out of the SSR
// bundle entirely — both the renderer module and this component are dynamic.

import dynamic from "next/dynamic"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DevizPdfDocument } from "./deviz-pdf-document"
import type { PlacedOrder } from "@/app/checkout/actions"
import type { ProformaCopy } from "@/lib/checkout/proforma"

// PDFDownloadLink is client-only. ssr: false dodges "self is not defined".
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <Button size="sm" variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Se pregătește PDF…
      </Button>
    ),
  },
)

export interface DevizPdfDownloadProps {
  order: PlacedOrder
  /** Which proforma: buyer (default), seller or platform. */
  copy?: ProformaCopy
  label?: string
  fileName?: string
  variant?: "default" | "outline" | "secondary"
  size?: "sm" | "default" | "lg"
}

export function DevizPdfDownload({
  order,
  copy = "buyer",
  label = "Descarcă PDF",
  fileName,
  variant = "outline",
  size = "sm",
}: DevizPdfDownloadProps) {
  const file =
    fileName ??
    `proforma-${copy}-${order.order_number || order.id}.pdf`

  return (
    <PDFDownloadLink
      document={<DevizPdfDocument order={order} copy={copy} />}
      fileName={file}
      style={{ textDecoration: "none" }}
    >
      {({ loading }) => (
        <Button size={size} variant={variant} disabled={loading} type="button">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {loading ? "Se pregătește PDF…" : label}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
