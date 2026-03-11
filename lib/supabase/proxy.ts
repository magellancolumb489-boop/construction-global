import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

// Resolve Supabase key: prefer publishable key, fallback to anon key
function getSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Refreshes the Supabase auth session on every matched request
// and forwards updated cookies to both the browser and downstream Server Components.
// If env vars are missing, passes through without auth refresh so the app still loads.
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = getSupabaseKey()
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Push refreshed tokens into the request so Server Components see them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          // Push refreshed tokens into the response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    // Validate / refresh the JWT -- this triggers setAll when tokens are refreshed
    await supabase.auth.getClaims()
  } catch {
    // Auth refresh failed; pass through so the app still loads
  }

  return supabaseResponse
}
