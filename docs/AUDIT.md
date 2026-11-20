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

## 3d. Materials calculator, transport and filters (2026-11-20, second pass)

Sources: `1.docx` (taxonomy + vehicle list), `06-aprilie.docx` (12 RON/km one way, 200 RON under 15 km, "no 2 t of sand in a van", open questions), `calculationnn2.docx` (CIFA/POMPA/VRAC/DEPOZIT; unchanged here).

### Blind spots found
| # | Problem | Effect |
|---|---|---|
| M1 | Mass came from the unit only: every M3 weighed 1600 kg/m3, every BUC/ML 25 kg | Mineral wool (~20 kg/m3) was planned like sand. 1000 bricks counted as 25 t. Trip counts and vehicle choice were wrong. |
| M2 | Van (duba) payload options 2 t and 3.5 t | These are gross-weight figures, so the plans were illegal loads. This is the client's own example. |
| M3 | Loose cement, filer and bitumen were planned on vans and trucks | They need a tanker or silo truck, which is not on the vehicle list. Hot bitumen in a van. |
| M4 | Server checked vehicle rules only when the platform assigned the vehicle | Sellers could offer any vehicle for any material (e.g. a van for 12 m steel bars) and checkout accepted it. |
| M5 | Long material with no piece length skipped the length filter | 12 m bars could be planned in a van. |
| M6 | The buyer's pallet count replaced the quantity-based mass on the server | Typing "1 pallet" for 40 t of bags cut the required trips to 1 (trust bug). |
| M7 | "Transport organizat de platformă" (`seller_assumes_transport = false`) was never read | The seller's flat fee (or 0) was charged as if the seller delivered. The checkbox did nothing. |
| M8 | Transport price = flat fee × trips, the same for every vehicle and distance | Not fixable without client tariffs; see Q18. |
| M9 | Any unit was allowed for any material | Live listing 7 is crushed stone at 20 RON/KG. |
| M10 | Wizard offered units CUP and CAMION; the DB CHECK rejected them | Seller got a raw DB error. |
| M11 | Crane add-on allowed on tipped aggregates | Live listing 7 has it. |
| M12 | Seller kg per piece/bag not collected for BUC/ML | Mass for bricks, BCA, plasterboard and steel was a guess. |
| M13 | Configurator: React hooks after a conditional `return null`; quantity ignored `min_order_qty` | A runtime hook-order error was possible; checkout rejected quantities with no warning. |
| M14 | Marketplace loaded the first 20 listings and filtered/sorted them in the browser; the only filter was "Categorie", and the table has 0 rows | Buyers could not filter at all. Listing 21+ could never be found. |
| M15 | Seller listings tab had no filters and no stock view | Now that orders consume stock, sellers could not see listings that had sold out. |
| M16 | Client bug list B2: stock quantity on marketplace cards | Removed. |

### What changed
- `lib/materials-logistics/catalog.ts`:
  - `MATERIAL_PROFILES` for all 48 materials: allowed units, density, default kg per bag.
  - Rule helpers: `requiresTanker`, `macaraAllowedFor`, `requiresKgPerUnit`.
  - New vehicle `CAMION_PLATFORMA`; van capped at 1.5 t; platform trucks added to the length bands.
- `lib/materials-logistics/engine.ts`:
  - Mass and volume estimates use the material, and a pallet count can only raise them.
  - Long materials with unknown length go only on TIR or trailer.
  - Tanker materials return `manualReason: "tanker"`.
  - `estimatePlatformTransport` (shown as an estimate only).
- `lib/validation/listing.schema.ts` `materialListingIssue()`: unit must suit the material; long materials need a piece length; BUC/ML need kg per unit; no crane on bulk or tanker loads; every offered vehicle must be legal for the material. It runs in the wizard and again in `upsertMaterialLogisticsAction`, using the unit stored in the DB.
- Wizard: unit list follows the material, a kg-per-unit field, the crane option hidden where it can't apply, and a tanker warning.
- Migration `20261120163833_materials_logistics_v2_rules_and_place_order_v3`, applied on live:
  - Unit CHECK now includes CUP and CAMION; vehicle CHECK includes CAMION_PLATFORMA; new payload table.
  - SQL twins `materials_density_kg_m3`, `materials_default_kg_per_unit`, `materials_estimate_mass_kg_v2`, `materials_requires_tanker`, `materials_offer_allowed`. The CASE tables are generated from the TS profiles.
  - `place_order` v3 applies the material rules to seller offers too and uses the material-aware mass.
  - Tanker lines are recorded with `transport_status = 'manual_quote'` and 0 transport.
  - Lines with `seller_assumes_transport = false` are recorded with `transport_status = 'platform_quote'` and 0 transport; only the seller's crane fee is still charged.
