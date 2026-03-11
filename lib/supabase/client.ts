import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Resolve Supabase key: prefer publishable key, fallback to anon key (common in Supabase dashboard)
function getSupabaseKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing Supabase key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
    )
  }
  return key
}

// Browser-side Supabase client for use in Client Components
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it in Vercel Settings > Environment Variables."
    )
  }
  return createBrowserClient<Database>(supabaseUrl, getSupabaseKey())
}
