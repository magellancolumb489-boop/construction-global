"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useCart } from "@/lib/cart-context";
import { createCheckout } from "@/lib/api/orders";
import { CreditCard } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    vatNumber: "",
    addressLine1: "",
    city: "",
    county: "",
    country: "Romania",
    notes: "",
  });

  const didPrefillFromCart = useRef(false);

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  // Prefill livrare / firmă from configurare comandă (metadata pe linia din coș)
  useEffect(() => {
    if (didPrefillFromCart.current || items.length === 0) return;
    const d = items.find((i) => i.configureDelivery)?.configureDelivery;
    if (!d) return;
    didPrefillFromCart.current = true;
    setForm((f) => ({
      ...f,
      addressLine1: d.addressLine1 || f.addressLine1,
      city: d.city || f.city,
      county: d.county || f.county,
      country: d.country || f.country,
      companyName: d.companyName ?? f.companyName,
      vatNumber: d.vatNumber ?? f.vatNumber,
    }));
    if (d.isCompany) setIsCompany(true);
  }, [items]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms || items.length === 0) return;

    setLoading(true);
    try {
      const result = await createCheckout({ ...form, isCompany });

      if (result.success) {
        clearCart();
        router.push("/checkout/success");
      } else {
        router.push("/checkout/cancelled");
      }
    } catch {
      router.push("/checkout/cancelled");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Cos", href: "/cart" },
          { label: "Finalizare comanda" },
        ]}
      />

      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Finalizare comanda
      </h1>

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
                  <Label htmlFor="company">Cumpar ca firma</Label>
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
                    <Label htmlFor="city">Oras</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="county">Judet</Label>
                    <Input
                      id="county"
                      value={form.county}
                      onChange={(e) => update("county", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Tara</Label>
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
                <CardTitle>Observatii</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Instructiuni speciale de livrare..."
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
                <CardTitle>Sumar comanda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.name} x{item.qty}
                    </span>
                    <MoneyDisplay
                      amount={item.price * item.qty}
                      currency={item.currency}
                    />
                  </div>
                ))}

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <MoneyDisplay
                      amount={totalPrice}
                      currency="RON"
                      className="text-lg font-bold text-foreground"
                    />
                  </div>
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
                    Accept termenii si conditiile platformei ConstructionHub
                    Romania
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  disabled={loading || !acceptTerms}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {loading ? "Se proceseaza..." : "Plateste"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
