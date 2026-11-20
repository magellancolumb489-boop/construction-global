# ConstructionHub Romania — agent handoff (do not remap)

Paste this whole document to another agent. It is the source of truth for this workspace. Do not re-scan the repo unless a claim here conflicts with a file you are about to edit. If it conflicts, the file wins and you should update this brief.

Product name in UI and emails: **ConstructionHub Romania**. `package.json` name is still `my-project` (0.1.0, private). UI language is Romanian (`lang="ro"`). Currency is RON or EUR. There is no README.

## 1. What the product is

A Romanian construction marketplace. A company or person lists construction goods and services. A buyer browses, sometimes configures delivery (concrete distance quote or materials truck plan), puts one seller’s goods in a browser cart, and checks out. The server writes an order, a line snapshot, a demo payment row, optional Resend emails, and a printable **deviz** (pro-forma quote PDF). It is not a generic shop: pricing depends on concrete class, consistency, distance, vehicle, trips, and crane add-ons.

Four listing kinds (`marketplace_listings.listing_type`, mirrored by `ListingKind` in [types/domain.ts](types/domain.ts)):

- **concrete** — ready-mix concrete (beton). Buyer must configure before cart.
- **materials** — construction materials. If a material-logistics spec exists, buyer configures vehicles/trips/crane. Otherwise simpler add-to-cart plus a flat `transport_fee`.
- **equipment** — machinery / equipment (utilaje). Unit must be `BUC`. Simple add-to-cart.
- **services** — services. Unit must be `BUC`. Simple add-to-cart.

Marketing copy also mentions licitații (auctions), oțel, ciment, agregate, prefabricate, containere, cofraje, panouri. **Auctions are a UI shell on mock data. There are no auction tables in this repo.**

Home metadata ([app/layout.tsx](app/layout.tsx)): “Platforma de licitatii si materiale de constructii din Romania.”

## 2. Stack and how the app is split

- **Next.js 16.1.6** App Router, **React 19.2.4**, TypeScript 5.7.3, Tailwind CSS 4.2.
- **Supabase**: Auth (email/password), Postgres, Storage, RLS, SECURITY DEFINER RPCs. Clients: `@supabase/ssr` 0.9, `@supabase/supabase-js` 2.105.
- **No service-role key in app runtime.** Server code uses the cookie session and the anon/publishable key, so RLS applies.
- Session refresh is **not** `middleware.ts`. Next 16 **proxy**: [proxy.ts](proxy.ts) calls `updateSession` in [lib/supabase/proxy.ts](lib/supabase/proxy.ts) (`auth.getClaims()`).
- Browser client: [lib/supabase/client.ts](lib/supabase/client.ts). Server client: [lib/supabase/server.ts](lib/supabase/server.ts).
- Validation: Zod in [lib/validation/](lib/validation/). Forms: react-hook-form.
- Email: Resend + React Email templates. PDF: `@react-pdf/renderer`. Maps: Leaflet + OSM tiles. Geocode: Nominatim via `/api/geocode`. Routing: OSRM via `/api/route`.
- Payments: **demo by default**. Stripe is a stub. `@stripe/*` is not installed.
- Tests: Vitest. Known tests: [lib/materials-logistics/engine.test.ts](lib/materials-logistics/engine.test.ts), [lib/checkout/order-line-snapshot-detail.test.ts](lib/checkout/order-line-snapshot-detail.test.ts).
- UI kit: shadcn/Radix under [components/ui/](components/ui/).
- Analytics: `@vercel/analytics` in the root layout.

Folder roles:

- [app/](app/) — routes, layouts, route handlers, co-located server actions.
- [components/](components/) — layout, shared widgets, sell wizard, checkout (email + deviz PDF).
- [lib/](lib/) — API accessors, cart, pricing engines, payments, email, supabase, validation.
- [types/domain.ts](types/domain.ts) — app types. [types/supabase.ts](types/supabase.ts) — DB types, **partly hand-patched** (orders / `place_order`). Regenerate with `npm run gen:types` only when the CLI is linked; then re-apply any intentional patches or fix the generator output.
- [supabase/migrations/](supabase/migrations/) — 14 SQL files. Local `config.toml` expects `seed.sql`, which is **missing**. Postgres 17 locally. API `max_rows = 1000`.
- [docs/SECURITY.md](docs/SECURITY.md) — **stale**. It still documents auction tables, `place_bid`, `close_auction`, and bucket `auction-images`. Those are gone. Do not treat that file as current schema.
- [.cursor/rules/marketplace-purchase-flow.mdc](.cursor/rules/marketplace-purchase-flow.mdc) — purchase-flow rules. Phase 2 Stripe section is the intended contract; tables exist; Stripe does not.
- [.agents/skills/](.agents/skills/) — agent skills, not runtime.

Scripts: `dev`, `build`, `start`, `lint`, `test` (`vitest run`), `gen:types`.

## 3. Roles (there is no buyer/seller role)

`profiles.role` is only `user` or `admin` (`UserRole` in domain types).

- **Buyer (cumpărător):** any logged-in user. Orders use `orders.buyer_id`. No extra flag.
- **Seller (vânzător):** same account after `profiles.seller_activated_at` is set by `activateSellerAction` in [app/account/actions.ts](app/account/actions.ts). UI gate: [components/shared/seller-activation-banner.tsx](components/shared/seller-activation-banner.tsx). Listings require `seller_id = auth.uid()`; a trigger locks `seller_id`.
- **Admin:** `profiles.role = 'admin'`. [app/admin/layout.tsx](app/admin/layout.tsx) loads `get_my_profile()` and `notFound()` otherwise. Header admin link uses the same RPC in the root layout. Role changes only through RPC `set_user_role`. Trigger `profiles_block_role_update` blocks direct updates.

