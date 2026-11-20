# ConstructionHub Romania — Phase 1 audit

Date: 2026-11-20. Scope: repo at `main` (b98798e) + client docs in `dinu-platforma/`. No live Supabase access; all DB claims are from `supabase/migrations/` and may differ from production.

Baseline: [docs/AGENT_HANDOFF.md](AGENT_HANDOFF.md) is the architecture map and schema inventory. This audit does not repeat it. It records what was verified, what the handoff got wrong, the client bug list, new findings, and the fix plan.

Checks run: `npx vitest run` → 2 files, 9 tests pass. `npx tsc --noEmit` → clean.

## 0. Read this first: the brief and the client docs disagree

The Phase-2 brief (pasted prompt) assumes an eBay-style product auction: bids, reserve, buy-now, anti-sniping, proxy bidding, buyer's premium, seller payout. **None of the client documents ask for that.** What they describe:

- "Licitații / oferte / rezervare cursă" = **transport dispatch**. Supplier has no transport → platform shows "TRANSPORT ORGANIZAT DE PLATFORMĂ / livrare 24h" → carriers get a notification → **first carrier to reserve within 15 minutes takes the trip** → otherwise a platform operator finds one manually (`raspuns-tabel.docx` §2.1, §9.5).
- Calculators: CIFA, POMPA, VRAC, DEPOZIT with explicit formulas (`calculationnn2.docx`). These match `calc-price.tsx` exactly.
- Money: client pays platform, platform redistributes to supplier + carrier. The team's own docs flag this as a payment-services / invoicing / e-Factura risk and say it must be decided before building (`dsaplatformat.docx`, `raspuns-tabel.docx` §6–7, §14).
- Also mentioned, unspecified: CUI verification, company levels, trust scoring, complaints, escrow, badges, auto-suspension.

Handoff pact S14 forbids recreating auction tables without a user decision. **Do not build the bidding engine from the brief until the client confirms which "licitație" they mean.** Building the wrong one is the most expensive mistake available right now.

## 1. Corrections to AGENT_HANDOFF.md

| Handoff claim | Actual (file:line) |
|---|---|
| §7 "client sends a key" for idempotency | Key is generated **server-side per call**: `app/checkout/actions.ts:186`. A retry is a new order. Idempotency is ineffective. |
| §13 step 2 "Stock decrement + row lock" | Row lock exists: `FOR UPDATE` at `20260514120000_materials_logistics.sql:465`. Inactive listings and `min_order_qty` are already rejected (`:470`, `:486`). Only the **decrement** is missing. |
| §7 order number collision | Confirmed, and worse: `order_number` / `deviz_number` are `UNIQUE` (`20260512120000_orders_phase2.sql:24-25`), so a collision **fails the checkout** with a constraint error, not a duplicate. |

## 2. Client bug list (`bugs-to-solve.docx`)

### B1 — Deleting a listing leaves images in Storage — MAJOR
- Repro: seller creates listing with images → deletes it from account or PDP → files remain under `listing-images/{uid}/{listingId}/`.
- Root cause: `deleteListingAction` (`app/sell/listing/actions.ts:226-255`) deletes the DB row only. Image rows go via FK cascade; Storage objects are never removed. Storage owner-delete policy exists (`20260422122000_storage_policies.sql:61`), so the fix is allowed under RLS.
- Related leak: `uploadListingImage` (`lib/api/listings-client.ts:81-97`) uploads first, then inserts the DB row. If the insert fails, the file is orphaned.
- Fix: before delete, read `storage_path`s, delete row, then `storage.remove(paths)` (non-blocking on failure, log it). Same rollback on failed image insert. Also decide: if the listing has orders, soft-delete (`is_active=false`) instead (Q8).

### B2 — Remove "cantitate" from marketplace product cards — MINOR
- Root cause: `components/shared/product-card.tsx:44` renders `availableQty` + unit. "In stoc" badge at `:28-31`.
- Fix: delete the quantity span. Keep or drop the "In stoc" badge (Q9).

`09-aprilie.docx` is a 0-byte file. If it held bugs, they are lost; please resend.

## 3. New findings (not in client list)

Severity: BLOCKER = wrong money / data loss / security hole before beta. MAJOR = broken flow or likely incident. MINOR = cosmetic or low-probability.

