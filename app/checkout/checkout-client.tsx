"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { MoneyDisplay } from "@/components/shared/money-display"
import { useCart } from "@/lib/cart-context"
import { CreditCard, ArrowRight, FileText } from "lucide-react"
import {
  placeOrderAction,
  type CheckoutCartItem,
  type CheckoutFormInput,
  type PlacedOrder,
} from "./actions"
import {
  ProcessingOverlay,
  DEFAULT_PROCESSING_PHASES,
  type ProcessingPhase,
} from "@/components/checkout/processing-overlay"
import { DevizPreview } from "@/components/checkout/deviz-preview"
import { DevizPdfDownload } from "@/components/checkout/deviz-pdf-download"
import { EmailsPreview } from "@/components/checkout/emails-preview"

type CheckoutStep = "idle" | "processing" | "deviz" | "emails" | "done"

interface CheckoutClientProps {
  userEmail: string
}

// Map a cart row from CartContext into the slim shape the RPC accepts. Only
// listing_id + qty (+ concrete picks) are forwarded; the server recomputes
// every other field.
function toServerCart(items: ReturnType<typeof useCart>["items"]): CheckoutCartItem[] {
  return items.map((item) => {
    const concrete = item.configureConcreteSelection
    return {
      listing_id: Number(item.productId),
      qty: item.qty,
      concrete_class_code: concrete?.classCode,
      concrete_consistency: concrete?.consistency,
      // unit_price_cents only matters for concrete fallback inside the RPC.
      unit_price_cents:
        concrete?.unitPrice != null
          ? Math.round(concrete.unitPrice * 100)
          : undefined,
      configure_delivery: item.configureDelivery
        ? { ...item.configureDelivery }
        : undefined,
      configure_billing: item.configureBilling
        ? { ...item.configureBilling }
        : undefined,
      quote_summary: item.quoteSummary
        ? { ...item.quoteSummary }
        : undefined,
    }
  })
}

