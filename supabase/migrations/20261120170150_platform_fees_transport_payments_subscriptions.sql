-- Platform money + logistics infrastructure (docs/AUDIT.md section 3e).
--   1. platform_settings: commission, VAT, payments mode, fees, TTLs, platform identity
--   2. listings: soft delete (partial unique slug), server-owned publish_paid_until, browse indexes
--   3. orders: commission + VAT split + proforma numbers + cancellation fields
--   4. order_transport + order_transport_events: transport state machine with audit log
--   5. payment_intents + provider-agnostic payment RPCs (webhook secret in private schema)
--   6. subscription_plans + seller_subscriptions + listing publication gate
-- Every write path is a SECURITY DEFINER RPC that checks auth.uid() / is_admin().

-- ---------------------------------------------------------------- 1. settings
create table if not exists public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  commission_rate numeric(6,4) not null default 0.10 check (commission_rate >= 0 and commission_rate <= 0.5),
  commission_on_transport boolean not null default false,
  vat_rate numeric(6,4) not null default 0.19 check (vat_rate >= 0 and vat_rate <= 0.3),
  payments_mode text not null default 'demo' check (payments_mode in ('demo', 'live')),
  listing_fees_enabled boolean not null default false,
  listing_fee_cents bigint not null default 0 check (listing_fee_cents >= 0),
  listing_fee_days integer not null default 30 check (listing_fee_days between 1 and 365),
  subscriptions_enabled boolean not null default false,
  transport_quote_ttl_hours integer not null default 24 check (transport_quote_ttl_hours between 1 and 720),
  unpaid_order_ttl_hours integer not null default 72 check (unpaid_order_ttl_hours between 1 and 720),
  proforma_due_days integer not null default 5 check (proforma_due_days between 0 and 90),
  platform_identity jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
comment on table public.platform_settings is
  'Single-row platform configuration. Read by everyone (prices shown include commission); admin-only update.';
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
alter table public.platform_settings force row level security;
drop policy if exists platform_settings_read on public.platform_settings;
create policy platform_settings_read on public.platform_settings
  for select to anon, authenticated using (true);
drop policy if exists platform_settings_admin_update on public.platform_settings;
create policy platform_settings_admin_update on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete, truncate on public.platform_settings from anon, authenticated;

drop trigger if exists touch_updated_at on public.platform_settings;
create trigger touch_updated_at before update on public.platform_settings
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------- 2. listings
alter table public.marketplace_listings
  add column if not exists deleted_at timestamptz,
  add column if not exists publish_paid_until timestamptz;
comment on column public.marketplace_listings.deleted_at is
  'Soft delete. Row stays for order history; slug is free again (partial unique index).';
comment on column public.marketplace_listings.publish_paid_until is
  'Server-owned: set only by a successful listing_fee payment. Clients cannot write it.';

alter table public.marketplace_listings drop constraint if exists marketplace_listings_slug_key;
create unique index if not exists marketplace_listings_slug_live_uniq
  on public.marketplace_listings (slug) where deleted_at is null;
create index if not exists marketplace_listings_browse_idx
  on public.marketplace_listings (listing_type, created_at desc) where is_active and deleted_at is null;
create index if not exists marketplace_listings_seller_live_idx
  on public.marketplace_listings (seller_id, created_at desc) where deleted_at is null;

drop policy if exists listings_select_public_or_owner on public.marketplace_listings;
create policy listings_select_public_or_owner on public.marketplace_listings
  for select to anon, authenticated
  using (
    (deleted_at is null and (is_active = true or ((select auth.uid()) is not null and seller_id = (select auth.uid()))))
    or public.is_admin()
  );

-- Guard: no undelete by owners, deleted rows are never active, publish_paid_until is server-owned.
create or replace function public.tg_listings_a_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.publish_paid_until := null;
      new.deleted_at := null;
    else
      new.publish_paid_until := old.publish_paid_until;
      if old.deleted_at is not null and new.deleted_at is null and not public.is_admin() then
        raise exception 'listing is deleted' using errcode = '42501';
      end if;
    end if;
  end if;
  if new.deleted_at is not null then
    new.is_active := false;
  end if;
  return new;
end;
$$;
drop trigger if exists listings_a_guard on public.marketplace_listings;
create trigger listings_a_guard before insert or update on public.marketplace_listings
  for each row execute function public.tg_listings_a_guard();

-- ---------------------------------------------------------------- 3. orders
alter table public.orders
  add column if not exists commission_rate numeric(6,4) not null default 0,
  add column if not exists commission_cents bigint not null default 0,
  add column if not exists seller_vat_cents bigint not null default 0,
  add column if not exists platform_vat_cents bigint not null default 0,
  add column if not exists vat_rate numeric(6,4),
  add column if not exists platform_doc_number text,
  add column if not exists payment_due_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;
alter table public.orders drop constraint if exists orders_commission_nonneg;
alter table public.orders add constraint orders_commission_nonneg check (commission_cents >= 0);
create unique index if not exists orders_platform_doc_number_key on public.orders (platform_doc_number) where platform_doc_number is not null;