### Money and orders
- **N1 BLOCKER — Charged total ≠ shown total for concrete.** Calculator shows CIFA/POMPA quote; `place_order` charges `price × qty + flat transport_fee` (`materials_logistics.sql:527-528`). Known in handoff §7; listed here because it is the #1 trust problem with the client.
- **N2 BLOCKER — Concrete price fallback trusts client.** If `consistency_prices` lacks the class/consistency, client `unit_price_cents` is used (`materials_logistics.sql:511-517`). Any buyer can set their own concrete price via a crafted server-action call.
- **N3 BLOCKER — Idempotency broken.** See §1. Network timeout + retry, or a refresh during the processing overlay, can create two orders.
- **N4 MAJOR — Stock never decremented.** `available_qty` is checked, never reduced. Unlimited overselling.
- **N5 MAJOR — Duplicate cart lines bypass stock check.** Each line is checked against `available_qty` separately (`:489`). Two lines of the same listing at qty = stock each both pass. Cart merges duplicates client-side, but the RPC must not rely on that.
- **N6 MAJOR — Order-number race fails checkout.** `count(*)+1` (`:768`) + UNIQUE → concurrent checkouts on the same day: second one errors.
- **N7 MINOR — Order-number day boundary uses UTC.** `created_at >= (now() at time zone 'Europe/Bucharest')::date` casts the date back in the session TZ (UTC). Between 00:00 and 02:00/03:00 Romanian time, the count includes the previous local day's orders. Numbering starts above 1 and the race window grows.
- **N8 MAJOR — VAT hardcoded 19%.** Server `0.19` (`:730`), materials engine 0.19, calculator UI default 19. Romania's standard VAT rate changed to 21% from 1 Aug 2025. **Confirm the current rate with the client's accountant (Q5).** Must become one config value used by SQL and TS.
- **N9 MAJOR — `status='pending'` with `payment_status='demo_paid'`** (`:787`). Two status columns, no state machine, no transition RPC. Fulfillment (`markOrderFulfilled`) is fake.
- **N10 MAJOR — Order emails may never send on Vercel.** `void sendOrderEmails(...)` (`app/checkout/actions.ts:126`) runs after the action returns. Serverless can freeze the function first. Use `after()` from `next/server`.
- **N11 MINOR — Double-submit guard is React state only** (`app/checkout/checkout-client.tsx:140`). Two fast clicks before re-render can both submit. Fixed for free once N3 uses a client-held key.
- **N12 MINOR — Client money math is float.** `calc-price.tsx` and cart compute in JS floats; server is cents. Display rounding can differ from the charge by 1 ban.

### Calculator rules (from `ncesarr.docx`, confirmed against code)
- **N13 MAJOR (business) — POMPA excludes concrete cost.** `material_subtotal = 0`.
- **N14 MAJOR (business) — VRAC price cliff at 45 km.** 20 t truck, 10 t load: 45 km = 520 RON, 46 km = 207 RON. 320 RON minimum and underload fee both vanish above 45 km.
- **N15 MINOR (business) — CIFA handling added outside the 200 RON minimum.** `max(200, D×12) + Q×8`, not `max(200, D×12 + Q×8)`.
- **N16 — Open rule conflicts** the client never resolved: 150 vs 200 RON short-trip minimum; one-way vs round-trip vs "distanță comercială totală".
- **N17 MAJOR — Concrete listed in `TON` opens VRAC.** Calculator mode is chosen by unit only, not by listing kind or `transport_modes`.
- **N18 MAJOR — Seller "Livrare" settings unused.** `supplier_settings` saves; calculator uses hardcoded defaults.

### Security / RLS (handoff §11 S7–S10, verified present)
- **N19 MAJOR — Anyone can post a public review** without a purchase; `reviews.order_id` is bigint vs uuid orders.
- **N20 MAJOR — Message threads can name any user** as the counterparty (spam / harassment vector).
- **N21 MINOR — `login_events` client-insertable** (fake audit rows).
- **N22 MAJOR — Buyer email goes to the typed checkout field.** Can be used to send branded mail from the platform domain to any address.
- **N23 MINOR — `sendOrderEmailsAction` has no rate limit.** Buyer or seller can resend repeatedly.
- **N24 MINOR — Seller snapshot copies phone + tax ids into every order.** Readable by the buyer via RLS. Probably intended for the deviz; confirm.

### Looks done, is not
- Auctions pages (mock data), admin dashboard (stub reads with fake delay), payouts, saved cards, Stripe branch (would fail on `orders.update` under RLS), notifications (console only), seller dashboard revenue (hardcoded 0), push/SMS preferences.
- Transport dispatch, carrier role, 15-minute reservation, CUI verification, scoring, complaints, escrow: **no code at all**. These are the client's real "licitație" features.

### Infrastructure
- **N25 BLOCKER for any new environment — base schema not in repo.** `profiles`, `categories`, `marketplace_listings`, `marketplace_listing_images`, `handle_new_user` are only on the remote project. `supabase db reset` fails; `seed.sql` missing. Every migration I write is untestable locally until this is exported (needs your Supabase access or a `pg_dump --schema-only`).
- `docs/SECURITY.md` and `TESTING_CHECKLIST.md` stale (auctions, nothing checked).
- Only 9 unit tests; zero SQL/RPC/RLS tests.