- SQL/TS parity verified on live (rolled back). Mass for bags/pallets, mineral wool and balast, tanker flags, length bands and the 2 t van cap give identical results. On listing 10, transport is the seller fee × trips, a 1-trip plan for 30 t is rejected, and platform transport is 0 with status `platform_quote`.
- Configurator / PDP / cart:
  - The seller fee is charged only when the seller delivers. Platform and tanker transport show a clear "not included, operator confirms" note with the 06-aprilie minimum as orientation.
  - Minimum order quantity is enforced, and the hook-order error is fixed.
- Deviz, emails and order detail append the transport note from `transport_status`.
- Marketplace: filters run on the server from the URL across all listings:
  - Tip anunț, categorie material, material, transport (vânzător / platformă), localitate, preț min/max, search (LIKE wildcards escaped), sort, 24 per page.
  - Unknown URL values are dropped.
  - Verified against live: all 10 listings, materials 4, concrete 6, crushed stone 2, criblura 4–8 1.
- Seller listings tab: search, type, status, "fără stoc" filter; shows stock and transport mode.

### Still open (need the client)
- **Q18.** Transport tariff when the platform organises it: is 12 RON/km universal, or per vehicle / time of day? Is the 200 RON minimum net or gross? Is 7 m3 the legal load for a mixer? Until answered, platform transport is quoted by the operator and never charged at checkout.
- **Q19.** Distance: materials listings have no pickup coordinates (0 of 4 live). Automatic distance pricing needs a pickup address in the materials wizard (the concrete wizard already has one) plus a server-side distance check.
- **Q20.** Cisterna / siloz and standalone macara and autobetonieră/pompă for materials: add them to the vehicle list, or keep tanker loads as manual offers?
- **Q21.** Payload tables for AUTOUTILITARA (3.5 t) and the defaults in `MATERIAL_PROFILES` (bag weights, densities) are orientation values. Please confirm.
- **Data cleanup (seller action):** listing 7 is titled "ciment saci" but its spec says criblura 8–16, sold by KG with a crane. Listings 5 and 6 have no materials spec. The new rules stop this on the next edit; existing rows are untouched.
- `types/supabase.ts` is not regenerated (hand-patched block); new SQL helpers are not called from the app.

## 3e. Middleman money, transport, payments, proformas (2026-11-20, third pass)

### Applied on live (all verified in rolled-back transactions)
| Migration | What |
|---|---|
| `20261120170150_platform_fees_transport_payments_subscriptions` | `platform_settings` (commission, VAT, payments mode, fees, TTLs, platform identity); listing soft delete + partial unique slug + browse indexes; order commission / VAT split / proforma fields; `order_transport` + `order_transport_events` state machine; `payment_intents` + provider-agnostic payment RPCs; subscriptions + publication gate; maintenance RPC |
| `20261120170340_place_order_v4_commission_vat_split_transport` | `place_order` reads settings: commission, VAT per issuer, live vs demo payment status, transport record, `COM-` platform document number |
| `20261120170503_listings_select_owner_sees_soft_deleted` | Fix found by the test: Postgres checks the updated row against SELECT policies, so owners could not soft-delete |
| `20261120170849_profiles_bank_details_order_party_snapshots` | `profiles.iban` / `bank_name` (not in public column grants); orders freeze seller IBAN and platform identity at order time |

End-to-end results on live, rolled back:
- **Commission:** 10% on 2,250 RON goods = 225 RON. VAT: seller 617.50, platform 42.75. Total 4,135.25 RON.
- **Seller-delivered transport:** schedule, then delivery confirmed by the buyer; the order becomes `fulfilled`.
- **Platform transport:**
  - The operator quotes, the buyer accepts and pays 1,428 RON (1,200 + 19% VAT).
  - The operator assigns a carrier, the load ships and is delivered; 7 audit events.
  - A buyer cannot quote.
- **Cancel while awaiting a quote:** stock comes back.
- **Live payments:**
  - The order stays `pending`, then an intent goes to the provider.
  - A wrong webhook secret is rejected and a wrong amount gives `amount_mismatch`.
  - A good event marks the order paid; a replay returns `duplicate`.
- **Soft delete:**
  - Deleted listings are inactive and owners cannot undelete.
  - The slug can be reused.
  - Sellers cannot write `publish_paid_until`.
- **Listing fee gate:** blocks publishing until the fee is paid, then allows it.