-- Existing orders: no commission, all VAT was the seller's.
update public.orders set seller_vat_cents = vat_cents, vat_rate = 0.19 where vat_rate is null;

alter table public.order_lines add column if not exists commission_cents bigint not null default 0;

alter table public.orders drop constraint if exists orders_payment_status_enum;
alter table public.orders add constraint orders_payment_status_enum
  check (payment_status in ('pending', 'demo_paid', 'paid', 'failed', 'refund_pending', 'refunded'));
alter table public.orders drop constraint if exists orders_payment_provider_enum;
alter table public.orders add constraint orders_payment_provider_enum
  check (payment_provider in ('demo', 'stripe', 'netopia', 'euplatesc', 'revolut', 'other'));
-- Idempotency keys are unique per buyer (orders_idempotency_per_buyer_idx); a global
-- unique made two buyers' keys collide.
alter table public.orders drop constraint if exists orders_idempotency_key_key;

-- ---------------------------------------------------------------- 4. transport state machine
create table if not exists public.order_transport (
  order_id uuid primary key references public.orders (id) on delete cascade,
  mode text not null check (mode in ('seller', 'platform', 'tanker_manual')),
  status text not null check (status in (
    'included', 'scheduled', 'awaiting_quote', 'quoted', 'accepted', 'declined', 'expired',
    'assigned', 'in_transit', 'delivered', 'failed', 'cancelled'
  )),
  quote_cents bigint check (quote_cents is null or quote_cents >= 0),
  quote_vat_cents bigint check (quote_vat_cents is null or quote_vat_cents >= 0),
  quote_note text,
  quoted_at timestamptz,
  quote_expires_at timestamptz,
  quoted_by uuid,
  accepted_at timestamptz,
  paid boolean not null default false,
  carrier_name text,
  carrier_phone text,
  scheduled_for date,
  delivered_at timestamptz,
  failure_reason text,
  requote_count integer not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.order_transport is
  'One row per order. Writes only via transport_transition / cancel_order / place_order.';
create index if not exists order_transport_status_idx on public.order_transport (status, quote_expires_at);

create table if not exists public.order_transport_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  actor_id uuid,
  actor_role text not null,
  note text,
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_transport_events_order_idx on public.order_transport_events (order_id, created_at);

alter table public.order_transport enable row level security;
alter table public.order_transport force row level security;
alter table public.order_transport_events enable row level security;
alter table public.order_transport_events force row level security;
drop policy if exists order_transport_select_member on public.order_transport;
create policy order_transport_select_member on public.order_transport for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
    and ((select auth.uid()) in (o.buyer_id, o.seller_id) or public.is_admin())));
drop policy if exists order_transport_events_select_member on public.order_transport_events;
create policy order_transport_events_select_member on public.order_transport_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
    and ((select auth.uid()) in (o.buyer_id, o.seller_id) or public.is_admin())));
revoke insert, update, delete, truncate on public.order_transport, public.order_transport_events from anon, authenticated;

-- ---------------------------------------------------------------- 5. payments
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  secret_hash bytea not null,
  updated_at timestamptz not null default now()
);