## 3b. Live database findings (project `mfmhsicriufttcztljzv`, checked 2026-11-20)

Live data: 6 users, 10 listings, 2 image rows, 7 orders, **0 categories**, 6 storage objects.

- **Migration history reconciled.** Live history had 24 migrations under different versions than the repo, including 4 that never existed in the repo (`baseline_marketplace`, `security_advisor_fixes`, `performance_fixes`, `extend_public_profiles_company_fields`). `supabase/migrations/` is now a verbatim copy of live history. The old files are in `supabase/migrations_legacy/` (see its README). Every live function, policy and table name appears in the history, so no dashboard-only drift was found. N25 is resolved for the remote; a local `db reset` still needs Docker + CLI (neither is installed on this machine).
- **L1 BLOCKER — FIXED. Order data readable by anyone with an order id.** `_build_order_payload(uuid)` is SECURITY DEFINER with no caller check and was executable by `anon`. It returns buyer and seller snapshots (phone, tax ids, email, addresses). Order ids appear in URLs. Cause: `revoke ... from public` does not remove Supabase's direct grants to `anon` / `authenticated`. Fixed by migration `20261120161629_lock_definer_rpc_grants`, which also removes `anon` EXECUTE from `place_order`, both listing upserts and `get_my_profile`. Verified with a rolled-back transaction: direct call is refused, and `place_order` idempotent replay still returns the order.
- **L2 MAJOR — `public_profiles` is a SECURITY DEFINER view** (advisor ERROR). The baseline created it with `security_invoker = true`. `extend_public_profiles_company_fields` recreated it without the option, so it now bypasses RLS. Today it exposes `id, display_name, avatar_path, company_name, entity_type` for every profile, buyers included. Fix: restore `security_invoker`, add column grants for `company_name, entity_type`, and decide whether non-sellers should appear at all (Q15).
- **L3 MAJOR — B1 has a second cause: Storage has no SELECT policy.** `security_advisor_fixes` dropped the `listing-images` and `avatars` read policies so clients can't list buckets. Supabase Storage `remove()` needs SELECT + DELETE on the object, so image deletion likely fails silently even where the app calls it. Live evidence: listing 9 has 2 files in Storage and 0 image rows. Fix: an owner-scoped SELECT policy (folder = `auth.uid()`), which still prevents listing other users' files. Then delete the orphans.
- **L4 MAJOR — 0 categories in the DB.** Category filters and `category_id` have nothing to point at. Needs a seed list (Q16).
- **L5 MINOR —** 4 `materials_*` helper functions have a mutable `search_path`.
- **L6 MINOR —** Leaked-password protection is off (Auth setting, dashboard toggle).
- **L7 MINOR —** 15 RLS policies call `auth.uid()` per row (`auth_rls_initplan`). Wrap them in `(select auth.uid())` when the policies are next touched. 27 indexes are unused, which is expected at this data size; keep them.

## 3c. Progress log

2026-11-20, all applied to live and saved in `supabase/migrations/`:
- `20261120161629_lock_definer_rpc_grants`: L1 fixed.
- `20261120161902_storage_owner_select_and_helper_search_path`: L3 policy + L5 fixed. Owner can see and delete only `{uid}/…` objects; no bucket listing for others (verified).
- `20261120162110_place_order_v2_stock_price_numbering`: N2, N4, N5, N6, N7 fixed in SQL. Concrete price only from DB; stock decremented in the same transaction; duplicate listing lines rejected; same-key calls serialized by advisory lock and replayed; numbers from `order_number_counters` (Bucharest day, seeded from existing orders). Verified in a rolled-back transaction on live: replay returns the same order and decrements stock once, client price is ignored, oversell is rejected, duplicate lines are rejected, numbering is sequential, the counter table is hidden from clients. All live concrete classes have published prices, so the stricter rule blocks no current listing.

App code (not yet deployed):
- N3: `checkout-client.tsx` keeps one idempotency key per cart contents in `sessionStorage`; `placeOrderAction` accepts it (validated, else server-generated). Client no longer sends `unit_price_cents`.
- N10: order emails run inside `after()`.
- B1: `deleteListingAction` collects DB image paths and lists the `{uid}/{id}/` folder, deletes the row, then removes the files (failure logged, not fatal). `uploadListingImage` removes the file if the DB insert fails.

Still open from this batch:
- 2 orphan files from listing 9 remain in Storage; delete only after owner confirmation.
- N8 VAT (Q5), L2 view (Q15), L4 categories (Q16).
- **Q17.** `available_qty` is now consumed by orders for every listing type. For ready-mix concrete, it may mean production capacity rather than stock. Confirm, or exclude concrete/services from the decrement.
- Seller can still buy their own listing (no check in `place_order`). Minor; add when the order state machine is built.

