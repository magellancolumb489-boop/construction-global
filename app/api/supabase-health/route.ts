import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Smoke test: verifies the Supabase connection is configured and reachable.
// GET /api/supabase-health
export async function GET() {
  const checks: Record<string, unknown> = {
    envUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    envKey:
      !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  try {
    const supabase = await createClient()

    // Auth health -- getClaims validates the JWT against the project's public keys
    const { data: claims, error: claimsError } = await supabase.auth.getClaims()
    checks.authReachable = true
    checks.hasSession = !!claims?.claims
    if (claimsError) checks.claimsError = claimsError.message

    // Quick query to confirm the REST API responds (no real table needed).
    // Any response -- including "table not found" -- proves the API is alive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: pingError } = await (supabase as any).from("_ping_nonexistent").select("id").limit(0)
    const tableNotFound = pingError?.message?.includes("schema cache") || pingError?.code === "42P01"
    checks.restApiReachable = !pingError || tableNotFound
    checks.restApiMessage = pingError?.message ?? "ok"
  } catch (err) {
    checks.authReachable = false
    checks.error = err instanceof Error ? err.message : String(err)
  }

  const healthy = checks.envUrl && checks.envKey && checks.authReachable && checks.restApiReachable

  return NextResponse.json(
    { healthy, checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
