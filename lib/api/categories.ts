import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type Category = Tables<"categories">

// Server-side: fetch all active categories sorted by sort_order
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("getCategories error:", error.message)
    return []
  }
  return data
}