Legal entity on the profile (business tab): `PF`, `PFA`, `SRL`, `SA`, `II`, `IF`. Seller business fields include `company_name`, `tax_id`, `reg_com`, `vat_id`, `seller_policies`, `supplier_settings` (JSON).

Public seller display should go through view `public_profiles` (baseline view is `id, display_name, avatar_path`). Direct `profiles` reads are limited by column grants plus RLS. Own profile is `rpc('get_my_profile')` in [lib/api/profile.ts](lib/api/profile.ts), not a raw select. Phone and role must not leak on public reads.

## 4. Services and what is sold

### 4.1 Listing kinds and buyer path

- **Beton (`concrete`):** EN 206 classes, consistency, pickup coordinates required, at least one of CIFA or POMPA, `min_order_qty` required, unit `M3` or `TON`. VRAC is forbidden on concrete (Zod and DB). PDP sends the buyer to `/cart/configurare`.
- **Materiale (`materials`):** taxonomy in [lib/materials-logistics/catalog.ts](lib/materials-logistics/catalog.ts). With a spec row, buyer uses the materials configurator (not CIFA). Without a spec, treat as a normal priced listing plus optional flat transport fee.
- **Utilaje (`equipment`):** `equipment_condition`, `equipment_model`, `equipment_year`. Unit `BUC`.
- **Servicii (`services`):** unit `BUC`. Simple quantity checkout.

Units (`ProductUnit`): `TON`, `KG`, `M3`, `BUC`, `ML`, `CUP`, `CAMION`.

Transport mode codes on listings: `CIFA` (autobetonieră / mixer), `POMPA` (pump), `VRAC` (bulk). Concrete wizard allows only CIFA and POMPA.

Settlement flag `seller_assumes_transport` (default true): comment in [lib/validation/listing.schema.ts](lib/validation/listing.schema.ts) says true = seller delivers and platform takes 10%; false = platform organizes transport and takes 10% plus the full transport amount. **`place_order` does not apply this fee. Do not invent commission math.**

### 4.2 Concrete catalogue (seller wizard + buyer configurare)

Source: [lib/listing-wizard-types.ts](lib/listing-wizard-types.ts). DB keys are ASCII. UI labels are Romanian.

Classes and allowed consistencies:

- `C8/10` (B150): vartos, semivartos
- `C12/15` (B200): vartos, semivartos
- `C16/20` (B250): semivartos, pompabil
- `C20/25` (B350): semivartos, pompabil, moale
- `C25/30` (B400): pompabil, moale
- `C30/37` (no B mark): pompabil, moale
- `C35/45` (B450): pompabil, moale

Consistency labels: vartos = Vârtos (stiff), semivartos = Semivârtos, pompabil = Pompabil, moale = Moale.

Prices live in `marketplace_listing_concrete_classes.consistency_prices` JSONB (per class, per consistency). There is no single price column on that child table anymore (dropped in `20260511120000`).

### 4.3 Materials taxonomy

Categories (`MATERIAL_CATEGORY_CODES`):

- `ALTE_MATERIALE` — Alte materiale (ciment, bitum, filer, plase sudate, bare de oțel, table, etrieri, cherestea)
- `AGREGATE_CARIERA` — Agregate de carieră (criblură, piatră spartă fractions)
- `AGREGATE_BALASTIERA` — Agregate balastieră (nisip, sort, balast)
- `DIMENSIUNI_MEDII` — mid-size goods (adezivi, var, ipsos, cărămizi, țiglă, BCA, rigips, vată minerală, etc.)
- `DIMENSIUNI_MICI` — small hardware (cuie, șuruburi, piulițe, etc.)

Codes are stable CHECK/RPC keys. Full lists are in [lib/materials-logistics/catalog.ts](lib/materials-logistics/catalog.ts). Do not rename codes.

Vehicles (`VEHICLE_LABELS`): dubă, autoutilitară, camion cu benă, camion cu macara (HIAB), TIR, trailer, autobasculantă. Seller stores offers as `vehicle_code` + `payload_t` on `marketplace_listing_material_transport`. Spec (1:1 on listing) holds category, material, pallet fields, max piece length, macara addon + fee, `allow_non_bulk_transport`.

### 4.4 Account surface (real vs stub)

Route `/account?tab=`. Groups in [app/account/account-content.tsx](app/account/account-content.tsx):

- Cont: profile, business (Date firmă), addresses, preferences (language ro/en, currency RON/EUR, metric/imperial), notifications, security, privacy.
- Cumpărător: orders (real DB), wishlist (real), reviews given (real), payment methods (**Stripe seam stub**).
- Vânzător: dashboard (listings/reviews/messages real; auctions, revenue, payouts **hardcoded 0**), listings (real), auctions (**empty**, copy says relaunch), payouts (**stub**), shipping/supplier settings (saved JSON, **not read by the calculator**), policies (real JSON), reviews received (real).
- Comunicare: messages (real DB). Outbound notify is a stub.

Notification preference channels: email, push (not shipped), SMS (after phone verify). Topics include orders, bids, messages, marketing. Security topic is locked on.

## 5. Calculators — two engines

Do **not** change formulas in [components/shared/calc-price.tsx](components/shared/calc-price.tsx) unless the user explicitly asks. Cursor rule: calculator is display/estimation; authoritative money is the server recompute. Today those two disagree for concrete. See section 7.

`PriceCalculator` is mounted only from configurare in `mode="flow"`. `standalone` exists in the component and has **no route**.

### 5.1 Engine A — `calc-price.tsx` (concrete and legacy unit modes)

File is ~3974 lines. Entry from [app/cart/configurare/configure-order-client.tsx](app/cart/configurare/configure-order-client.tsx) when the listing is not materials-with-logistics.

Unit selects the mode (`allowedCalculatorTypesForProductUnit`):

- `M3` → `CIFA`, `POMPA`
- `TON` → `VRAC`
- anything else (`KG`, `BUC`, `ML`, `CUP`, `CAMION`) → `DEPOZIT`

