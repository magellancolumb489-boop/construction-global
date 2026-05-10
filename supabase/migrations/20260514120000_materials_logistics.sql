-- Materials logistics: spec + seller transport offers + upsert RPC + place_order branch.

begin;

-- --- Reference-level helpers (keep aligned with lib/materials-logistics/catalog.ts)

create or replace function public.materials_vehicle_payload_valid(p_vehicle text, p_payload numeric)
returns boolean
language sql
immutable
as $$
  select case trim(both from upper(p_vehicle))
    when 'DUBA' then p_payload in (1, 1.5, 2, 3.5)
    when 'AUTOUTILITARA' then p_payload in (1, 1.5, 2, 3.5)
    when 'CAMION_BENA' then p_payload in (7.5, 12, 18)
    when 'CAMION_HIAB' then p_payload in (7.5, 12, 18)
    when 'TIR' then p_payload in (22, 23, 24)
    when 'TRAILER' then p_payload in (24, 26, 28, 30)
    when 'AUTOBASCULANTA' then p_payload in (8, 12, 18, 24)
    else false
  end;
$$;

create or replace function public.materials_marketplace_vehicle_allowed(
  p_category text,
  p_vehicle text,
  p_payload numeric,
  p_allow_non_bulk boolean
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_ok boolean;
begin
  if not public.materials_vehicle_payload_valid(p_vehicle, p_payload) then
    return false;
  end if;

  v_ok := trim(both from upper(p_vehicle));

  if p_category in ('AGREGATE_CARIERA', 'AGREGATE_BALASTIERA') then
    if v_ok = 'AUTOBASCULANTA' then
      return true;
    end if;
    return coalesce(p_allow_non_bulk, false);
  end if;

  if v_ok = 'AUTOBASCULANTA' then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.materials_estimate_mass_kg(
  p_unit text,
  p_qty numeric,
  p_pallet_total_kg numeric,
  p_pallet_count numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  u text := trim(both from upper(coalesce(p_unit, '')));
begin
  if p_pallet_count is not null and p_pallet_count > 0
     and p_pallet_total_kg is not null and p_pallet_total_kg > 0 then
    return p_pallet_count * p_pallet_total_kg;
  end if;

  if u = 'TON' then return p_qty * 1000; end if;
  if u = 'KG' then return p_qty; end if;
  if u = 'M3' then return p_qty * 1600; end if;
  if u = 'CUP' then return p_qty * 1500; end if;
  if u = 'CAMION' then return p_qty * 18000; end if;
  return greatest(p_qty * 25, 1);
end;
$$;

create or replace function public.materials_min_trips(
  p_mass_kg numeric,
  p_payload_t numeric
)
returns integer
language sql
immutable
as $$
  select greatest(1, ceil(p_mass_kg / greatest(p_payload_t * 1000, 0.001))::integer);
$$;

-- --- Tables

create table if not exists public.marketplace_listing_material_spec (
  listing_id bigint primary key references public.marketplace_listings (id) on delete cascade,
  category_code text not null,
  material_code text not null,
  pallet_sac_kg numeric,
  pallet_pieces numeric,
  pallet_total_kg numeric,
  max_piece_length_m numeric,
  macara_addon boolean not null default false,
  macara_fee numeric default 0,
  allow_non_bulk_transport boolean not null default false,
  created_at timestamptz not null default now(),
  constraint marketplace_listing_material_spec_category_chk check (
    category_code in (
      'ALTE_MATERIALE',
      'AGREGATE_CARIERA',
      'AGREGATE_BALASTIERA',
      'DIMENSIUNI_MEDII',
      'DIMENSIUNI_MICI'
    )
  ),
  constraint marketplace_listing_material_spec_macara_fee_chk check (macara_fee is null or macara_fee >= 0)
);

comment on table public.marketplace_listing_material_spec is
  'Per-listing materials taxonomy + pallet/long-piece/macara flags for listing_type = materials.';

create table if not exists public.marketplace_listing_material_transport (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.marketplace_listings (id) on delete cascade,
  vehicle_code text not null,
  payload_t numeric not null,
  created_at timestamptz not null default now(),
  constraint marketplace_listing_material_transport_vehicle_chk check (
    vehicle_code in (
      'DUBA',
      'AUTOUTILITARA',
      'CAMION_BENA',
      'CAMION_HIAB',
      'TIR',
      'TRAILER',
      'AUTOBASCULANTA'
    )
  ),
  constraint marketplace_listing_material_transport_payload_chk check (
    public.materials_vehicle_payload_valid(vehicle_code, payload_t)
  ),
  constraint marketplace_listing_material_transport_uniq unique (listing_id, vehicle_code, payload_t)
);

create index if not exists marketplace_listing_material_transport_listing_id_idx
  on public.marketplace_listing_material_transport (listing_id);

comment on table public.marketplace_listing_material_transport is
  'Seller-declared vehicle capacities for materials listings (multiple rows per listing).';

alter table public.marketplace_listing_material_spec enable row level security;
alter table public.marketplace_listing_material_transport enable row level security;

drop policy if exists "listing_material_spec_select" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_select"
on public.marketplace_listing_material_spec
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_material_spec.listing_id
      and (
        ml.is_active = true
        or (auth.uid() is not null and ml.seller_id = auth.uid())
        or public.is_admin()
      )
  )
);