## 4. Prioritized fix plan

Each step is one migration or one focused commit. Steps 1–6 need no client decision.

| # | Work | Fixes | Needs |
|---|---|---|---|
| 1 | ~~Export base schema~~ DONE: repo migrations = live history. ~~L1~~ DONE. Next: L2 view fix, L3 storage SELECT policy + orphan cleanup, L5 search_path | N25, L1–L5 | Q15 for L2 |
| 2 | SQL tests: run as rolled-back `DO` blocks against a Supabase **branch** (no Docker here); pgTAP once CLI + Docker are installed | enables all DB tests | — |
| 3 | `place_order` v2 migration: client-held idempotency key (generated once per checkout in the browser, passed through action), aggregate qty per listing, decrement `available_qty`, remove concrete client-price fallback, order numbers from a sequence, Bucharest day boundary, single VAT config value | N2–N8 (VAT value pending Q5) | step 1 |
| 4 | Tests: parallel checkout on last unit, replay same key, duplicate lines, missing concrete price | proves step 3 | step 2 |
| 5 | Listing delete: Storage cleanup + upload rollback; soft-delete when orders exist | B1 | Q8 |
| 6 | Remove card quantity | B2 | Q9 |
| 7 | Emails via `after()`; buyer recipient = auth email | N10, N22 | — |
| 8 | Reviews / threads / login_events RLS + RPCs | N19–N21 | — |
| 9 | Order state machine + `set_order_status` definer RPC (seller fulfil, admin cancel/refund) — payments-ready, Stripe still off | N9 | Q6 |
| 10 | **Concrete price contract**: make `place_order` price CIFA/POMPA from server-side tariffs (per-seller `supplier_settings` or platform defaults) with shared TS/SQL test vectors; or label calculator as estimate | N1, N13–N18 | Q1–Q4 |
| 11 | Admin reads (real queries), pagination, indexes | handoff O1–O3 | — |
| 12 | Rewrite SECURITY.md, TEST_CHECKLIST.md | docs | — |
| 13 | Dispatch / carrier reservation **or** product auctions | client's "licitații" | Q10–Q12 |
| 14 | Commission, payouts, escrow, real payments | money flow | Q13–Q14, legal |

## 5. Questions for the client (business rules)

Calculator
- **Q1.** POMPA: should the total include concrete (m³ × price), or is it pump service only?
- **Q2.** VRAC above 45 km: keep 320 RON minimum per trip? Keep 20 RON/t underload fee? Or confirm the cliff is intended.
- **Q3.** Distance: one-way, round-trip, or "distanță comercială totală"? Per calculator type? Short-trip minimum: 150 or 200 RON?
- **Q4.** Which tariffs are authoritative for the charge: platform defaults, or each seller's own rates? Does the buyer pay the calculator total, or listing price + flat transport?
- **Q5.** VAT rate to apply now (19% in code; current standard rate should be checked with the accountant). Any reduced-rate or non-VAT-payer sellers?

Orders
- **Q6.** Order lifecycle: who confirms, who marks delivered, can buyer cancel, until when?
- **Q7.** Concrete listings in TON: allowed, or force M3?
- **Q8.** A listing with past orders is deleted: hide it (keep history + images), or delete fully?
- **Q9.** Marketplace card: remove only the quantity, or the "In stoc" badge too?

"Licitații"
- **Q10.** Is "licitație" (a) carrier reservation of a delivery trip (first to accept in 15 min), (b) a classic auction on goods, or (c) a reverse tender where suppliers bid on a buyer's request? Home/nav currently show (b) as mock.
- **Q11.** If (a): who are carriers (separate accounts / role?), how are they notified (email, SMS, WhatsApp, push), what happens at minute 15 with no taker, can a carrier cancel after accepting?
- **Q12.** If (b) or (c): reserve, buy-now, anti-sniping, proxy bids, increments, who pays fees.

Money (blocking for real payments)
- **Q13.** Platform legal role: intermediary, commission agent, reseller, or listing-only? Who invoices material, transport, pump?
- **Q14.** Payment model: direct to supplier, split via a processor (e.g. Stripe Connect), or platform collects and redistributes? The team's own legal notes say the last option may need payment-services authorization.

Live DB
- **Q15.** Public seller profile: should buyers (non-sellers) be visible at all through `public_profiles`? Should `company_name` / `entity_type` be public?
- **Q16.** Category list for the marketplace (names + hierarchy). The DB has none.

## 6. What I need from you

1. Answers to Q1–Q14 (or the ones you can answer now; I proceed on steps 1–9 without them).
2. ~~Supabase access~~ Received 2026-11-20 (MCP connected). Optional: install Docker + Supabase CLI for local pgTAP tests.
3. `09-aprilie.docx` content (file is empty).