A concrete listing with unit `TON` therefore opens **VRAC**, not CIFA/POMPA. Seller schema allows concrete `M3` or `TON`. That combination is likely unintentional. Buyer UI does **not** filter modes by `transport_modes` on the listing; only unit matters.

Rule tables inside the file (`mockCifaRules`, `mockPumpRules`, `mockVracRules`, `mockProfiles`, `mockListings`) are **empty arrays**. `buildMarketplaceFlowValidationSource` injects synthetic transport rules (about 500 km radius) so validation passes. `profiles.supplier_settings` (seller “Livrare” tab, schema in [lib/validation/supplier-settings.schema.ts](lib/validation/supplier-settings.schema.ts)) is **not wired** into these rules. Live quotes use the defaults below.

**CIFA** (`calculateCifaQuote`). Inputs: one-way km (default UI 15), quantity m³, material unit price, tube yes/no, VAT (UI default 19), supplier id. Defaults: 12 RON/km, min transport 200 RON, handling 8 RON/m³, tube 60 RON.

- transport distance = max(min transport, km × per km)
- handling = m³ × handling per m³
- transport subtotal = distance + handling
- optional tube surcharge
- material = m³ × unit price (from selected consistency price, else listing `price`)
- net = material + transport + surcharges; VAT on full net
- distance is **one way only** (no return leg)

**POMPA** (`calculatePompaQuote`). Inputs: one-way km, pumped m³, hose metres, calări count, VAT. Defaults: min service 600 RON covering 18 m³, +27 RON/m³ above that, transport 14 RON/km with min 200, 40 m hose included, +100 RON per extra 10 m (ceil), calare 100 RON each.

- `material_subtotal` is **0**. Pump quote excludes the concrete material cost. There is a TODO (`beton-pompa-total`) around the flow UI. Do not “fix” this silently.
- If no transport rule, result is manual (`is_manual`).

**VRAC** (`calculateBulkQuote`). Inputs: km, tons, unit price per ton, vehicle capacity tons, VAT. Defaults: threshold 45 km, coefficient 0.45, min course 320 RON, underload 20 RON/t.

- trips = ceil(tons / capacity)
- if km > 45: trip cost = km × 0.45 × loaded tons
- else: trip cost = 320 + unused tons × 20
- material = tons × unit price; VAT on material + transport

**DEPOZIT** (`calculateDepotQuote`). Material subtotal always. `hasAutoPricing` is hardcoded false, so AUTO always becomes “Ofertă manuală”. Transport is not priced. VAT on materials only.

Geocode/route: pickup from `pickup_lat/lng` or geocoded `location`. Delivery address uses [components/shared/address-autocomplete.tsx](components/shared/address-autocomplete.tsx) → [lib/api/routing.ts](lib/api/routing.ts) → `/api/geocode` and `/api/route`. Map: [components/shared/route-map.tsx](components/shared/route-map.tsx) (Leaflet, dynamic).

### 5.2 Engine B — materials logistics (aligned with checkout)

Used when `listingKind === "materials"` and `materialLogistics` is present. UI: [app/cart/configurare/configure-materials-order.tsx](app/cart/configurare/configure-materials-order.tsx). Engine: [lib/materials-logistics/engine.ts](lib/materials-logistics/engine.ts). Comment in the UI: this path is explicitly without the CIFA calculator.

Client money:

- material net = listing `price` × qty
- transport net = (`transport_fee` or 0) × trips, plus `macara_fee` if the buyer opts in and the seller offers macara
- VAT hardcoded 0.19
- cart `calcType` string: `MATERIALS_LOGISTICS` (client-only)

`buyerTransportOptions` (rule 2): variant A = more trips on a smaller vehicle; variant B = one trip on a larger vehicle. If the seller stored no offers, the platform may assign vehicles (`marketplaceAssigned` / “propus platformă”).

Heuristics (orientation, not weighed goods). SQL copies of mass/trip helpers live in migration `20260514120000` and must stay in sync with the TS engine:

- `estimateTotalMassKg`: M3 → 1600 kg/m³; CUP → 1500; CAMION → 18000 kg; pallet override; else about 25 kg per piece
- volume and nominal vehicle capacity about 10–48 m³ depending on vehicle
- bulk categories prefer autobasculantă unless `allow_non_bulk_transport`
- long pieces filter vehicles by length bands (`vehiclesForLongMaterial`)

Seller wizard hints: `suggestedVehiclesForListing`. Tests cover bulk filter, non-bulk override, long steel, multi-trip vs single TIR, pallet mass.

### 5.3 Configure → cart → checkout data

1. PDP [app/products/[slug]/product-detail-client.tsx](app/products/[slug]/product-detail-client.tsx): concrete, or materials with logistics, calls `saveConfigureDraft` then `/cart/configurare`. Other kinds add to cart directly.
2. Draft: `sessionStorage` key `constructionhub_configure_draft` ([lib/configure-draft.ts](lib/configure-draft.ts)), versioned `ConfigureDraftV1`, includes `ProductDetail` and qty. Missing draft redirects toward marketplace. Server action `refreshProductDetailForConfigureAction` in [app/cart/configurare/actions.ts](app/cart/configurare/actions.ts) refreshes the product if seller name is missing.
3. Configurare collects delivery address, optional persoană juridică (company name, CUI/VAT), optional alternate billing address, and a valid quote.
4. Cart: `localStorage` key `constructionhub_cart` via [lib/cart-context.tsx](lib/cart-context.tsx). **One seller per cart** (`seller_mismatch`). Duplicate `productId` only increments qty and does **not** replace configuration metadata.
5. Checkout is blocked while `configurationRequired && !configurationComplete`.
6. Concrete cart line (`buildCartLine`): `price` is blended `total_gross / qty`, plus `quoteSummary`, `configureConcreteSelection`, delivery and billing snapshots.
7. Checkout calls `placeOrderAction`. **Server recomputes cents. Client totals are not the charge.**

