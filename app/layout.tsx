import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/lib/cart-context"
import { Toaster } from "@/components/ui/toaster"
import { SiteHeader } from "@/components/layout/header"
import { SiteFooter } from "@/components/layout/footer"
import { createClient } from "@/lib/supabase/server"
import { getMyWishlistCount } from "@/lib/api/notification-prefs"
import "./globals.css"

const _inter = Inter({ subsets: ["latin", "latin-ext"] })

export const metadata: Metadata = {
  title: "ConstructionHub Romania - Licitatii & Materiale de Constructii",
  description:
    "Platforma de licitatii si materiale de constructii din Romania. Echipamente, utilaje, beton, pietris, otel si multe altele.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Resilient auth: if Supabase fails (missing env, network, etc.), app still loads with null user
  let initialUser: { email: string; displayName: string } | null = null
  let isAdmin = false
  let wishlistCount = 0
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      initialUser = {
        email: user.email ?? "",
        displayName: user.user_metadata?.display_name ?? "",
      }
      // Role lookup is a tiny query; a miss keeps isAdmin false and hides the admin link in the header
      // Role is not in anon-safe column grants; same RPC as account profile load.
      const { data: profileRows } = await supabase.rpc("get_my_profile")
      const profile = Array.isArray(profileRows) ? profileRows[0] : null
      isAdmin = profile?.role === "admin"
      // Wishlist badge count for the header. Cheap head:true query.
      try {
        wishlistCount = await getMyWishlistCount()
      } catch (err) {
        console.error("[RootLayout] wishlist count failed:", err instanceof Error ? err.message : err)
      }
    }
  } catch (err) {
    // Log for Vercel Function logs; app continues without auth
    console.error("[RootLayout] Supabase auth failed:", err instanceof Error ? err.message : err)
  }

  return (
    <html lang="ro">
      <body className="font-sans antialiased">
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader initialUser={initialUser} isAdmin={isAdmin} wishlistCount={wishlistCount} />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