### Model (what the client asked for, and how it is enforced)
- **Commission as a buyer markup.** Buyers see the seller price × (1 + rate): a 10,000 RON listing shows as 11,000 RON (+ VAT). The markup is applied once, in the server mappers (`lib/api/listings.ts`). `place_order` charges `round(goods_cents × rate)`; `lib/pricing/commission.ts` mirrors it and is tested to the cent. Sellers see and receive their own price.
- **Transport state machine** (`transport_transition`, every step logged):
  - Seller delivers: `included → scheduled → in_transit → delivered`.
  - Platform or tanker transport: `awaiting_quote → quoted (TTL) → accepted | declined → (re-quote, max 3) → assigned (live: only after transport is paid) → in_transit → delivered`.
  - Any step can go to `failed` (with a reason). The order can be cancelled before shipping; cancelling restores stock, cancels open payment intents and flags `refund_pending` if money was taken.
  - Expired quotes can never be accepted (expiry is checked on every action and by maintenance).
- **Payments** (`lib/payments/*`, `app/payments/actions.ts`, `/api/payments/webhook/[provider]`):
  - One entry point for order, transport, subscription and listing fee. The DB computes the amount.
  - The provider adapter only creates the checkout and parses the webhook.
  - The webhook is verified by the provider adapter, then applied via `record_payment_event`, which is idempotent and checks amount and currency.
  - No service-role key: the webhook RPC is gated by a shared secret whose SHA-256 sits in `private.app_secrets`.
  - Demo mode keeps working without any provider. The old Stripe stub and the `NEXT_PUBLIC_PAYMENTS_MODE` flag are removed; that flag was also the broken `orders.update` path.
- **To go live** (no code change except the adapter):
  1. Pick the provider and implement `lib/payments/providers/<id>.ts` (two functions, see `pending.ts`).
  2. Register it in `registry.ts`.
  3. Set `PAYMENTS_PROVIDER`, `APP_BASE_URL` and `PAYMENTS_WEBHOOK_DB_SECRET`.
  4. Run `select private.set_secret('payments_webhook', '<same value>')`.
  5. Switch Admin → Setări → Mod plăți to Live.
- **Subscriptions and post fees** are both off by default; enable them in Admin → Setări platformă.
  - Plans can cap active listings and waive the post fee. Renewal extends the period; a plan change cancels the old plan.
  - With fees on and no covering plan, a new listing is saved as an inactive draft; the seller pays and then publishes from "Anunțurile mele".
  - `run_platform_maintenance()` expires quotes, cancels unpaid live orders (restoring stock), closes subscriptions and unpublishes listings whose fee ran out. Schedule it with pg_cron (not installed) or run it from Admin.
- **Three proformas** (`lib/checkout/proforma.ts`, a pure model rendered to PDF and HTML):
  - **Seller copy:** seller → buyer, at seller prices, with seller VAT and IBAN.
  - **Buyer copy:** what the buyer pays: goods at buyer prices (commission folded in), transport and VAT, plus a footer splitting the amount between issuers.
  - **Middleman copy:** platform → buyer for the commission (and platform transport), plus settlement: collected, owed to the seller, kept by the platform.
  - Access: the buyer sees the buyer copy, the seller the seller copy, admin all three.
  - Old defects fixed:
    - Helvetica had no ă/ș/ț; now DejaVu Sans.
    - The fiscal address was never printed (it read `address_line1`; profiles store `line1`).
    - There was no IBAN or CUI line, no VAT column, no series/number/due date.
    - "TVA 19%" was hardcoded.
    - Line totals were recomputed in the browser.
  - Missing CUI, address or IBAN now shows a warning on screen instead of a silent blank.
- **Sensitive data:**
  - CUI is validated by the ANAF check digit, IBAN by mod-97, Reg. Com. in both the old and the post-2024 ONRC formats.
  - Fiscal address is required for companies.
  - IBAN and bank are new fields. They, CUI and phone are absent from public column grants and reach only order snapshots.
  - Admin settings validate the platform's own CUI and IBAN.
- **Optimization:**
  - Soft delete keeps order history intact.
  - Partial indexes for browse and seller lists; per-buyer idempotency only (the global unique key let two buyers collide).
  - Pricing and commerce settings are cached for 60 s and invalidated with `updateTag`.
  - Account tabs load in the existing parallel batch.
  - Rate limits use Upstash Redis over REST when `UPSTASH_REDIS_REST_URL` / `TOKEN` are set, else memory.
- **Multi-tenant request (`tenant_id` on every table):** not applied. Here the user is the tenant, and RLS on `auth.uid()` already isolates every table. A parallel `tenant_id` would duplicate that and add a column that could drift. The parts that do fit were applied: soft delete with partial unique indexes, and composite indexes on (owner, created_at).