Slug helper: product URLs may carry a suffix; `extractSlug` uses the part after the last hyphen where implemented. Listing slugs are lowercase `[a-z0-9-]`, 1–80 chars.

## 6. Database

Supabase Postgres. **Base tables are not created in this repo.** Migrations ALTER `profiles`, `categories`, `marketplace_listings`, `marketplace_listing_images` and assume `handle_new_user` already exists on the remote project. A fresh local `supabase db reset` will fail unless that base schema is restored. `types/supabase.ts` is the column inventory for what the app expects.

No Postgres ENUM types. Statuses are TEXT + CHECK. `Enums` in generated types is empty.

### 6.1 Migration order

- `20260407120000_marketplace_listings_wizard.sql` — listing_type, pickup geo, transport_modes, min_order_qty, transport_fee, equipment fields.
- `20260422120000_security_rls_baseline.sql` — `is_admin()`, RLS, role lock, `public_profiles`, seller_id lock, listing policies, indexes.
- `20260422121000_place_bid_rpc.sql` — **misnamed**. Only adds `set_user_role`. Comment says auction `place_bid` / `close_auction` were removed.
- `20260422122000_storage_policies.sql` — bucket `listing-images`. Drops legacy `auction-images` policies.
- `20260422123000_account_expansion.sql` — addresses, notification prefs, wishlist, reviews, messages, login events, deletion requests, extra profile columns.
- `20260422124000_avatars_storage.sql` — bucket `avatars`.
- `20260509120000_grant_is_admin_execute.sql` — EXECUTE on `is_admin()` for anon, authenticated, service_role.
- `20260509160000_get_my_profile_rpc.sql` — `get_my_profile()`.
- `20260510120000_concrete_classes.sql` — concrete class rows, upsert RPC, VRAC banned on concrete.
- `20260510140000_listing_seller_transport.sql` — `seller_assumes_transport`.
- `20260511120000_concrete_consistency_prices.sql` — `consistency_prices` JSONB; per-row price dropped; upsert RPC updated.
- `20260512120000_orders_phase2.sql` — `orders`, `order_lines`, `payments`, read-only RLS, `place_order`, `_build_order_payload`.
- `20260513120000_place_order_seller_auth_email.sql` — seller snapshot includes `auth_email` from `auth.users`.
- `20260514120000_materials_logistics.sql` — material spec + transport tables, SQL helpers, `upsert_listing_material_logistics`, **current** `place_order` (materials branch). This file is the live order function. Earlier `place_order` definitions are historical.

### 6.2 Tables

- **profiles** — `id` = auth user uuid. `display_name`, `phone`, `role`, `seller_activated_at`, business columns, `seller_policies`, `supplier_settings`.
- **categories** — `id` number, `slug`, `parent_id`, `is_active`, `sort_order`.
- **marketplace_listings** — `id` **number** (not uuid). `seller_id` uuid, `slug`, `title`, `price` numeric (major units, not cents), `currency`, `unit`, `available_qty`, `min_order_qty`, `listing_type`, pickup lat/lng/address, `location`, `transport_fee`, `transport_modes[]`, `service_area`, equipment columns, `seller_assumes_transport`, `is_active`.
- **marketplace_listing_images** — `listing_id`, `storage_path`, `display_order`.
- **marketplace_listing_concrete_classes** — `class_code`, `consistencies[]`, `consistency_prices` jsonb. Cascade from listing.
- **marketplace_listing_material_spec** — PK `listing_id` (1:1). Category, material, pallet, length, macara, `allow_non_bulk_transport`.
- **marketplace_listing_material_transport** — many offers per listing: `vehicle_code`, `payload_t`.
- **orders** — uuid PK. `buyer_id`, `seller_id`, cents columns (`subtotal_cents`, `transport_cents`, `vat_cents`, `total_cents`), `status`, payment fields, `stripe_session_id`, `stripe_payment_intent_id`, unique `idempotency_key`, `billing_json`, `shipping_json`, buyer/seller snapshots, `order_number`, `deviz_number`.
- **order_lines** — bigserial. `order_id` uuid, `listing_id` number nullable on delete set null, qty, `unit_price_cents`, `transport_cents`, `line_total_cents`, `snapshot_json`.
- **payments** — uuid. `provider` demo or stripe, `amount_cents`, `status`, `raw_json`, unique provider event id.
- **user_addresses**, **user_notification_preferences**, **wishlist_items** — per auth user.
- **reviews** — reviewer, target user, optional listing. **`order_id` is bigint and is not an FK to `orders.id` (uuid).** Integrity is broken. Do not join them as if they matched.
- **message_threads**, **messages**.
- **login_events** — client-insertable today (see security pacts).
- **account_deletion_requests** — queue, not a hard delete.
- View **public_profiles**. Account-expansion grants may not match the original view definition. Verify on the live DB before assuming `company_name` / `entity_type` are on the view.

### 6.3 RPCs (SECURITY DEFINER)

- `is_admin()` — reads `profiles.role`.
- `set_user_role(uuid, text)` — admin only, `user` or `admin`.
- `get_my_profile()` — full own row, bypasses column-grant pain.
- `place_order(...)` — **only** insert path for orders, lines, and payments.
- `_build_order_payload(uuid)` — idempotent replay JSON.
- `upsert_listing_concrete_classes` — owner/admin replace child rows.
- `upsert_listing_material_logistics` — owner/admin replace spec + offers.
- `materials_*` helpers — mass, trips, payload checks. Granted to anon and authenticated. They are validators, not writers.

Triggers worth knowing: `tg_touch_updated_at`; `profiles_block_role_update`; `listings_lock_seller_id`; address/review/message immutability of ids and message body; `messages_touch_thread` bumps `last_message_at`.

### 6.4 Storage

