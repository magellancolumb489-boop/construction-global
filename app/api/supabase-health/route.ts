import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Smoke test: verifies the Supabase connection is configured and reachable.
// GET /api/supabase-health
//
// Gated in production behind SUPABASE_HEALTH_SECRET to avoid leaking internal
// diagnostics. In dev/preview the endpoint is open for convenience.
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production"
  const secret = process.env.SUPABASE_HEALTH_SECRET

  if (isProd) {
    // Accept the secret from an explicit header or ?token=... query param
    const provided =
      req.headers.get("x-health-secret") ??
      req.nextUrl.searchParams.get("token")

    if (!secret || !provided || provided !== secret) {
      // 404 rather than 401 -- do not confirm the route exists to anons
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const checks: Record<string, unknown> = {
    envUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    envKey:
      !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  try {
    const supabase = await createClient()

    const { data: claims } = await supabase.auth.getClaims()
    checks.authReachable = true
    checks.hasSession = !!claims?.claims

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: pingError } = await (supabase as any).from("_ping_nonexistent").select("id").limit(0)
    const tableNotFound = pingError?.message?.includes("schema cache") || pingError?.code === "42P01"
    checks.restApiReachable = !pingError || tableNotFound
  } catch (err) {
    // Do not leak raw exception text to the client; just log on the server.
    console.error("[supabase-health] check failed:", err instanceof Error ? err.message : err)
    checks.authReachable = false
  }

  const healthy =
    checks.envUrl &&
    checks.envKey &&
    checks.authReachable &&
    checks.restApiReachable

  return NextResponse.json(
    { healthy, checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
