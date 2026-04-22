# Security baseline — Phase 1

This document captures the security posture applied by migrations
`20260422120000_security_rls_baseline.sql`, `20260422121000_place_bid_rpc.sql`,
and `20260422122000_storage_policies.sql`, plus the application-layer
hardening that landed alongside them.

It is meant to be short: a checklist you run in **Debug mode** to confirm the
guardrails are active after any deploy that touches DB, auth, storage, or
admin code.

## Trust boundaries in one picture

```
Browser (anon | authenticated JWT)
  │
  ├─ PostgREST  ───────────►  Postgres (RLS + column grants + CHECKs + triggers)
  │                                │
  ├─ Supabase Storage ──────►  storage.objects (bucket + folder-prefix policies)
  │
Next.js server
  ├─ RSC / Route Handlers ──►  same cookie-backed Supabase client (RLS applies)
  └─ Server Actions ────────►  Zod validated, field-allowlisted, auth.uid() forced
```

No service-role key is used anywhere in application code.

## What the database now enforces

- **RLS on every public table** (`profiles`, `categories`, `marketplace_listings`,
  `marketplace_listing_images`, `auction_lots`, `auction_images`, `auction_bids`).
- **profiles**
  - Users read their own row. Public reads only get `(id, display_name, avatar_path)`
    via the `public_profiles` view (column grants strip `phone`/`role`).
  - `role` is rewrite-blocked by the `profiles_block_role_update` trigger;
    only the `set_user_role(uuid, text)` SECURITY DEFINER RPC can change it,
    and only when `is_admin()` is true.
- **marketplace_listings**
  - Anonymous users only see `is_active = true`.
  - `seller_id` is immutable (trigger) and forced to `auth.uid()` on insert.
- **auction_lots**
  - Sellers can create/edit/delete only while `status in ('draft','scheduled')`
    and `bid_count = 0`.
  - Column grants revoke UPDATE on `current_price`, `current_winner_id`,
    `bid_count`, `status` from `authenticated`. Only `place_bid` and
    `close_auction` (SECURITY DEFINER) may touch them.
- **auction_bids**
  - Direct INSERT/UPDATE/DELETE revoked from `authenticated`. `place_bid` is
    the only write path. SELECT is limited to the bidder, lot seller, or admin.
- **Storage**
  - Buckets `listing-images` and `auction-images` are public-read.
  - Writes require `(storage.foldername(name))[1] = auth.uid()::text`, so a
    user cannot upload to another user's folder.

## What the application now enforces

- `app/admin/layout.tsx` is a server component that checks
  `profiles.role = 'admin'` and returns `notFound()` otherwise. The "Panou
  Admin" dropdown entry is rendered only when `RootLayout` has confirmed
  `isAdmin` server-side.
- All privileged mutations funnel through server actions:
  - `app/sell/listing/actions.ts` — `createListingAction`, `updateListingAction`, `deleteListingAction`
  - `app/sell/auction/actions.ts` — `createAuctionAction`, `updateAuctionAction`, `deleteAuctionAction`
  - `app/account/actions.ts` — `updateMyProfileAction`
  - `app/admin/actions.ts` — `changeUserRoleAction`, `closeAuctionAction`
- Each action Zod-validates input via `lib/validation/*`, enforces a strict
  column allowlist, and injects `seller_id` (or the target key) from
  `auth.uid()` server-side; the client-supplied value is discarded.
- `/api/supabase-health` is unreachable in production without
  `SUPABASE_HEALTH_SECRET` (returns 404 to hide its existence).
- `/api/geocode` requires a logged-in user and is rate-limited to 60 req/min
  per user (rolling window, per serverless instance).
- `next.config.mjs` ships CSP, HSTS, Referrer-Policy, Permissions-Policy,
  X-Content-Type-Options, and X-Frame-Options. `typescript.ignoreBuildErrors`
  is now `false`.

## Debug-mode verification checklist

Run these after each deploy. "Expect" is what you should see; anything else is
a regression.

### 1. profiles — role escalation is blocked

Logged in as a normal user, from the browser devtools console:

```js
const { createClient } = await import("/_next/static/chunks/webpack.js") // fallback: use the Supabase client you already have
// Or in the app: in the Network tab, find any Supabase request, copy the URL + key.
const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${MY_UID}`, {
  method: "PATCH",
  headers: {
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  body: JSON.stringify({ role: "admin" }),
})
console.log(r.status, await r.text())
```

- **Expect:** 401/403 or a Postgres error `role changes are admin-only (42501)`.

### 2. marketplace_listings — cross-owner update is blocked

```js
// Replace <other-listing-id> with a listing whose seller_id is NOT you.
const r = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings?id=eq.<other-listing-id>`, {
  method: "PATCH",
  headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ price: 1 }),
})
console.log(r.status)
```

- **Expect:** 204 with empty body (RLS matched 0 rows) — the row was untouched.
  Confirm with a GET that the price did not change.

### 3. place_bid — self-bid is rejected

Logged in as the seller of a lot, from the browser devtools:

```js
const r = await supabase.rpc("place_bid", { p_lot_id: MY_LOT_ID, p_amount: 99999 })
console.log(r.data, r.error)
```

- **Expect:** `{ ok: false, error: "seller_cannot_bid" }`.

### 4. place_bid — below minimum is rejected

Logged in as a buyer, pass `current_price` (not `current_price + bid_increment`):

- **Expect:** `{ ok: false, error: "below_min_bid", min_next: <n>, current_price: <p>, bid_increment: <i> }`.

### 5. Storage — upload to another user's folder is blocked

```js
const file = new Blob(["x"], { type: "image/png" })
const { error } = await supabase.storage
  .from("listing-images")
  .upload(`<other-user-uuid>/hax.png`, file)
console.log(error)
```

- **Expect:** error `new row violates row-level security policy`.

### 6. /admin routes are 404 to non-admins

Open `/admin`, `/admin/users`, `/admin/auctions` logged in as a regular user.

- **Expect:** Next.js 404 page (not the admin shell).

### 7. /api/supabase-health is hidden in production

```bash
curl -i https://<prod-domain>/api/supabase-health
# then with the secret header
curl -i -H "x-health-secret: $SUPABASE_HEALTH_SECRET" https://<prod-domain>/api/supabase-health
```

- **Expect:** 404 without the header, 200 JSON with it.

### 8. /api/geocode requires auth and rate-limits

```bash
curl -i https://<domain>/api/geocode?q=Bucuresti   # no cookie
```

- **Expect:** 401 when unauthenticated.
- After 60 quick authenticated hits, the 61st returns 429 within 60s.

### 9. Response headers include the new security set

```bash
curl -sI https://<prod-domain>/ | grep -Ei 'content-security-policy|strict-transport-security|x-frame-options|referrer-policy|permissions-policy|x-content-type-options'
```

- **Expect:** all six headers present.

## Environment variables

| Name | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | all | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | all | Anon/publishable key |
| `SUPABASE_HEALTH_SECRET` | production | Required to hit `/api/supabase-health` in prod |

There is **no** `SUPABASE_SERVICE_ROLE_KEY` in use. Do not add one unless a
feature explicitly needs to bypass RLS — if so, it belongs in a server-only
route and must never reach the client bundle.
