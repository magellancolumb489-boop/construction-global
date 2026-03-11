import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// Auth guard for all /sell/* routes -- only authenticated users can create/edit
export default async function SellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return <>{children}</>
}
