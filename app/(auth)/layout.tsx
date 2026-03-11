import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Authenticated users have no business on login/register/forgot-password pages
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect("/account")

  return <>{children}</>
}