- **listing-images** — public read. Write only if the first folder segment equals `auth.uid()`. App upload: [lib/api/listings-client.ts](lib/api/listings-client.ts) under `{user_id}/`.
- **avatars** — public read, about 2 MB, jpeg/png/webp, same folder rule.
- **auction-images** — policies dropped. Do not recreate unless auctions return.

### 6.5 RLS sketch

All app tables in migrations have RLS; many are FORCE.

- profiles: own row + admin; public exposure is column grants + view. Insert blocked. Users cannot update `role`.
- categories: read active or admin; writes admin.
- listings and images: public sees `is_active`; owner/admin see all; insert forces seller; owner update/delete.
- concrete and material children: visibility follows the parent listing; writes by listing owner/admin.
- orders, order_lines, payments: SELECT for buyer, seller, or admin. **INSERT/UPDATE/DELETE denied for clients.** RPC only.
- addresses, notification prefs, wishlist: self.
- reviews: SELECT for everyone (`using true`). INSERT if reviewer is self. **No proof of purchase.**
- threads: SELECT members/admin. INSERT if you put yourself in `(buyer_id, seller_id)` — you can name the other party arbitrarily.
- messages: members; body immutable after insert; delete admin only.
- login_events: self read; **self insert** of arbitrary event text.
- deletion requests: self insert pending; self cancel; admin otherwise.

## 7. Checkout money contract (critical)

Writer: `public.place_order` in [supabase/migrations/20260514120000_materials_logistics.sql](supabase/migrations/20260514120000_materials_logistics.sql). Caller: `placeOrderAction` in [app/checkout/actions.ts](app/checkout/actions.ts).

Idempotency: client sends a key; repeat returns the existing payload via `_build_order_payload`.

VAT on the order is **fixed 19%** of (subtotal + transport). The calculator’s editable VAT percent does not change server cents.

Order numbers are `count(*) + 1` per day. Concurrent checkouts can collide. Replace with a sequence or `INSERT ... ON CONFLICT` retry before production traffic.

**Concrete lines:** unit price comes from `consistency_prices[class][consistency]`. If that DB price is missing, the function falls back to client `unit_price_cents`. That fallback is a trust bug. Transport cents are **one flat `listing.transport_fee`**, not CIFA/POMPA distance, handling, tube, hose, or calări. `quote_summary` is copied into `snapshot_json` for display and audit only.

**Materials with spec:** server checks vehicle, payload, trips, macara, pallet count against spec and SQL helpers. Transport cents = `transport_fee × trips + macara_fee`. This **matches** the materials configurator.

**Other types:** `price × qty` plus one flat `transport_fee`.

**Stock:** `place_order` checks `available_qty` and does **not** decrement it. Two buyers can pass the check. Fix inside the same transaction with `SELECT … FOR UPDATE` and an update.

**Demo payment:** [lib/payments/mode.ts](lib/payments/mode.ts) is `demo` unless `NEXT_PUBLIC_PAYMENTS_MODE=stripe`. Demo inserts `payment_provider = demo` and a paid-like demo status (`demo_paid`). No Stripe redirect.

**Stripe branch is unsafe to turn on.** [lib/payments/stripe-stub.ts](lib/payments/stripe-stub.ts) throws. [app/checkout/actions.ts](app/checkout/actions.ts) then tries `orders.update` for `stripe_session_id`, which RLS policy `orders_no_update` rejects. There is no `app/api/stripe/webhook/route.ts`. [components/shared/winner-payment-block.tsx](components/shared/winner-payment-block.tsx) still points at `href="#"`. Seller payouts and saved cards are [app/account/seller/stripe-seam.ts](app/account/seller/stripe-seam.ts) and [components/shared/stripe-seam-card.tsx](components/shared/stripe-seam-card.tsx).

Cart UI total in [lib/cart-context.tsx](lib/cart-context.tsx) is sum of `price * qty + transportFee`. Configured concrete lines store a blended price, but checkout **ignores** that and recomputes from DB. A buyer can see a CIFA total and be charged listing price × qty + flat transport fee. Do not “fix” the cart label alone. Either teach `place_order` the real tariff (supplier rates, distance, surcharges) or label the calculator as an estimate and charge only DB fields — and make the UI say which one is the charge.

Snapshot display helper: [lib/checkout/order-line-snapshot-detail.ts](lib/checkout/order-line-snapshot-detail.ts) (`orderLineSnapshotSubline`). PDF: [components/checkout/deviz-pdf-document.tsx](components/checkout/deviz-pdf-document.tsx). Emails: [components/checkout/email-buyer-template.tsx](components/checkout/email-buyer-template.tsx), [components/checkout/email-seller-template.tsx](components/checkout/email-seller-template.tsx), send path [lib/email/send-order-emails.ts](lib/email/send-order-emails.ts).

Emails are scheduled after a successful order and **must not roll the order back** if Resend fails. Buyer recipient is the checkout form email, not necessarily `auth.users.email`. Seller recipient is `seller_snapshot.auth_email`. No allowlist. Default from is `ConstructionHub Romania <onboarding@resend.dev>` unless `RESEND_FROM` is set. Preview UI mentions `noreply@constructionhub.ro`; that domain is not wired.

Deviz copy says the PDF is not a fiscal invoice.

## 8. Routes

Auth group `(auth)` redirects logged-in users to `/account`.

