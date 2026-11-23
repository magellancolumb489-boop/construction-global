import { createClient } from "@/lib/supabase/server"

/** Current user's legal form (PF, SRL...), or null when unknown. */
export async function getCurrentSellerEntityType(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("entity_type").eq("id", user.id).maybeSingle()
  return (data?.entity_type as string | null | undefined) ?? null
}
