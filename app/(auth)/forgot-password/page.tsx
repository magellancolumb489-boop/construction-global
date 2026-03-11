"use client"

import { useState } from "react"
import Link from "next/link"
import { HardHat, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "@/lib/api/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await forgotPassword(email)
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Recuperare parola</CardTitle>
          <CardDescription>
            Vei primi un email cu instructiuni de resetare
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h3 className="text-lg font-semibold text-foreground">
                Email trimis!
              </h3>
              <p className="text-sm text-muted-foreground">
                Verifica-ti casuta de email la adresa{" "}
                <strong>{email}</strong> pentru instructiuni de resetare.
              </p>
              <Button variant="outline" asChild className="mt-2">
                <Link href="/login">Inapoi la autentificare</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplu.ro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Se trimite..." : "Trimite instructiuni"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-foreground hover:underline"
                >
                  Inapoi la autentificare
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