- `/` — home. Featured auctions are **mock** ([lib/auction-shell/mock-data.ts](lib/auction-shell/mock-data.ts)). Featured products are DB.
- `/marketplace` — browse/filter listings. DB.
- `/products/[slug]` — PDP. DB join of images, concrete classes, material spec, transport, category, seller.
- `/cart` — local cart.
- `/cart/configurare` — configure draft.
- `/checkout` — login required, then `placeOrderAction`.
- `/checkout/success` — reads the order (RLS) using query ids; shows `order_number` / `deviz_number`.
- `/checkout/cancelled` — static copy. No Stripe cancel session yet.
- `/login`, `/register`, `/forgot-password` — Supabase auth in [lib/api/auth.ts](lib/api/auth.ts) (`signInWithPassword`, `signUp` + metadata, `resetPasswordForEmail`, `signOut`). Email confirmation is off in local `config.toml`.
- `/account` — server page loads profile, listings, addresses, wishlist, reviews, threads, seller dashboard, security, privacy, notification prefs in parallel, then client tabs.
- `/account/orders/[id]` and `/account/orders/[id]/deviz` — order detail and printable deviz.
- `/sell/*` — layout redirects anonymous users to `/login`.
- `/sell/listing/new` and `/sell/listing/[id]/edit` — real wizard. Actions: [app/sell/listing/actions.ts](app/sell/listing/actions.ts) (`createListingAction`, `updateListingAction`, `deleteListingAction`). Seller id injected from `auth.uid()`. Then RPCs for concrete classes and material logistics. Images to Storage.
- `/sell/auction/new` — wizard shell, **no persist**. Comment: auction persistence removed.
- `/sell/auction/[id]/edit` — paused stub.
- `/auctions`, `/auctions/[slug]` — mock list and mock bids (`MOCK_BID_ROWS`, `getMockAuctionDetailForSlug`).
- `/admin` — role gate, then **stub reads** in [lib/api/admin.ts](lib/api/admin.ts) (zeros and empty arrays after a fake delay). Pages: overview, auctions, orders, users, payments. `changeUserRoleAction` in [app/admin/actions.ts](app/admin/actions.ts) is **real** (`set_user_role`). `markOrderFulfilled` is a fake success; RLS would block a direct update anyway.
- `/api/geocode` GET — Nominatim, Romania, logged-in, in-memory 60/min per user per instance.
- `/api/route` POST — OSRM, in-memory cache.
- `/api/supabase-health` GET — hidden in production without `SUPABASE_HEALTH_SECRET` (404).
- `/test/profile`, `/test/categories` — debug pages. Do not ship as product surface.

Wizard steps live under [components/sell/listing-wizard/](components/sell/listing-wizard/) (type, concrete, materials, equipment, services, images, review).

## 9. Module map (where to edit)

- Listings read model: [lib/api/listings.ts](lib/api/listings.ts) (`getProductListItems`, `getListings`, `getProductDetailFromListing`, `toProductDetail`).
- Orders read: [lib/api/orders.ts](lib/api/orders.ts), payload shape [lib/api/order-payload.ts](lib/api/order-payload.ts).
- Seller KPIs: [lib/api/seller.ts](lib/api/seller.ts).
- Reviews, wishlist, messages, addresses, privacy, notification prefs, security: matching files in [lib/api/](lib/api/). Client wrappers (`*-client.ts`) call server actions.
- Admin: [lib/api/admin.ts](lib/api/admin.ts) is a placeholder. Do not build admin UI on top of the stubs without replacing the data functions.
- Notifications: [lib/notifications/dispatch.ts](lib/notifications/dispatch.ts) logs to console. Message actions say outbound notify is a stub.
- Listing form state: [lib/listing-wizard-form-state.ts](lib/listing-wizard-form-state.ts), [lib/listing-material-embed.ts](lib/listing-material-embed.ts).

Server actions by area:

- [app/checkout/actions.ts](app/checkout/actions.ts) — `placeOrderAction`, `sendOrderEmailsAction` (buyer, seller, or admin only).
- [app/account/actions.ts](app/account/actions.ts) — profile, business, preferences, notifications, policies, supplier settings, activate seller, avatar upload.
- [app/account/addresses/actions.ts](app/account/addresses/actions.ts), [app/account/wishlist/actions.ts](app/account/wishlist/actions.ts), [app/account/reviews/actions.ts](app/account/reviews/actions.ts), [app/account/messages/actions.ts](app/account/messages/actions.ts), [app/account/security/actions.ts](app/account/security/actions.ts), [app/account/privacy/actions.ts](app/account/privacy/actions.ts).

## 10. Environment names (no values)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (preferred) or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — documented for CLI only. **Do not import it in Next.js server actions or route handlers.**
- `SUPABASE_HEALTH_SECRET`
- `NEXT_PUBLIC_PAYMENTS_MODE` — `demo` (default) or `stripe`
- `RESEND_API_KEY`, `RESEND_FROM`
- `NODE_ENV`

There is no Stripe secret env because Stripe is not installed. When it is added, the secret stays server-only. The publishable payments mode flag must not be the only gate.

## 11. Security pacts (binding until the user changes them)

These are the rules required to finish safely from this state. An agent must follow them even if a UI task seems to need a shortcut.

**S1. RLS is the trust boundary.** Browser, RSC, route handlers, and server actions all use the user JWT. Never add the service role to the Next.js app to “make an update work”. New privileged writes are SECURITY DEFINER RPCs that check `auth.uid()` and `is_admin()` inside Postgres.

**S2. Money is server-side.** `place_order` (or its successor) recomputes every cent from DB rows. Client cart prices, `quoteSummary.totalGross`, and `unit_price_cents` are not authoritative. Remove the concrete fallback that copies client `unit_price_cents` when `consistency_prices` is missing; fail the line instead.

**S3. Order rows stay immutable from PostgREST.** Do not add a permissive `orders` UPDATE policy for the checkout action. Stripe session id, payment intent, paid/failed/refunded, and fulfilled status change only inside a definer function or a webhook that uses a server-only secret and then calls that function. Verify the Stripe signature. Make the handler idempotent on `provider_event_id`. Do not set `NEXT_PUBLIC_PAYMENTS_MODE=stripe` until the stub is gone and this RPC exists.

**S4. Stock and money commit together.** Decrement `available_qty` in the same transaction as the order insert, after `FOR UPDATE` on the listing row. Respect `min_order_qty`. Reject inactive listings. Do not decrement twice on idempotent replay.

