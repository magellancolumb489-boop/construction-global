import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
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

// Server-side Supabase client for Server Components, Server Actions, and Route Handlers
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it in Vercel Settings > Environment Variables."
    )
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    getSupabaseKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component is expected to fail;
            // the proxy handles cookie writes instead.
          }
        },
      },
    }
  )
}