### Open (need the client or an operator)
- **Q22.** Commission rate and base: 10% on goods only (DB default, configurable)? Should it also apply to transport (toggle exists)?
- **Q23.** Legal model for collecting money (PSD2 / agent): see `dsaplatformat.docx`. The code supports platform collection with settlement, but this is a legal decision.
- **Q24.** Payment provider choice (Netopia, Stripe, EuPlătesc, Revolut). Nothing is charged until one adapter is implemented.
- **Q25.** Non-VAT-payer sellers: VAT is currently applied to all goods at the configured rate.
- **Q26.** Plan prices and post fee amounts. No plans are seeded; create them in Admin.
- **Operator to do:**
  - Fill in the platform company data in Admin → Setări (the middleman proforma warns until then).
  - Make one user admin via `set_user_role`; there is no admin today.
  - Install pg_cron, or run maintenance manually.
- **CSP:** `cdn.jsdelivr.net` was added to `connect-src` for the PDF font. Self-host the two TTFs in `/public/fonts` to remove it.

## 3f. User panel: real data, real validation, onboarding (2026-11-20, fourth pass)

### Found
- **Seller activation:** one click with no checks. Clients could also set `seller_activated_at` directly through the API. **8 of 10 live listings belong to never-activated sellers.**
- **Listings:** anyone could create one through the API; the only check was the UI gate.
- **Orders tab:** purchases and sales were mixed and unbounded, with no order number or transport status. `paid` was shown as "Finalizată" (fulfilled).
- **Seller dashboard:** auctions, offers and revenue were hardcoded 0. Payouts and payment methods were Stripe placeholder tabs; auctions was an empty mock tab.
- **"Export date":** only logged a console message.
- **Validation:**
  - English Zod messages ("String must contain at least 6 character(s)").
  - One banner error, never per field.
  - Phone accepted any 6 characters; an empty phone was sent as `""` and failed validation.
  - A password of 8 spaces passed.
- **Login** ignored where the user came from.

### Changed
- **DB, applied on live and tested (rolled back):**
  - Migrations: `20261120172848_seller_activation_requirements`, `..._fix_array_append`, `20261120172941_listings_require_seller_trigger_invoker`.
  - `activate_seller()` requires name, valid phone, legal form, fiscal address and IBAN; companies also need a name and a valid CUI. SQL twins: `ro_cui_valid`, `ro_phone_valid`.
  - Clients cannot set the seller flag directly.
  - Only activated sellers can insert listings.
  - Tests:
    - `activate_seller()` rejected an incomplete profile, listing what was missing.
    - Setting the flag directly was blocked.
    - An unactivated user's listing insert was blocked; an activated seller's insert still worked.
    - A completed profile activated.
  - Two bugs caught by these tests are fixed: array append, and a SECURITY DEFINER trigger hiding the caller role.
- **Validation:** a Romanian Zod error map, inline field errors on Profil and Date firmă, CUI / IBAN / Reg. Com. / phone check digits, empty fields saved as "not set", and a password strength rule. DB errors are mapped to readable messages instead of raw Postgres text.
- **Activation:** the banner is now a checklist of missing items, each linking to the right tab. The button stays disabled until the profile is complete. `/sell/*` redirects to it, and login returns to the original page (same-site paths only).
- **Orders tab:**
  - Cumpărături / Vânzări tabs, latest 100.
  - Order number, transport status and a "next step" hint per order (plătește, răspunde la ofertă, programează livrarea, confirmă livrarea).
  - Sellers see their own amount.
- **Seller dashboard:** real KPIs (orders 30d, to process, total sales, paid and to be settled). The auction stat and buttons are gone.
- **Mock tabs:**
  - Decontări (ex-Payouts) shows real sums and the IBAN on file.
  - Plăți (ex-Metode plată) explains the real flow.
  - The auctions tab is hidden; the auctions pages are untouched (S14).
- **Export:** downloads the user's data as JSON immediately (RLS-scoped).
- **Onboarding:** a "Primii pași" checklist at the top of the account, with progress from real data.
- **Tutorial:** `/ghid`, in Romanian, 8 short sections (account, buying, checking an order, becoming a seller, posting, transport, payments/commission/documents, problems). Linked from the header, footer, account checklist, activation banner, orders tab and dashboard.

### Still open
- Existing sellers with incomplete data keep their activation (no retroactive lock). Run `select id, public.seller_missing_requirements(id) from profiles where seller_activated_at is not null` to see who must complete data. Q27: lock them until complete?
- Addresses, policies and supplier settings forms still show a single banner error (now in Romanian), not per-field errors.
- Reviews, threads and login_events RLS (S7–S9) are unchanged.

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