**S5. Identity fields stay server-owned.** `seller_id` on insert is `auth.uid()`. Clients cannot send `seller_id`, `role`, or order totals. Zod schemas stay allowlisted (see `baseListingFields` — `seller_id` is intentionally absent). `set_user_role` remains the only role writer.

**S6. Admin UI is not authorization.** [app/admin/layout.tsx](app/admin/layout.tsx) is a UX gate. Every admin mutation re-checks `is_admin()` in the RPC. Stub `getAdmin*` functions must not be replaced with service-role reads.

**S7. Reviews require a completed purchase.** Today any authenticated user can insert a public review. The pact: reviewer is the buyer on a paid/fulfilled order for that seller (and listing, when the review targets a listing). Fix the `reviews.order_id` type so it references `orders.id` (uuid) or drop the column and use a real FK. Keep public SELECT only if product still wants public reviews.

**S8. Threads are between real parties.** Insert is allowed only when `auth.uid()` is one side and the other side is the seller of a listing the caller is allowed to contact (or an existing order counterparty). Do not allow arbitrary `buyer_id`/`seller_id` pairs.

**S9. Audit rows are not client-writable.** `login_events` inserts go through a definer RPC that sets user id and event enum. Revoke direct INSERT.

**S10. Email recipients.** Seller mail stays on `auth.users` email captured in the snapshot. Buyer mail goes to the authenticated user’s email, or a verified address, not an unchecked checkout field. Keep sending failures non-blocking. Production `RESEND_FROM` must be a verified domain. Do not log full tax snapshots.

**S11. Uploads stay in the caller’s folder.** Storage policies already require folder prefix = uid. Do not accept a client-supplied storage path outside that prefix. Listing images and avatars stay on the existing buckets.

**S12. Secrets and headers.** Do not weaken CSP, HSTS, Referrer-Policy, Permissions-Policy, `X-Content-Type-Options`, or `X-Frame-Options` in `next.config.mjs`. `typescript.ignoreBuildErrors` stays false. `/api/supabase-health` stays 404 in production without the secret. Geocode stays authenticated. Before multi-instance production, replace the in-memory geocode limiter (and route cache, if it must be global) with a shared store. The code comments mention Upstash when provisioned.

**S13. Public profile surface.** Do not grant `anon` or `authenticated` extra columns on `profiles` (`phone`, `role`, tax ids) to make a join easier. Extend `public_profiles` explicitly if the PDP needs `company_name` or `entity_type`, and check the live view definition against grants. Account expansion grants and the baseline view may have drifted.

**S14. Auctions.** Do not recreate `place_bid` or auction tables as a side effect of UI work. The public auction pages are mock. Persistence needs a new design (its own RLS and a definer for bids) and a user decision. [docs/SECURITY.md](docs/SECURITY.md) checklist items about `place_bid` are obsolete; do not implement them against missing tables.

**S15. Types and SQL twins.** After any migration, regenerate `types/supabase.ts` and keep the hand-written `place_order` args honest. Materials SQL helpers and [lib/materials-logistics/engine.ts](lib/materials-logistics/engine.ts) change in pairs. Calculator defaults and `place_order` tariffs change in pairs if concrete pricing is made authoritative.

**S16. Input validation stays on the server action**, not only in the wizard. Existing pattern: Zod, allowlist, discard client ids.

**S17. Privacy actions** (export and deletion requests) must not hard-delete auth users or orders from a client call. Deletion stays a queued request for an admin or a later job.

**S18. Idempotency.** Checkout retries reuse `idempotency_key`. Webhooks reuse provider event id. Never create a second order for the same key.

## 12. Optimization pacts

**O1. Do not load unbounded lists.** `getOrders`, `getMyListings`, review summaries, and admin lists need `limit`/`range` (keyset or page). Supabase `max_rows` is 1000; silent truncation will look like missing data.

**O2. Messages.** [lib/api/messages.ts](lib/api/messages.ts) loads every message for every thread id, then filters in JS. Replace with a latest-message query or a column maintained by the existing thread trigger, plus pagination inside a thread.

**O3. Indexes to add when touching browse or PDP (verify with `EXPLAIN` first):**

- unique or plain index on `marketplace_listings.slug` (PDP lookup).
- browse: `(is_active, category_id, created_at desc)` and/or seller + active.
- `ilike` on title will stay sequential until you add `pg_trgm` or a proper search column. Do not add `pg_trgm` casually; it is an extension decision.
- foreign keys that are missing indexes (orders by buyer and seller, lines by order, messages by thread) — confirm in migrations before duplicating.

**O4. Order numbers.** Replace daily `count(*) + 1` with a sequence or an insert retry. This is both correctness and lock contention.

**O5. Listing row locks** for stock (S4) must be short. No email, no HTTP, no PDF inside `place_order`.

**O6. PDP embed** in `getProductDetailFromListing` joins images, classes, spec, transport, category, and profile. That is acceptable for one product. Do not use that embed for marketplace cards. Cards stay on `getProductListItems`.

**O7. Caching.** Categories and public listing reads may use short-lived server cache keyed by filter. Do not cache user-specific orders, messages, or `get_my_profile`. Cart stays in `localStorage` (per browser, not synced). Geocode/route already have a client LRU in [lib/api/routing.ts](lib/api/routing.ts).

**O8. Client weight.** `calc-price.tsx` is a large client component. Do not import it on the marketplace list or PDP. Keep Leaflet behind the existing dynamic map import. Do not add a second pricing implementation “for performance”; fix the contract in section 7 instead of duplicating formulas.

**O9. N+1.** Account page already parallel-fetches. When adding a tab, add one query to that parallel batch, not a waterfall inside the tab on first paint, unless the tab is rarely opened (then lazy-fetch that tab only).