-- Run once in the SQL editor (never from the app):
--   select private.set_secret('payments_webhook', '<same value as PAYMENTS_WEBHOOK_DB_SECRET>');
create or replace function private.set_secret(p_name text, p_plaintext text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.app_secrets (name, secret_hash)
  values (p_name, extensions.digest(p_plaintext, 'sha256'))
  on conflict (name) do update set secret_hash = excluded.secret_hash, updated_at = now();
$$;

create or replace function private.check_secret(p_name text, p_plaintext text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.app_secrets
    where name = p_name and secret_hash = extensions.digest(coalesce(p_plaintext, ''), 'sha256')
  );
$$;
revoke all on function private.set_secret(text, text) from public, anon, authenticated;
revoke all on function private.check_secret(text, text) from public, anon, authenticated;

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('order', 'transport', 'subscription', 'listing_fee')),
  order_id uuid references public.orders (id) on delete restrict,
  subscription_id uuid,
  listing_id bigint references public.marketplace_listings (id) on delete set null,
  payer_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency in ('RON', 'EUR')),
  provider text not null check (provider in ('demo', 'stripe', 'netopia', 'euplatesc', 'revolut', 'other')),
  provider_ref text,
  checkout_url text,
  status text not null default 'created'
    check (status in ('created', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payment_intents_provider_ref_key
  on public.payment_intents (provider, provider_ref) where provider_ref is not null;
create index if not exists payment_intents_payer_idx on public.payment_intents (payer_id, created_at desc);
create index if not exists payment_intents_order_idx on public.payment_intents (order_id) where order_id is not null;

alter table public.payment_intents enable row level security;
alter table public.payment_intents force row level security;
drop policy if exists payment_intents_select_payer on public.payment_intents;
create policy payment_intents_select_payer on public.payment_intents for select to authenticated
  using (payer_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete, truncate on public.payment_intents from anon, authenticated;

alter table public.payments alter column order_id drop not null;
alter table public.payments add column if not exists intent_id uuid references public.payment_intents (id);
create index if not exists payments_intent_idx on public.payments (intent_id) where intent_id is not null;
alter table public.payments drop constraint if exists payments_provider_enum;
alter table public.payments add constraint payments_provider_enum
  check (provider in ('demo', 'stripe', 'netopia', 'euplatesc', 'revolut', 'other'));
drop policy if exists payments_select_intent_payer on public.payments;
create policy payments_select_intent_payer on public.payments for select to authenticated
  using (exists (select 1 from public.payment_intents i where i.id = intent_id
    and (i.payer_id = (select auth.uid()) or public.is_admin())));

-- ---------------------------------------------------------------- 6. subscriptions
create table if not exists public.subscription_plans (
  code text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  description text,
  price_cents bigint not null check (price_cents >= 0),
  currency text not null default 'RON' check (currency in ('RON', 'EUR')),
  interval_months integer not null default 1 check (interval_months in (1, 3, 6, 12)),
  max_active_listings integer check (max_active_listings is null or max_active_listings > 0),
  includes_listing_fees boolean not null default true,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;
drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists subscription_plans_admin_write on public.subscription_plans;
create policy subscription_plans_admin_write on public.subscription_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.seller_subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  plan_code text not null references public.subscription_plans (code),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists seller_subscriptions_one_live
  on public.seller_subscriptions (seller_id) where status in ('active', 'past_due');
create index if not exists seller_subscriptions_seller_idx on public.seller_subscriptions (seller_id, created_at desc);
alter table public.seller_subscriptions enable row level security;
alter table public.seller_subscriptions force row level security;
drop policy if exists seller_subscriptions_select_own on public.seller_subscriptions;
create policy seller_subscriptions_select_own on public.seller_subscriptions for select to authenticated
  using (seller_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete, truncate on public.seller_subscriptions from anon, authenticated;

alter table public.payment_intents drop constraint if exists payment_intents_subscription_fk;
alter table public.payment_intents add constraint payment_intents_subscription_fk
  foreign key (subscription_id) references public.seller_subscriptions (id) on delete set null;

-- Publication gate: listing limits per plan and pay-per-post. Off until enabled in settings.
create or replace function public.tg_listings_b_publication_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.platform_settings%rowtype;
  v_plan text;
  v_max integer;
  v_incl boolean;
  v_count integer;
begin
  if not new.is_active or new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and old.is_active and old.deleted_at is null then return new; end if;
  if public.is_admin() then return new; end if;

  select * into s from public.platform_settings where id = 1;
  if not s.subscriptions_enabled and not s.listing_fees_enabled then return new; end if;

  select p.code, p.max_active_listings, p.includes_listing_fees
  into v_plan, v_max, v_incl
  from public.seller_subscriptions ss
  join public.subscription_plans p on p.code = ss.plan_code
  where ss.seller_id = new.seller_id and ss.status = 'active' and ss.current_period_end > now()
  limit 1;

  if s.subscriptions_enabled and v_plan is not null and v_max is not null then
    select count(*) into v_count from public.marketplace_listings
    where seller_id = new.seller_id and is_active and deleted_at is null and id <> new.id;
    if v_count >= v_max then
      raise exception 'active listing limit reached' using errcode = 'P0001';
    end if;
  end if;

  if s.listing_fees_enabled and s.listing_fee_cents > 0
     and not (v_plan is not null and coalesce(v_incl, false))
     and (new.publish_paid_until is null or new.publish_paid_until < now()) then
    raise exception 'listing fee required' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists listings_b_publication_gate on public.marketplace_listings;
create trigger listings_b_publication_gate before insert or update on public.marketplace_listings
  for each row execute function public.tg_listings_b_publication_gate();
revoke all on function public.tg_listings_b_publication_gate() from public, anon, authenticated;

-- ---------------------------------------------------------------- RPCs: transport
create or replace function public._log_transport_event(
  p_order_id uuid, p_from text, p_to text, p_action text, p_role text, p_note text, p_data jsonb
) returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.order_transport_events (order_id, from_status, to_status, action, actor_id, actor_role, note, data)
  values (p_order_id, p_from, p_to, p_action, auth.uid(), p_role, p_note, p_data);
$$;

-- Transport transitions. Allowed moves (mode / from -> to / who):
--   seller mode:   included|failed -> scheduled (seller, admin) ; included|scheduled -> in_transit (seller, admin)
--   platform/tanker: awaiting_quote -> quoted (admin) ; quoted -> accepted|declined (buyer)
--                  declined|expired -> awaiting_quote (buyer, max 3 re-quotes)
--                  accepted|failed -> assigned (admin; live payments require transport paid)
--                  assigned -> in_transit (admin)
--   any mode:      in_transit|scheduled|assigned -> delivered (buyer, seller in seller mode, admin)
--                  non-final -> failed (seller in seller mode, admin, buyer with reason)
-- Final states: delivered, cancelled (cancel via cancel_order).
create or replace function public.transport_transition(p_order_id uuid, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  o public.orders%rowtype;
  t public.order_transport%rowtype;
  s public.platform_settings%rowtype;
  v_role text;
  v_to text;
  v_note text := nullif(trim(coalesce(p_data->>'note', '')), '');
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found' using errcode = '22023'; end if;
  select * into t from public.order_transport where order_id = p_order_id for update;
  if not found then raise exception 'order has no transport record' using errcode = '22023'; end if;
  select * into s from public.platform_settings where id = 1;

  v_role := case
    when public.is_admin() then 'admin'
    when v_uid = o.seller_id then 'seller'
    when v_uid = o.buyer_id then 'buyer'
    else null end;
  if v_role is null then raise exception 'not a party to this order' using errcode = '42501'; end if;
  if o.status = 'cancelled' or t.status in ('delivered', 'cancelled') then
    raise exception 'transport is closed (%)', t.status using errcode = '22023';
  end if;

  -- Lazy expiry so an old quote can never be accepted.
  if t.status = 'quoted' and t.quote_expires_at is not null and t.quote_expires_at < now() then
    update public.order_transport set status = 'expired', updated_at = now() where order_id = p_order_id;
    perform public._log_transport_event(p_order_id, 'quoted', 'expired', 'auto_expire', 'system', null, null);
    t.status := 'expired';
  end if;

  if p_action = 'quote' then
    if v_role <> 'admin' or t.mode = 'seller' or t.status <> 'awaiting_quote' then
      raise exception 'quote not allowed' using errcode = '42501';
    end if;
    if (p_data->>'amount_cents') is null or (p_data->>'amount_cents')::bigint <= 0 then
      raise exception 'quote amount required' using errcode = '22023';
    end if;
    v_to := 'quoted';
    update public.order_transport set
      status = v_to,
      quote_cents = (p_data->>'amount_cents')::bigint,
      quote_vat_cents = round((p_data->>'amount_cents')::bigint * s.vat_rate)::bigint,
      quote_note = v_note,
      quoted_at = now(),
      quote_expires_at = now() + make_interval(hours => s.transport_quote_ttl_hours),
      quoted_by = v_uid,
      updated_at = now()
    where order_id = p_order_id;

  elsif p_action in ('accept', 'decline') then
    if v_role <> 'buyer' or t.status <> 'quoted' then
      raise exception '% not allowed (status %)', p_action, t.status using errcode = '42501';
    end if;
    v_to := case p_action when 'accept' then 'accepted' else 'declined' end;
    update public.order_transport set status = v_to,
      accepted_at = case when v_to = 'accepted' then now() else accepted_at end,
      updated_at = now()
    where order_id = p_order_id;

  elsif p_action = 'request_requote' then
    if v_role not in ('buyer', 'admin') or t.status not in ('declined', 'expired') then
      raise exception 'requote not allowed' using errcode = '42501';
    end if;
    if t.requote_count >= 3 and v_role <> 'admin' then
      raise exception 'requote limit reached' using errcode = '22023';
    end if;
    v_to := 'awaiting_quote';
    update public.order_transport set status = v_to, requote_count = requote_count + 1,
      quote_cents = null, quote_vat_cents = null, quote_expires_at = null, updated_at = now()
    where order_id = p_order_id;

  elsif p_action = 'schedule' then
    if t.mode <> 'seller' or v_role not in ('seller', 'admin') or t.status not in ('included', 'failed') then
      raise exception 'schedule not allowed' using errcode = '42501';
    end if;
    v_to := 'scheduled';
    update public.order_transport set status = v_to,
      scheduled_for = nullif(p_data->>'scheduled_for', '')::date,
      carrier_name = coalesce(nullif(p_data->>'carrier_name', ''), carrier_name),
      carrier_phone = coalesce(nullif(p_data->>'carrier_phone', ''), carrier_phone),
      failure_reason = null, updated_at = now()
    where order_id = p_order_id;

  elsif p_action = 'assign' then
    if t.mode = 'seller' or v_role <> 'admin' or t.status not in ('accepted', 'failed') then
      raise exception 'assign not allowed' using errcode = '42501';
    end if;
    if s.payments_mode = 'live' and not t.paid then
      raise exception 'transport not paid' using errcode = '22023';
    end if;
    if nullif(p_data->>'carrier_name', '') is null then
      raise exception 'carrier_name required' using errcode = '22023';
    end if;
    v_to := 'assigned';
    update public.order_transport set status = v_to,
      carrier_name = p_data->>'carrier_name',
      carrier_phone = nullif(p_data->>'carrier_phone', ''),
      scheduled_for = nullif(p_data->>'scheduled_for', '')::date,
      failure_reason = null, updated_at = now()
    where order_id = p_order_id;

  elsif p_action = 'mark_in_transit' then
    if not (
      (t.mode = 'seller' and v_role in ('seller', 'admin') and t.status in ('included', 'scheduled'))
      or (t.mode <> 'seller' and v_role = 'admin' and t.status = 'assigned')
    ) then
      raise exception 'mark_in_transit not allowed' using errcode = '42501';
    end if;
    v_to := 'in_transit';
    update public.order_transport set status = v_to, updated_at = now() where order_id = p_order_id;

  elsif p_action = 'confirm_delivery' then
    if t.status not in ('in_transit', 'scheduled', 'assigned')
       or not (v_role in ('buyer', 'admin') or (v_role = 'seller' and t.mode = 'seller')) then
      raise exception 'confirm_delivery not allowed' using errcode = '42501';
    end if;
    v_to := 'delivered';
    update public.order_transport set status = v_to, delivered_at = now(), updated_at = now()
    where order_id = p_order_id;
    update public.orders set status = 'fulfilled', updated_at = now()
    where id = p_order_id and payment_status in ('paid', 'demo_paid') and status in ('pending', 'paid');

  elsif p_action = 'report_failure' then
    if v_note is null then raise exception 'reason required' using errcode = '22023'; end if;
    if t.status in ('awaiting_quote', 'quoted', 'declined', 'expired')
       or (v_role = 'seller' and t.mode <> 'seller') then
      raise exception 'report_failure not allowed' using errcode = '42501';
    end if;
    v_to := 'failed';
    update public.order_transport set status = v_to, failure_reason = v_note, updated_at = now()
    where order_id = p_order_id;

  else
    raise exception 'unknown action %', p_action using errcode = '22023';
  end if;

  perform public._log_transport_event(p_order_id, t.status, v_to, p_action, v_role, v_note, p_data - 'note');
  return (select to_jsonb(x) from public.order_transport x where x.order_id = p_order_id);
end;
$$;

-- Cancel: buyer before shipping or while transport is unpriced; seller before shipping;
-- admin any time before delivery. Restores stock, cancels open payment intents.
create or replace function public.cancel_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  o public.orders%rowtype;
  t public.order_transport%rowtype;
  v_role text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_uid is null and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order not found' using errcode = '22023'; end if;
  select * into t from public.order_transport where order_id = p_order_id for update;

  v_role := case
    when v_uid is null then 'system'
    when public.is_admin() then 'admin'
    when v_uid = o.seller_id then 'seller'
    when v_uid = o.buyer_id then 'buyer'
    else null end;
  if v_role is null then raise exception 'not a party to this order' using errcode = '42501'; end if;
  if o.status in ('cancelled', 'fulfilled', 'refunded') then
    raise exception 'order already closed (%)', o.status using errcode = '22023';
  end if;
  if v_reason is null then raise exception 'reason required' using errcode = '22023'; end if;
  if t.status in ('in_transit', 'delivered') and v_role not in ('admin', 'system') then
    raise exception 'order already shipped' using errcode = '22023';
  end if;
  if v_role in ('buyer', 'seller')
     and coalesce(t.status, 'included') not in ('included', 'scheduled', 'awaiting_quote', 'quoted', 'declined', 'expired', 'failed') then
    raise exception 'cancel not allowed at transport status %', t.status using errcode = '42501';
  end if;

  update public.marketplace_listings ml
  set available_qty = ml.available_qty + l.qty
  from public.order_lines l
  where l.order_id = p_order_id and l.listing_id = ml.id;

  update public.orders set
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = v_role || ': ' || v_reason,
    payment_status = case payment_status
      when 'paid' then 'refund_pending'
      when 'pending' then 'failed'
      else payment_status end,
    updated_at = now()
  where id = p_order_id;

  update public.payment_intents set status = 'cancelled', updated_at = now()
  where order_id = p_order_id and status in ('created', 'pending');

  if found or t.order_id is not null then
    update public.order_transport set status = 'cancelled', updated_at = now() where order_id = p_order_id;
    perform public._log_transport_event(p_order_id, t.status, 'cancelled', 'cancel_order', v_role, v_reason,
      jsonb_build_object('transport_paid', coalesce(t.paid, false)));
  end if;

  return public._build_order_payload(p_order_id);
end;
$$;

-- ---------------------------------------------------------------- RPCs: payments
-- Amount is always computed here from DB rows; the client only names what it pays for.
create or replace function public.create_payment_intent(p_purpose text, p_ref text, p_provider text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  s public.platform_settings%rowtype;
  v_provider text;
  v_amount bigint;
  v_currency text := 'RON';
  v_order uuid;
  v_sub uuid;
  v_listing bigint;
  o public.orders%rowtype;
  t public.order_transport%rowtype;
  p public.subscription_plans%rowtype;
  ml public.marketplace_listings%rowtype;
  i public.payment_intents%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select * into s from public.platform_settings where id = 1;
  v_provider := case when s.payments_mode = 'demo' then 'demo' else lower(nullif(trim(coalesce(p_provider, '')), '')) end;
  if v_provider is null or v_provider not in ('demo', 'stripe', 'netopia', 'euplatesc', 'revolut', 'other') then
    raise exception 'payment provider not configured' using errcode = '22023';
  end if;
  if s.payments_mode = 'live' and v_provider = 'demo' then
    raise exception 'demo provider disabled in live mode' using errcode = '22023';
  end if;

  if p_purpose = 'order' then
    select * into o from public.orders where id = p_ref::uuid for update;
    if not found or o.buyer_id <> v_uid then raise exception 'order not found' using errcode = '22023'; end if;
    if o.status = 'cancelled' or o.payment_status in ('paid', 'demo_paid', 'refund_pending', 'refunded') then
      raise exception 'order not payable (%)', o.payment_status using errcode = '22023';
    end if;
    v_order := o.id; v_amount := o.total_cents; v_currency := o.currency;

  elsif p_purpose = 'transport' then
    select * into o from public.orders where id = p_ref::uuid;
    if not found or o.buyer_id <> v_uid then raise exception 'order not found' using errcode = '22023'; end if;
    select * into t from public.order_transport where order_id = o.id for update;
    if not found or t.status <> 'accepted' or t.paid then
      raise exception 'transport not payable' using errcode = '22023';
    end if;
    v_order := o.id; v_amount := t.quote_cents + coalesce(t.quote_vat_cents, 0); v_currency := o.currency;

  elsif p_purpose = 'subscription' then
    if not s.subscriptions_enabled then raise exception 'subscriptions disabled' using errcode = '22023'; end if;
    select * into p from public.subscription_plans where code = p_ref and is_active;
    if not found then raise exception 'plan not found' using errcode = '22023'; end if;
    if p.price_cents <= 0 then raise exception 'plan has no price' using errcode = '22023'; end if;
    if not exists (select 1 from public.profiles where id = v_uid and seller_activated_at is not null) then
      raise exception 'seller account required' using errcode = '42501';
    end if;
    -- Renew the live subscription for the same plan, else reuse/create a pending one.
    select id into v_sub from public.seller_subscriptions
    where seller_id = v_uid and plan_code = p.code and status in ('active', 'past_due') limit 1;
    if v_sub is null then
      select id into v_sub from public.seller_subscriptions
      where seller_id = v_uid and plan_code = p.code and status = 'pending' order by created_at desc limit 1;
    end if;
    if v_sub is null then
      insert into public.seller_subscriptions (seller_id, plan_code) values (v_uid, p.code) returning id into v_sub;
    end if;
    v_amount := p.price_cents; v_currency := p.currency;

  elsif p_purpose = 'listing_fee' then
    if not s.listing_fees_enabled or s.listing_fee_cents <= 0 then
      raise exception 'listing fees disabled' using errcode = '22023';
    end if;
    select * into ml from public.marketplace_listings where id = p_ref::bigint;
    if not found or ml.seller_id <> v_uid or ml.deleted_at is not null then
      raise exception 'listing not found' using errcode = '22023';
    end if;
    v_listing := ml.id; v_amount := s.listing_fee_cents; v_currency := 'RON';

  else
    raise exception 'unknown purpose %', p_purpose using errcode = '22023';
  end if;

  -- Idempotent: reuse an open intent with the same target, provider and amount.
  select * into i from public.payment_intents
  where payer_id = v_uid and purpose = p_purpose and status in ('created', 'pending')
    and order_id is not distinct from v_order and subscription_id is not distinct from v_sub
    and listing_id is not distinct from v_listing
  order by created_at desc limit 1
  for update;
  if found then
    if i.provider = v_provider and i.amount_cents = v_amount and i.currency = v_currency then
      return to_jsonb(i);
    end if;
    update public.payment_intents set status = 'cancelled', failure_reason = 'superseded', updated_at = now()
    where id = i.id;
  end if;

  insert into public.payment_intents (purpose, order_id, subscription_id, listing_id, payer_id, amount_cents, currency, provider)
  values (p_purpose, v_order, v_sub, v_listing, v_uid, v_amount, v_currency, v_provider)
  returning * into i;
  return to_jsonb(i);
end;
$$;

create or replace function public.attach_payment_session(p_intent_id uuid, p_provider_ref text, p_checkout_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.payment_intents%rowtype;
begin
  select * into i from public.payment_intents where id = p_intent_id for update;
  if not found or i.payer_id <> auth.uid() then raise exception 'intent not found' using errcode = '22023'; end if;
  if i.status not in ('created', 'pending') then raise exception 'intent closed' using errcode = '22023'; end if;
  update public.payment_intents set
    provider_ref = nullif(p_provider_ref, ''),
    checkout_url = nullif(p_checkout_url, ''),
    status = 'pending',
    updated_at = now()
  where id = p_intent_id
  returning * into i;
  return to_jsonb(i);
end;
$$;

-- Internal: effects of a succeeded intent. Never callable by clients.
create or replace function public._apply_intent_success(p_intent_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.payment_intents%rowtype;
  s public.platform_settings%rowtype;
  sub public.seller_subscriptions%rowtype;
  v_months integer;
begin
  select * into i from public.payment_intents where id = p_intent_id;
  select * into s from public.platform_settings where id = 1;

  if i.purpose = 'order' then
    update public.orders set payment_status = 'paid',
      status = case when status = 'pending' then 'paid' else status end,
      payment_provider = i.provider, updated_at = now()
    where id = i.order_id and status <> 'cancelled';

  elsif i.purpose = 'transport' then
    update public.order_transport set paid = true, updated_at = now() where order_id = i.order_id;
    insert into public.order_transport_events (order_id, from_status, to_status, action, actor_id, actor_role, note, data)
    select i.order_id, t.status, t.status, 'transport_paid', i.payer_id, 'system', null,
           jsonb_build_object('intent_id', i.id, 'amount_cents', i.amount_cents)
    from public.order_transport t where t.order_id = i.order_id;

  elsif i.purpose = 'subscription' then
    select * into sub from public.seller_subscriptions where id = i.subscription_id for update;
    select interval_months into v_months from public.subscription_plans where code = sub.plan_code;
    if sub.status in ('active', 'past_due') then
      update public.seller_subscriptions set status = 'active',
        current_period_end = greatest(coalesce(current_period_end, now()), now()) + make_interval(months => v_months),
        updated_at = now()
      where id = sub.id;
    else
      -- Plan change: close any other live subscription first (one live per seller).
      update public.seller_subscriptions set status = 'cancelled', updated_at = now()
      where seller_id = sub.seller_id and id <> sub.id and status in ('active', 'past_due');
      update public.seller_subscriptions set status = 'active',
        current_period_start = now(),
        current_period_end = now() + make_interval(months => v_months),
        cancel_at_period_end = false,
        updated_at = now()
      where id = sub.id;
    end if;

  elsif i.purpose = 'listing_fee' then
    update public.marketplace_listings set
      publish_paid_until = greatest(coalesce(publish_paid_until, now()), now()) + make_interval(days => s.listing_fee_days)
    where id = i.listing_id;
  end if;
end;
$$;

-- Webhook entry point. The Next.js webhook route verifies the provider signature,
-- then calls this with the shared DB secret (no service-role key in the app).
-- Idempotent on provider event id; amount/currency must match the intent.
create or replace function public.record_payment_event(
  p_secret text,
  p_provider text,
  p_event_id text,
  p_intent_id uuid,
  p_provider_ref text,
  p_status text,
  p_amount_cents bigint,
  p_currency text,
  p_raw jsonb
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.payment_intents%rowtype;
  v_event text := lower(p_provider) || ':' || p_event_id;
  v_pay_status text;
begin
  if not private.check_secret('payments_webhook', p_secret) then
    raise exception 'invalid webhook secret' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'succeeded', 'failed', 'cancelled', 'refunded') then
    raise exception 'invalid status %', p_status using errcode = '22023';
  end if;
  if exists (select 1 from public.payments where provider_event_id = v_event) then
    return 'duplicate';
  end if;

  if p_intent_id is not null then
    select * into i from public.payment_intents where id = p_intent_id for update;
  else
    select * into i from public.payment_intents where provider = lower(p_provider) and provider_ref = p_provider_ref for update;
  end if;

  v_pay_status := case p_status when 'succeeded' then 'paid' when 'refunded' then 'refunded'
    when 'pending' then 'pending' else 'failed' end;
  insert into public.payments (order_id, intent_id, provider, provider_event_id, amount_cents, status, raw_json)
  values (i.order_id, i.id, lower(p_provider), v_event, greatest(coalesce(p_amount_cents, 0), 0), v_pay_status, p_raw);

  if i.id is null then return 'unknown_intent'; end if;
  if lower(p_provider) <> i.provider then return 'provider_mismatch'; end if;

  if p_status = 'succeeded' then
    if i.status = 'succeeded' then return 'already_applied'; end if;
    if p_amount_cents is distinct from i.amount_cents or upper(coalesce(p_currency, '')) <> i.currency then
      update public.payment_intents set status = 'failed', failure_reason = 'amount_mismatch', updated_at = now()
      where id = i.id;
      return 'amount_mismatch';
    end if;
    update public.payment_intents set status = 'succeeded', failure_reason = null, updated_at = now() where id = i.id;
    perform public._apply_intent_success(i.id);
  elsif p_status = 'refunded' then
    update public.payment_intents set status = 'refunded', updated_at = now() where id = i.id;
    if i.purpose = 'order' then
      update public.orders set payment_status = 'refunded', updated_at = now() where id = i.order_id;
    end if;
  elsif p_status in ('failed', 'cancelled') and i.status in ('created', 'pending') then
    update public.payment_intents set status = p_status, failure_reason = left(coalesce(p_raw->>'reason', p_status), 200),
      updated_at = now()
    where id = i.id;
  end if;
  return 'ok';
end;
$$;

-- Demo provider: the payer completes their own intent. Only while payments_mode = 'demo'.
create or replace function public.demo_complete_payment(p_intent_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  i public.payment_intents%rowtype;
begin
  if (select payments_mode from public.platform_settings where id = 1) <> 'demo' then
    raise exception 'demo payments disabled' using errcode = '42501';
  end if;
  select * into i from public.payment_intents where id = p_intent_id for update;
  if not found or i.payer_id <> auth.uid() or i.provider <> 'demo' then
    raise exception 'intent not found' using errcode = '22023';
  end if;
  if i.status not in ('created', 'pending') then raise exception 'intent closed' using errcode = '22023'; end if;
  update public.payment_intents set status = 'succeeded', updated_at = now() where id = i.id;
  insert into public.payments (order_id, intent_id, provider, provider_event_id, amount_cents, status, raw_json)
  values (i.order_id, i.id, 'demo', 'demo:' || i.id, i.amount_cents, 'demo_paid', jsonb_build_object('mode', 'demo'));
  perform public._apply_intent_success(i.id);
  return (select to_jsonb(x) from public.payment_intents x where x.id = i.id);
end;
$$;

create or replace function public.cancel_subscription(p_subscription_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  sub public.seller_subscriptions%rowtype;
begin
  select * into sub from public.seller_subscriptions where id = p_subscription_id for update;
  if not found or (sub.seller_id <> auth.uid() and not public.is_admin()) then
    raise exception 'subscription not found' using errcode = '22023';
  end if;
  if sub.status = 'pending' then
    update public.seller_subscriptions set status = 'cancelled', updated_at = now() where id = sub.id;
  else
    update public.seller_subscriptions set cancel_at_period_end = true, updated_at = now() where id = sub.id;
  end if;
  return (select to_jsonb(x) from public.seller_subscriptions x where x.id = sub.id);
end;
$$;

-- Time-based cleanup. Schedule with pg_cron (not installed yet) or call as admin.
create or replace function public.run_platform_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.platform_settings%rowtype;
  r record;
  v_quotes integer := 0;
  v_orders integer := 0;
  v_subs integer := 0;
  v_listings integer := 0;
begin
  if current_user not in ('postgres', 'supabase_admin') and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select * into s from public.platform_settings where id = 1;

  for r in select order_id from public.order_transport where status = 'quoted' and quote_expires_at < now() loop
    update public.order_transport set status = 'expired', updated_at = now() where order_id = r.order_id;
    perform public._log_transport_event(r.order_id, 'quoted', 'expired', 'auto_expire', 'system', null, null);
    v_quotes := v_quotes + 1;
  end loop;

  if s.payments_mode = 'live' then
    for r in select id from public.orders
             where payment_status = 'pending' and status = 'pending'
               and created_at < now() - make_interval(hours => s.unpaid_order_ttl_hours) loop
      perform public.cancel_order(r.id, 'neplatita in termen');
      v_orders := v_orders + 1;
    end loop;
  end if;

  update public.seller_subscriptions set
    status = case when cancel_at_period_end then 'cancelled' else 'expired' end, updated_at = now()
  where status in ('active', 'past_due') and current_period_end < now();
  get diagnostics v_subs = row_count;

  if s.listing_fees_enabled then
    update public.marketplace_listings ml set is_active = false
    where ml.is_active and ml.deleted_at is null
      and (ml.publish_paid_until is null or ml.publish_paid_until < now())
      and not exists (
        select 1 from public.seller_subscriptions ss join public.subscription_plans p on p.code = ss.plan_code
        where ss.seller_id = ml.seller_id and ss.status = 'active' and ss.current_period_end > now() and p.includes_listing_fees
      );
    get diagnostics v_listings = row_count;
  end if;

  return jsonb_build_object('quotes_expired', v_quotes, 'orders_cancelled', v_orders,
    'subscriptions_closed', v_subs, 'listings_unpublished', v_listings);
end;
$$;

-- ---------------------------------------------------------------- order payload
create or replace function public._build_order_payload(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  select to_jsonb(o) || jsonb_build_object(
    'lines', coalesce((select jsonb_agg(to_jsonb(ol) order by ol.id) from public.order_lines ol where ol.order_id = o.id), '[]'::jsonb),
    'payment', (select to_jsonb(p) from public.payments p where p.order_id = o.id order by p.created_at desc limit 1),
    'transport', (select to_jsonb(t) from public.order_transport t where t.order_id = o.id),
    'transport_events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at)
      from public.order_transport_events e where e.order_id = o.id), '[]'::jsonb)
  )
  into v_payload
  from public.orders o
  where o.id = p_order_id;
  return v_payload;
end;
$$;

-- ---------------------------------------------------------------- grants
revoke execute on function public._log_transport_event(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public._apply_intent_success(uuid) from public, anon, authenticated;
revoke execute on function public._build_order_payload(uuid) from public, anon, authenticated;
revoke execute on function public.tg_listings_a_guard() from public, anon, authenticated;
revoke execute on function public.run_platform_maintenance() from public, anon;
grant execute on function public.run_platform_maintenance() to authenticated;

revoke execute on function public.transport_transition(uuid, text, jsonb) from public, anon;
revoke execute on function public.cancel_order(uuid, text) from public, anon;
revoke execute on function public.create_payment_intent(text, text, text) from public, anon;
revoke execute on function public.attach_payment_session(uuid, text, text) from public, anon;
revoke execute on function public.demo_complete_payment(uuid) from public, anon;
revoke execute on function public.cancel_subscription(uuid) from public, anon;
grant execute on function public.transport_transition(uuid, text, jsonb) to authenticated;
grant execute on function public.cancel_order(uuid, text) to authenticated;
grant execute on function public.create_payment_intent(text, text, text) to authenticated;
grant execute on function public.attach_payment_session(uuid, text, text) to authenticated;
grant execute on function public.demo_complete_payment(uuid) to authenticated;
grant execute on function public.cancel_subscription(uuid) to authenticated;
-- Webhook calls arrive without a user session; the shared secret is the gate.
grant execute on function public.record_payment_event(text, text, text, uuid, text, text, bigint, text, jsonb) to anon, authenticated;
;