export function CheckoutClient({ userEmail }: CheckoutClientProps) {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()

  const [step, setStep] = useState<CheckoutStep>("idle")
  const [phases, setPhases] = useState<ProcessingPhase[]>(DEFAULT_PROCESSING_PHASES)
  const [order, setOrder] = useState<PlacedOrder | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [isCompany, setIsCompany] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: userEmail,
    phone: "",
    companyName: "",
    vatNumber: "",
    addressLine1: "",
    city: "",
    county: "",
    country: "Romania",
    notes: "",
  })

  const didPrefillFromCart = useRef(false)

  // Bounce to /cart only while in the form step. Once an order is placed we
  // intentionally stay on the page (cart is cleared but step !== "idle").
  useEffect(() => {
    if (step === "idle" && items.length === 0) {
      router.replace("/cart")
    }
  }, [items.length, router, step])

  // Prefill from the configurare-comandă metadata stored on cart lines.
  useEffect(() => {
    if (didPrefillFromCart.current || items.length === 0) return
    const d = items.find((i) => i.configureDelivery)?.configureDelivery
    if (!d) return
    didPrefillFromCart.current = true
    setForm((f) => ({
      ...f,
      addressLine1: d.addressLine1 || f.addressLine1,
      city: d.city || f.city,
      county: d.county || f.county,
      country: d.country || f.country,
      companyName: d.companyName ?? f.companyName,
      vatNumber: d.vatNumber ?? f.vatNumber,
    }))
    if (d.isCompany) setIsCompany(true)
  }, [items])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setPhase(id: string, status: ProcessingPhase["status"], hint?: string) {
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, hint } : p)),
    )
  }

  // Sleep utility — used only to keep the overlay phases readable. Total padding
  // stays small (~700ms) so a fast RPC response still feels snappy.
  const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!acceptTerms || items.length === 0 || step !== "idle") return

    setErrorMsg(null)
    setPhases(DEFAULT_PROCESSING_PHASES.map((p) => ({ ...p })))
    setStep("processing")

    setPhase("validate", "active")
    await tick(220)
    setPhase("validate", "done")
    setPhase("recompute", "active")

    const formInput: CheckoutFormInput = {
      ...form,
      isCompany,
    }
    const cartPayload = toServerCart(items)

    const result = await placeOrderAction(formInput, cartPayload)

    if (!result.success) {
      // Show the failed phase as the visible blocker so the user understands
      // which step blew up. Keep the overlay open for ~1.2s, then collapse.
      setPhase("recompute", "error", result.error)
      setErrorMsg(result.error)
      await tick(1200)
      setStep("idle")
      return
    }

    // RPC succeeded — fast-forward the remaining phases as visual cues.
    setPhase("recompute", "done")
    setPhase("persist", "active")
    await tick(180)
    setPhase("persist", "done")
    setPhase("deviz", "active")
    await tick(220)
    setPhase("deviz", "done")
    await tick(160)

    setOrder(result.order)
    clearCart()
    setStep("deviz")

    if (result.redirectTo) {
      router.push(result.redirectTo)
    }
  }

  function goToEmails() {
    setStep("emails")
  }

  function finishCheckout() {
    if (!order) return
    setStep("done")
    router.push(`/checkout/success?orderId=${order.id}`)
  }

  // Don't render the form if cart is empty AND we have no order yet — the
  // useEffect above will route to /cart.
  if (step === "idle" && items.length === 0) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Coș", href: "/cart" },
          { label: "Finalizare comandă" },
        ]}
      />

      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Finalizare comandă
      </h1>

      {/* Inline error banner — only when the RPC fails and we drop back to idle. */}
      {step === "idle" && errorMsg && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {step === "idle" && (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Date de contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nume complet</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                    <Switch
                      id="company"
                      checked={isCompany}
                      onCheckedChange={setIsCompany}
                    />
                    <Label htmlFor="company">Cumpăr ca firmă</Label>
                  </div>
                  {isCompany && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="companyName">Numele firmei</Label>
                        <Input
                          id="companyName"
                          value={form.companyName}
                          onChange={(e) => update("companyName", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vatNumber">CUI / CIF</Label>
                        <Input
                          id="vatNumber"
                          value={form.vatNumber}
                          onChange={(e) => update("vatNumber", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adresa de livrare</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Adresa</Label>
                    <Input
                      id="addressLine1"
                      value={form.addressLine1}
                      onChange={(e) => update("addressLine1", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="city">Oraș</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="county">Județ</Label>
                      <Input
                        id="county"
                        value={form.county}
                        onChange={(e) => update("county", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Țară</Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={(e) => update("country", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Observații</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Instrucțiuni speciale de livrare…"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Sumar comandă</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.name} × {item.qty}
                      </span>
                      <MoneyDisplay
                        amount={item.price * item.qty}
                        currency={item.currency}
                      />
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold">Total estimat</span>
                      <MoneyDisplay
                        amount={totalPrice}
                        currency="RON"
                        className="text-lg font-bold text-foreground"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Totalul final (cu TVA 19%) se calculează pe server după
                      validare.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={(v) => setAcceptTerms(v === true)}
                    />
                    <Label
                      htmlFor="terms"
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      Accept termenii și condițiile platformei ConstructionHub
                      Romania
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                    disabled={!acceptTerms}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Finalizează comanda
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Plata online cu cardul (Stripe) va fi activată ulterior; acum
                    comanda este înregistrată ca finalizată pentru testare.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* Deviz step */}
      {step === "deviz" && order && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  Deviz generat: {order.deviz_number}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comanda <span className="font-mono">{order.order_number}</span>{" "}
                  a fost salvată. Verifică datele și descarcă devizul în PDF.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <DevizPdfDownload order={order} />
                <Button
                  size="sm"
                  onClick={goToEmails}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Email confirmare
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DevizPreview order={order} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Emails step */}
      {step === "emails" && order && (
        <div className="space-y-4">
          <EmailsPreview order={order} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DevizPdfDownload order={order} variant="outline" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("deviz")}
            >
              <FileText className="mr-2 h-3.5 w-3.5" />
              Înapoi la deviz
            </Button>
            <Button
              size="sm"
              onClick={finishCheckout}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Finalizează
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Processing overlay sits on top of any step. */}
      <ProcessingOverlay open={step === "processing"} phases={phases} />
    </div>
  )
}
