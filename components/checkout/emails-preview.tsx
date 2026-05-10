"use client"

import { useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Inbox, Mail, Loader2 } from "lucide-react"
import { EmailBuyerTemplate } from "./email-buyer-template"
import { EmailSellerTemplate } from "./email-seller-template"
import { sendOrderEmailsAction, type PlacedOrder } from "@/app/checkout/actions"
import { useToast } from "@/hooks/use-toast"

type Snapshot = Record<string, unknown> | null
function readString(s: Snapshot, key: string): string {
  if (!s) return ""
  const v = s[key]
  return typeof v === "string" ? v : ""
}
function readObject(s: Snapshot, key: string): Snapshot {
  if (!s) return null
  const v = s[key]
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Snapshot) : null
}

interface InboxHeaderProps {
  from: string
  to: string
  subject: string
}

function InboxHeader({ from, to, subject }: InboxHeaderProps) {
  return (
    <div className="space-y-1.5 border-b border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/70">
          De la
        </span>
        <span className="text-foreground">{from}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/70">
          Către
        </span>
        <span className="text-foreground">{to}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground/70">
          Subiect
        </span>
        <span className="text-foreground">{subject}</span>
      </div>
    </div>
  )
}

export interface EmailsPreviewProps {
  order: PlacedOrder
}

export function EmailsPreview({ order }: EmailsPreviewProps) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()
  const buyerEmail =
    readString(readObject(order.buyer_snapshot, "form_billing"), "email") ||
    "client@exemplu.ro"
  const sellerName =
    readString(order.seller_snapshot, "company_name") ||
    readString(order.seller_snapshot, "display_name") ||
    "Furnizor"
  const sellerAuthEmail = readString(order.seller_snapshot, "auth_email").trim()
  const sellerTo =
    sellerAuthEmail !== ""
      ? `${sellerName} <${sellerAuthEmail}>`
      : `${sellerName} <furnizor@exemplu.ro>`

  function handleResend() {
    startTransition(async () => {
      const result = await sendOrderEmailsAction(order.id)
      if (!result.ok) {
        toast({
          title: "Nu s-au putut trimite emailurile",
          description: result.error,
          variant: "destructive",
        })
        return
      }
      const parts: string[] = []
      if (result.buyerSent) parts.push("cumpărător")
      if (result.sellerSent) parts.push("furnizor")
      const warn =
        result.messages?.filter(Boolean).join(" ") ?? ""
      toast({
        title: "Emailuri trimise",
        description:
          parts.length > 0
            ? `Trimise către: ${parts.join(", ")}.${warn ? ` ${warn}` : ""}`
            : warn || "Operațiune finalizată.",
      })
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email confirmare
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            După plată, confirmările se trimit automat prin Resend (dacă
            RESEND_API_KEY este setat). Poți retrimite manual de aici.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResend}
          type="button"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-2 h-3.5 w-3.5" />
          )}
          {pending ? "Se trimite…" : "Retrimite emailuri"}
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Cumpărător */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
              <div className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Către cumpărător
                </span>
              </div>
              <Badge
                variant="outline"
                className="rounded-md text-[10px] font-medium"
              >
                Cumpărător
              </Badge>
            </div>
            <InboxHeader
              from="ConstructionHub Romania <noreply@constructionhub.ro>"
              to={buyerEmail}
              subject={`Confirmare comandă ${order.order_number ?? ""} · Deviz ${order.deviz_number ?? ""}`}
            />
            <div className="max-h-[520px] overflow-auto bg-[#f4f5f7]">
              <EmailBuyerTemplate order={order} />
            </div>
          </div>

          {/* Furnizor */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
              <div className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Către furnizor
                </span>
              </div>
              <Badge
                variant="outline"
                className="rounded-md text-[10px] font-medium"
              >
                Furnizor
              </Badge>
            </div>
            <InboxHeader
              from="ConstructionHub Romania <noreply@constructionhub.ro>"
              to={sellerTo}
              subject={`Comandă nouă ${order.order_number ?? ""} de la ${
                readString(
                  readObject(order.buyer_snapshot, "form_billing"),
                  "name",
                ) || "client"
              }`}
            />
            <div className="max-h-[520px] overflow-auto bg-[#f4f5f7]">
              <EmailSellerTemplate order={order} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