**O10. Images.** Storage is public-read. Serve explicit width where the UI allows; do not block checkout on image optimization.

**O11. Rate limits** for `/api/geocode` and `/api/route` are per server instance. They are not a global budget. Nominatim and public OSRM have their own usage policies; production should use a keyed provider or a self-hosted instance plus a shared limiter.

## 13. Finish-from-here work order

Do these in order. Do not start auctions or payouts before money and RLS writes are true.

1. **Decide the concrete price source of truth** and implement it. Recommended: keep `place_order` as the charge (DB unit price + a transport figure the server can recompute). Either pass distance and options into the RPC and price them with seller `supplier_settings` or listing tariffs, or stop presenting CIFA/POMPA defaults as the amount due. Wire `supplier_settings` only if the RPC uses the same numbers. POMPA material cost stays excluded until the user asks to include it.
2. **Stock decrement + row lock** inside `place_order`. Fix order-number races.
3. **Remove client unit-price fallback** on concrete.
4. **Stripe, if payments must be real:** add `@stripe/stripe-js` only if a client element is required; server SDK stays in route handlers. Flow already sketched in the cursor rule: create pending order via RPC, Checkout Session with `client_reference_id = order.id`, webhook verifies signature, definer RPC sets paid and writes `payments`. Until then leave mode `demo`. Update `winner-payment-block` only when a real URL exists. Connect payouts and saved cards stay seams until this works.
5. **Fulfillment RPC** for sellers (and admin), then replace `markOrderFulfilled`. Status check values already anticipated: pending, paid, fulfilled, cancelled, refunded — confirm the live CHECK constraint before writing new statuses. Demo orders use a demo payment status; do not pretend they are Stripe-paid.
6. **Reviews, threads, login_events** per S7–S9.
7. **Email recipient** per S10. Verified `RESEND_FROM`.
8. **Admin reads** of orders, users, payments through RLS-safe queries (admin policies already allow admin SELECT). Delete the artificial `delay()` stubs in [lib/api/admin.ts](lib/api/admin.ts).
9. **Pagination and indexes** (O1–O3) on the queries you just made real.
10. **Rewrite [docs/SECURITY.md](docs/SECURITY.md) and [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)** so they describe orders, `place_order`, materials, and demo pay — not auctions. The checklist file is entirely unchecked and omits checkout.
11. **Notifications:** replace console dispatch only after email recipient rules exist. Push and SMS are preference UI only.
12. **Auctions:** product decision. Either remove mock surfaces from home/nav or design new tables. Do not revive the deleted `place_bid` migration as-is.
13. **Commission:** implement the 10% `seller_assumes_transport` split only when the user asks. It is a comment, not behavior.
14. **Tests to add with the money change:** RPC-level or SQL tests are ideal; at minimum extend Vitest around snapshot display and any TS pricing you share with SQL. Do not snapshot CIFA defaults as the charged total unless the RPC uses those defaults on purpose.
15. **Base schema in repo:** export remote `profiles` / `categories` / `marketplace_listings` / `handle_new_user` into a migration or `supabase/schema` so a new environment can boot. `seed.sql` is referenced and absent.

## 14. Invariants an agent must not “clean up”

- Romanian UI strings. URLs stay English (`/cart`, `/checkout`, `/marketplace`) unless the user asks.
- One seller per cart.
- `calc-price.tsx` formulas, until the user asks. Wiring and labels may change if the math stays equivalent.
- Empty mock arrays in `calc-price.tsx` are intentional placeholders, not dead code to fill with guessed tariffs.
- Demo payments succeed without Stripe. Do not block checkout on Stripe.
- Email/PDF failure does not fail the order.
- No service role in application code.
- `seller_activated_at` is not `profiles.role`.
- Materials engine and SQL helpers stay paired.
- Concrete VRAC remains invalid.
- Equipment and services stay `BUC`.
- Cart is localStorage, not a DB table. Do not add a `carts` table unless the user asks for cross-device carts.
- `docs/SECURITY.md` auction sections are historical. Do not re-add those policies because the doc mentions them.

## 15. Vocabulary (Romanian → meaning)

- Anunț — listing. Magazin — marketplace. Coș — cart. Configurare comandă — pre-cart configure step. Finalizare comandă — checkout.
- Deviz — quote / pro-forma, not a fiscal invoice. CUI / CIF — company tax id. Persoană juridică — company buyer. Livrare vs facturare — delivery vs billing address.
- Cursă / curse — delivery trip(s). Transport asigurat — seller delivers (`seller_assumes_transport`). Ofertă manuală — transport not auto-priced. Propus platformă — marketplace-assigned vehicle when the seller stored none.
- Calare / calări — pump setup/climb fee. Furtun — hose. Taxă tub — CIFA tube fee. Macara — crane add-on.
- Licitație — auction (UI only). Vânzător / cumpărător — seller / buyer. Cont — account.

## 16. Known traps

- `20260422121000_place_bid_rpc.sql` does not define `place_bid`.
- `types/supabase.ts` comments around orders say the block is hand-extended. Blind `gen:types` can drop `place_order` typings.
- `public_profiles` in migrations may not include every column the app selects. If seller company name is null on PDP, check grants and the view before changing the query.
- Cart currency display is hardcoded RON in at least one cart summary even when a line is EUR.
- Merging a second add of the same `productId` drops the new configuration.
- Concrete `TON` opens VRAC.
- POMPA total excludes material.
- DEPOZIT never auto-prices transport.
- Admin and auction pages look finished and return empty data.
- `TESTING_CHECKLIST.md` is not evidence that tests passed.
- Geocode rate limit resets per lambda instance and can be bypassed by scaling out.
- Buyer confirmation email can be sent to any address typed at checkout.

End of brief. Schema horizon: migration `20260514120000_materials_logistics.sql`. App horizon: Next 16.1.6 / React 19.2.4 / Supabase JS 2.105.
