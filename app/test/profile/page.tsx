import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/api/profile"
import ProfileTestForm from "./profile-test-form"

// Server component -- auth guard + fetch profile from public.profiles
export default async function ProfileTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getProfile()

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Profile Test</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Authenticated as <code>{user.email}</code>. Showing data from{" "}
        <code>public.profiles</code> (RLS: select/update own row).
      </p>

      {/* Raw profile dump for debugging */}
      <div className="mb-8 rounded-lg border bg-muted/30 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Raw Profile Row
        </h2>
        <pre className="overflow-x-auto text-xs">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>

      {/* Editable form to test RLS update */}
      {profile ? (
        <ProfileTestForm profile={profile} />
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-destructive">
          No profile row found for this user. The <code>handle_new_user</code>{" "}
          trigger may not have fired.
        </p>
      )}
    </div>
  )
}