drop policy if exists "listing_material_spec_insert" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_insert"
on public.marketplace_listing_material_spec
for insert
to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = auth.uid()
  )
);

drop policy if exists "listing_material_spec_update" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_update"
on public.marketplace_listing_material_spec
for update
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_material_spec_delete" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_delete"
on public.marketplace_listing_material_spec
for delete
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_material_transport_select" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_select"
on public.marketplace_listing_material_transport
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_material_transport.listing_id
      and (
        ml.is_active = true
        or (auth.uid() is not null and ml.seller_id = auth.uid())
        or public.is_admin()
      )
  )
);

drop policy if exists "listing_material_transport_insert" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_insert"
on public.marketplace_listing_material_transport
for insert
to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = auth.uid()
  )
);

drop policy if exists "listing_material_transport_update" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_update"
on public.marketplace_listing_material_transport
for update
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_material_transport_delete" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_delete"
on public.marketplace_listing_material_transport
for delete
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

-- --- Upsert RPC

create or replace function public.upsert_listing_material_logistics (
  p_listing_id bigint,
  p_spec jsonb,
  p_offers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  if p_listing_id is null or p_listing_id <= 0 then
    raise exception 'Invalid listing id';
  end if;

  select seller_id into v_seller from public.marketplace_listings where id = p_listing_id;
  if v_seller is null then
    raise exception 'Listing not found';
  end if;
  if v_seller is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.marketplace_listing_material_transport where listing_id = p_listing_id;
  delete from public.marketplace_listing_material_spec where listing_id = p_listing_id;

  if p_spec is null or jsonb_typeof(p_spec) <> 'object' then
    return;
  end if;

  insert into public.marketplace_listing_material_spec (
    listing_id,
    category_code,
    material_code,
    pallet_sac_kg,
    pallet_pieces,
    pallet_total_kg,
    max_piece_length_m,
    macara_addon,
    macara_fee,
    allow_non_bulk_transport
  )
  values (
    p_listing_id,
    trim(both from (p_spec->>'category_code')),
    trim(both from (p_spec->>'material_code')),
    nullif(p_spec->>'pallet_sac_kg', '')::numeric,
    nullif(p_spec->>'pallet_pieces', '')::numeric,
    nullif(p_spec->>'pallet_total_kg', '')::numeric,
    nullif(p_spec->>'max_piece_length_m', '')::numeric,
    coalesce((p_spec->>'macara_addon')::boolean, false),
    coalesce(nullif(p_spec->>'macara_fee', '')::numeric, 0),
    coalesce((p_spec->>'allow_non_bulk_transport')::boolean, false)
  );

  if p_offers is null or jsonb_typeof(p_offers) <> 'array' then
    return;
  end if;

  insert into public.marketplace_listing_material_transport (listing_id, vehicle_code, payload_t)
  select
    p_listing_id,
    trim(both from upper(elem->>'vehicle_code')),
    (elem->>'payload_t')::numeric
  from jsonb_array_elements(p_offers) as elem;
end;
$$;

revoke all on function public.upsert_listing_material_logistics (bigint, jsonb, jsonb) from public;
grant execute on function public.upsert_listing_material_logistics (bigint, jsonb, jsonb) to authenticated;

revoke all on function public.materials_vehicle_payload_valid (text, numeric) from public;
grant execute on function public.materials_vehicle_payload_valid (text, numeric) to anon, authenticated;

revoke all on function public.materials_marketplace_vehicle_allowed (text, text, numeric, boolean) from public;
grant execute on function public.materials_marketplace_vehicle_allowed (text, text, numeric, boolean) to anon, authenticated;

revoke all on function public.materials_estimate_mass_kg (text, numeric, numeric, numeric) from public;
grant execute on function public.materials_estimate_mass_kg (text, numeric, numeric, numeric) to anon, authenticated;

revoke all on function public.materials_min_trips (numeric, numeric) from public;
grant execute on function public.materials_min_trips (numeric, numeric) to anon, authenticated;

-- --- place_order: materials row with logistics requires cart plan fields

create or replace function public.place_order(
  p_cart            jsonb,
  p_billing         jsonb,
  p_shipping        jsonb,
  p_notes           text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id        uuid := auth.uid();
  v_order_id       uuid;
  v_existing_id    uuid;
  v_seller_id      uuid;
  v_currency       text;
  v_subtotal_cents bigint := 0;
  v_transport_cents bigint := 0;
  v_vat_cents      bigint := 0;
  v_total_cents    bigint := 0;
  v_order_number   text;
  v_deviz_number   text;
  v_seq_today      bigint;
  v_today_token    text := to_char(now() at time zone 'Europe/Bucharest', 'YYYYMMDD');
  v_buyer_snap     jsonb;
  v_seller_snap    jsonb;
  v_lines_out      jsonb := '[]'::jsonb;
  v_line           jsonb;
  v_listing        public.marketplace_listings%rowtype;
  v_qty            numeric;
  v_unit_price     numeric;
  v_unit_price_cents bigint;
  v_line_subtotal_cents bigint;
  v_line_transport_cents bigint;
  v_line_total_cents bigint;
  v_line_title     text;
  v_line_unit      text;
  v_line_snapshot  jsonb;
  v_concrete_class text;
  v_concrete_consistency text;
  v_concrete_price_db numeric;
  v_first_seller   uuid;
  v_first_currency text;
  v_cart_len       int;
  v_mat_spec       public.marketplace_listing_material_spec%rowtype;
  v_mv             text;
  v_mp             numeric;
  v_mt             integer;
  v_macara         boolean;
  v_offer_count    integer;
  v_mass_kg        numeric;
  v_min_trips      integer;
  v_pc             numeric;
  v_macfee         numeric;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_cart is null or jsonb_typeof(p_cart) <> 'array' then
    raise exception 'invalid cart payload' using errcode = '22023';
  end if;

  v_cart_len := jsonb_array_length(p_cart);
  if v_cart_len = 0 then
    raise exception 'empty cart' using errcode = '22023';
  end if;

  if p_idempotency_key is not null and length(p_idempotency_key) > 0 then
    select id into v_existing_id
    from public.orders
    where buyer_id = v_user_id
      and idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      return public._build_order_payload(v_existing_id);
    end if;
  end if;

  for v_line in select * from jsonb_array_elements(p_cart)
  loop
    if (v_line->>'listing_id') is null then
      raise exception 'cart line missing listing_id' using errcode = '22023';
    end if;
    if (v_line->>'qty') is null then
      raise exception 'cart line missing qty' using errcode = '22023';
    end if;

    v_qty := (v_line->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'cart line qty must be > 0' using errcode = '22023';
    end if;

    select * into v_listing
    from public.marketplace_listings
    where id = (v_line->>'listing_id')::bigint
    for update;

    if not found then
      raise exception 'listing % not found', (v_line->>'listing_id') using errcode = '22023';
    end if;
    if v_listing.is_active is not true then
      raise exception 'listing % is no longer active', v_listing.id using errcode = '22023';
    end if;

    if v_first_seller is null then
      v_first_seller := v_listing.seller_id;
    elsif v_first_seller <> v_listing.seller_id then
      raise exception 'cart contains items from multiple sellers' using errcode = '22023';
    end if;

    if v_first_currency is null then
      v_first_currency := v_listing.currency;
    elsif v_first_currency <> v_listing.currency then
      raise exception 'cart contains items with mixed currencies' using errcode = '22023';
    end if;

    if v_listing.min_order_qty is not null and v_qty < v_listing.min_order_qty then
      raise exception 'qty below min_order_qty for listing %', v_listing.id using errcode = '22023';
    end if;
    if v_qty > v_listing.available_qty then
      raise exception 'qty above available_qty for listing %', v_listing.id using errcode = '22023';
    end if;

    v_concrete_class := null;
    v_concrete_consistency := null;

    if v_listing.listing_type = 'concrete' then
      v_concrete_class := v_line->>'concrete_class_code';
      v_concrete_consistency := v_line->>'concrete_consistency';

      if v_concrete_class is null or v_concrete_consistency is null then
        raise exception 'concrete cart line missing class/consistency' using errcode = '22023';
      end if;

      select (cc.consistency_prices->>v_concrete_consistency)::numeric
      into v_concrete_price_db
      from public.marketplace_listing_concrete_classes cc
      where cc.listing_id = v_listing.id
        and cc.class_code = v_concrete_class
      limit 1;

      if v_concrete_price_db is null or v_concrete_price_db <= 0 then
        if (v_line->>'unit_price_cents') is not null then
          v_unit_price_cents := (v_line->>'unit_price_cents')::bigint;
          if v_unit_price_cents <= 0 then
            raise exception 'invalid concrete unit_price for listing %', v_listing.id using errcode = '22023';
          end if;
          v_unit_price := (v_unit_price_cents::numeric) / 100;
        else
          raise exception 'no published price for concrete %/% on listing %',
            v_concrete_class, v_concrete_consistency, v_listing.id using errcode = '22023';
        end if;
      else
        v_unit_price := v_concrete_price_db;
        v_unit_price_cents := round(v_unit_price * 100)::bigint;
      end if;

      v_line_subtotal_cents  := round(v_unit_price * v_qty * 100)::bigint;
      v_line_transport_cents := coalesce(round(coalesce(v_listing.transport_fee, 0)::numeric * 100)::bigint, 0);
      v_line_total_cents     := v_line_subtotal_cents + v_line_transport_cents;

      v_line_title := v_listing.title;
      v_line_unit  := v_listing.unit;
      v_line_snapshot := jsonb_build_object(
        'listing_id', v_listing.id,
        'listing_type', v_listing.listing_type,
        'slug', v_listing.slug,
        'currency', v_listing.currency,
        'unit', v_listing.unit,
        'unit_price', v_unit_price,
        'qty', v_qty,
        'transport_fee', coalesce(v_listing.transport_fee, 0),
        'concrete_class_code', v_concrete_class,
        'concrete_consistency', v_concrete_consistency,
        'configure_delivery', v_line->'configure_delivery',
        'configure_billing', v_line->'configure_billing',
        'quote_summary', v_line->'quote_summary'
      );

    elsif v_listing.listing_type = 'materials' then
      select * into v_mat_spec
      from public.marketplace_listing_material_spec
      where listing_id = v_listing.id
      limit 1;

      if found then
        v_mv := trim(both from upper(coalesce(v_line->>'materials_vehicle_code', '')));
        if v_mv is null or v_mv = '' then
          raise exception 'materials cart line missing vehicle' using errcode = '22023';
        end if;

        if v_line->>'materials_payload_t' is null then
          raise exception 'materials cart line missing payload' using errcode = '22023';
        end if;
        v_mp := (v_line->>'materials_payload_t')::numeric;

        if v_line->>'materials_trips' is null then
          raise exception 'materials cart line missing trips' using errcode = '22023';
        end if;
        v_mt := ceil((v_line->>'materials_trips')::numeric)::integer;
        if v_mt is null or v_mt < 1 then
          raise exception 'materials trips invalid' using errcode = '22023';
        end if;

        v_macara := coalesce((v_line->>'materials_macara_addon')::boolean, false);

        if not public.materials_vehicle_payload_valid(v_mv, v_mp) then
          raise exception 'invalid vehicle payload for listing %', v_listing.id using errcode = '22023';
        end if;

        select count(*)::integer into v_offer_count
        from public.marketplace_listing_material_transport
        where listing_id = v_listing.id;

        if v_offer_count > 0 then
          if not exists (
            select 1 from public.marketplace_listing_material_transport t
            where t.listing_id = v_listing.id
              and trim(both from upper(t.vehicle_code)) = v_mv
              and t.payload_t = v_mp
          ) then
            raise exception 'vehicle not offered by seller for listing %', v_listing.id using errcode = '22023';
          end if;
        else
          if not public.materials_marketplace_vehicle_allowed(
            v_mat_spec.category_code,
            v_mv,
            v_mp,
            v_mat_spec.allow_non_bulk_transport
          ) then
            raise exception 'vehicle not allowed for marketplace-assigned listing %', v_listing.id using errcode = '22023';
          end if;
        end if;

        if v_macara and not coalesce(v_mat_spec.macara_addon, false) then
          raise exception 'macara not available for listing %', v_listing.id using errcode = '22023';
        end if;

        v_pc := nullif(v_line->>'materials_pallet_count', '')::numeric;

        v_mass_kg := public.materials_estimate_mass_kg(
          v_listing.unit,
          v_qty,
          v_mat_spec.pallet_total_kg,
          v_pc
        );

        v_min_trips := public.materials_min_trips(v_mass_kg, v_mp);
        if v_mt < v_min_trips then
          raise exception 'materials trips below minimum for listing %', v_listing.id using errcode = '22023';
        end if;

        v_unit_price := v_listing.price;
        v_unit_price_cents := round(v_unit_price * 100)::bigint;
        v_line_subtotal_cents := round(v_unit_price * v_qty * 100)::bigint;

        v_macfee := case
          when v_macara then coalesce(v_mat_spec.macara_fee, 0)
          else 0
        end;

        v_line_transport_cents :=
          coalesce(round(coalesce(v_listing.transport_fee, 0)::numeric * v_mt * 100)::bigint, 0)
          + coalesce(round(v_macfee * 100)::bigint, 0);

        v_line_total_cents := v_line_subtotal_cents + v_line_transport_cents;

        v_line_title := v_listing.title;
        v_line_unit  := v_listing.unit;
        v_line_snapshot := jsonb_build_object(
          'listing_id', v_listing.id,
          'listing_type', v_listing.listing_type,
          'slug', v_listing.slug,
          'currency', v_listing.currency,
          'unit', v_listing.unit,
          'unit_price', v_unit_price,
          'qty', v_qty,
          'transport_fee', coalesce(v_listing.transport_fee, 0),
          'materials_vehicle_code', v_mv,
          'materials_payload_t', v_mp,
          'materials_trips', v_mt,
          'materials_macara_addon', v_macara,
          'materials_pallet_count', v_pc,
          'materials_category_code', v_mat_spec.category_code,
          'materials_material_code', v_mat_spec.material_code,
          'configure_delivery', v_line->'configure_delivery',
          'configure_billing', v_line->'configure_billing',
          'quote_summary', v_line->'quote_summary'
        );

      else
        v_unit_price := v_listing.price;
        v_unit_price_cents := round(v_unit_price * 100)::bigint;
        v_line_subtotal_cents  := round(v_unit_price * v_qty * 100)::bigint;
        v_line_transport_cents := coalesce(round(coalesce(v_listing.transport_fee, 0)::numeric * 100)::bigint, 0);
        v_line_total_cents     := v_line_subtotal_cents + v_line_transport_cents;

        v_line_title := v_listing.title;
        v_line_unit  := v_listing.unit;
        v_line_snapshot := jsonb_build_object(
          'listing_id', v_listing.id,
          'listing_type', v_listing.listing_type,
          'slug', v_listing.slug,
          'currency', v_listing.currency,
          'unit', v_listing.unit,
          'unit_price', v_unit_price,
          'qty', v_qty,
          'transport_fee', coalesce(v_listing.transport_fee, 0),
          'concrete_class_code', null,
          'concrete_consistency', null,
          'configure_delivery', v_line->'configure_delivery',
          'configure_billing', v_line->'configure_billing',
          'quote_summary', v_line->'quote_summary'
        );
      end if;

    else
      v_unit_price := v_listing.price;
      v_unit_price_cents := round(v_unit_price * 100)::bigint;
      v_line_subtotal_cents  := round(v_unit_price * v_qty * 100)::bigint;
      v_line_transport_cents := coalesce(round(coalesce(v_listing.transport_fee, 0)::numeric * 100)::bigint, 0);
      v_line_total_cents     := v_line_subtotal_cents + v_line_transport_cents;

      v_line_title := v_listing.title;
      v_line_unit  := v_listing.unit;
      v_line_snapshot := jsonb_build_object(
        'listing_id', v_listing.id,
        'listing_type', v_listing.listing_type,
        'slug', v_listing.slug,
        'currency', v_listing.currency,
        'unit', v_listing.unit,
        'unit_price', v_unit_price,
        'qty', v_qty,
        'transport_fee', coalesce(v_listing.transport_fee, 0),
        'concrete_class_code', null,
        'concrete_consistency', null,
        'configure_delivery', v_line->'configure_delivery',
        'configure_billing', v_line->'configure_billing',
        'quote_summary', v_line->'quote_summary'
      );
    end if;

    v_subtotal_cents  := v_subtotal_cents + v_line_subtotal_cents;
    v_transport_cents := v_transport_cents + v_line_transport_cents;

    v_lines_out := v_lines_out || jsonb_build_array(jsonb_build_object(
      'listing_id',       v_listing.id,
      'title',            v_line_title,
      'unit',             v_line_unit,
      'qty',              v_qty,
      'unit_price_cents', v_unit_price_cents,
      'transport_cents',  v_line_transport_cents,
      'line_total_cents', v_line_total_cents,
      'snapshot_json',    v_line_snapshot
    ));
  end loop;

  v_seller_id := v_first_seller;
  v_currency  := coalesce(v_first_currency, 'RON');

  v_vat_cents   := round((v_subtotal_cents + v_transport_cents) * 0.19)::bigint;
  v_total_cents := v_subtotal_cents + v_transport_cents + v_vat_cents;

  select jsonb_build_object(
    'id',            p.id,
    'display_name',  p.display_name,
    'company_name',  p.company_name,
    'entity_type',   p.entity_type,
    'tax_id',        p.tax_id,
    'reg_com',       p.reg_com,
    'vat_id',        p.vat_id,
    'fiscal_address', p.fiscal_address,
    'phone',         p.phone,
    'website_url',   p.website_url,
    'form_billing',  p_billing,
    'form_shipping', p_shipping
  )
  into v_buyer_snap
  from public.profiles p
  where p.id = v_user_id;

  select jsonb_build_object(
    'id',            p.id,
    'display_name',  p.display_name,
    'company_name',  p.company_name,
    'entity_type',   p.entity_type,
    'tax_id',        p.tax_id,
    'reg_com',       p.reg_com,
    'vat_id',        p.vat_id,
    'fiscal_address', p.fiscal_address,
    'phone',         p.phone,
    'website_url',   p.website_url,
    'auth_email',    (select u.email from auth.users u where u.id = v_seller_id limit 1)
  )
  into v_seller_snap
  from public.profiles p
  where p.id = v_seller_id;

  select count(*) + 1 into v_seq_today
  from public.orders
  where created_at >= (now() at time zone 'Europe/Bucharest')::date;

  v_order_number := 'ORD-' || v_today_token || '-' || lpad(v_seq_today::text, 4, '0');
  v_deviz_number := 'DEV-' || v_today_token || '-' || lpad(v_seq_today::text, 4, '0');

  insert into public.orders (
    id, order_number, deviz_number, buyer_id, seller_id,
    currency, subtotal_cents, transport_cents, vat_cents, total_cents,
    status, payment_status, payment_provider,
    idempotency_key, notes, billing_json, shipping_json,
    buyer_snapshot, seller_snapshot
  ) values (
    gen_random_uuid(), v_order_number, v_deviz_number, v_user_id, v_seller_id,
    v_currency, v_subtotal_cents, v_transport_cents, v_vat_cents, v_total_cents,
    'pending', 'demo_paid', 'demo',
    p_idempotency_key, p_notes, p_billing, p_shipping,
    v_buyer_snap, v_seller_snap
  )
  returning id into v_order_id;

  insert into public.order_lines (
    order_id, listing_id, title, unit, qty,
    unit_price_cents, transport_cents, line_total_cents, snapshot_json
  )
  select
    v_order_id,
    (l->>'listing_id')::bigint,
    l->>'title',
    l->>'unit',
    (l->>'qty')::numeric,
    (l->>'unit_price_cents')::bigint,
    (l->>'transport_cents')::bigint,
    (l->>'line_total_cents')::bigint,
    l->'snapshot_json'
  from jsonb_array_elements(v_lines_out) as l;

  insert into public.payments (order_id, provider, amount_cents, status, raw_json)
  values (
    v_order_id,
    'demo',
    v_total_cents,
    'demo_paid',
    jsonb_build_object('mode', 'demo', 'note', 'no real charge; flip NEXT_PUBLIC_PAYMENTS_MODE=stripe to wire up')
  );

  return public._build_order_payload(v_order_id);
end;
$$;

commit;
