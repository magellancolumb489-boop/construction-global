"use client"

import { useState } from "react"
import Link from "next/link"
import { HardHat, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { register } from "@/lib/api/auth"

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompany, setIsCompany] = useState(false)

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    vatNumber: "",
    companyAddress: "",
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const [registered, setRegistered] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await register({ ...form, isCompany })
      if (result.success) {
        setRegistered(true)
      } else {
        setError(result.error ?? "Eroare la inregistrare.")
      }
    } catch {
      setError("A aparut o eroare. Incercati din nou.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Inregistrare</CardTitle>
          <CardDescription>
            Creaza un cont nou pe ConstructionHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h3 className="text-lg font-semibold text-foreground">
                Cont creat cu succes!
              </h3>
              <p className="text-sm text-muted-foreground">
                Verifica-ti casuta de email la adresa{" "}
                <strong>{form.email}</strong> pentru a confirma contul.
              </p>
              <Button variant="outline" asChild className="mt-2">
                <Link href="/login">Inapoi la autentificare</Link>
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Nume complet</Label>
              <Input
                id="displayName"
                placeholder="Ion Popescu"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplu.ro"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Parola</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minim 8 caractere"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40 7XX XXX XXX"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Company toggle */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              <Switch
                id="company-toggle"
                checked={isCompany}
                onCheckedChange={setIsCompany}
              />
              <Label htmlFor="company-toggle" className="text-sm font-medium">
                Cumpar ca firma
              </Label>
            </div>

            {isCompany && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div>
                  <Label htmlFor="companyName">Numele firmei</Label>
                  <Input
                    id="companyName"
                    placeholder="SC Exemplu SRL"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vatNumber">CUI / CIF</Label>
                  <Input
                    id="vatNumber"
                    placeholder="RO12345678"
                    value={form.vatNumber}
                    onChange={(e) => update("vatNumber", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Adresa firmei</Label>
                  <Input
                    id="companyAddress"
                    placeholder="Str. Exemplu 12, Bucuresti"
                    value={form.companyAddress}
                    onChange={(e) => update("companyAddress", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Se inregistreaza..." : "Creaza cont"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Ai deja cont?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground hover:underline"
              >
                Autentificare
              </Link>
            </p>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
