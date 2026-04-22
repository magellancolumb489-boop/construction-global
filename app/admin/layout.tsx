import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminNav } from "./admin-nav"

// Hard admin gate. Any non-admin (including anonymous) gets a 404 to avoid
// leaking the existence of /admin. The layout is a server component so the
// check happens before any child UI renders.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (error || profile?.role !== "admin") notFound()

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminNav />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
