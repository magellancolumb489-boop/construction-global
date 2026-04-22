/** @type {import('next').NextConfig} */

// Resolve the Supabase origin so the CSP can whitelist the project's host.
// Falls back to wildcard subdomain if the env var is missing at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
let supabaseOrigin = "https://*.supabase.co"
try {
  if (supabaseUrl) {
    const parsed = new URL(supabaseUrl)
    supabaseOrigin = `${parsed.protocol}//${parsed.host}`
  }
} catch {
  // keep the wildcard fallback if NEXT_PUBLIC_SUPABASE_URL is malformed
}

// Build a Content-Security-Policy string from our allowlists. Next.js needs
// `unsafe-inline` + `unsafe-eval` for script during dev/turbopack; use the
// stricter policy only in production builds.
const isProd = process.env.NODE_ENV === "production"

const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": isProd
    ? ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://va.vercel-scripts.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://*.tile.openstreetmap.org",
    supabaseOrigin,
  ],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    supabaseOrigin,
    "wss://*.supabase.co",
    "https://nominatim.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    // Server-side routing proxy lives at /api/route (same-origin). The OSRM
    // host is whitelisted here as well so a future direct-from-browser call
    // is possible without a CSP change.
    "https://router.project-osrm.org",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
  ],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "frame-src": ["'self'"],
}

const csp = Object.entries(cspDirectives)
  .map(([k, v]) => `${k} ${v.join(" ")}`)
  .join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    // deny sensitive sensors; payment stays disabled until Stripe lands in Phase 2
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
]

const nextConfig = {
  // Build-time TypeScript errors are surfaced again so we do not ship type
  // regressions unnoticed. Fix real errors instead of silencing them.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
