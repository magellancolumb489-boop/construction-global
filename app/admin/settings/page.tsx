import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "./settings-form"

export const dynamic = "force-dynamic"

// Admin layout already gates on is_admin; RLS gates the writes.
export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const [{ data: settings }, { data: plans }] = await Promise.all([
    supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("subscription_plans").select("*").order("sort_order"),
  ])
  if (!settings) return <p className="p-6 text-sm text-destructive">Setările platformei lipsesc.</p>
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Setări platformă</h1>
        <p className="text-sm text-muted-foreground">
          Comision, TVA, plăți, taxe de publicare, abonamente și datele firmei care apar pe proforma intermediarului.
          Modificările se aplică comenzilor noi; comenzile existente își păstrează valorile.
        </p>
      </div>
      <SettingsForm settings={settings} plans={plans ?? []} />
    </div>
  )
}
