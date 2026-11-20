-- place_order v2. Base: live 20260510052114_materials_logistics_place_order.
-- Changes (see docs/AUDIT.md N2-N7):
--   * concrete price only from consistency_prices (client fallback removed)
--   * available_qty decremented inside the same transaction (row FOR UPDATE)
--   * duplicate listing lines rejected (stock check is per line)
--   * same idempotency key serialized with an advisory lock, then replayed
--   * order/deviz numbers from a per-day counter row (no count(*) race,
--     day = Europe/Bucharest calendar day)
-- VAT stays 19% pending client answer (AUDIT Q5).

create table if not exists public.order_number_counters (
  day      date primary key,
  last_seq integer not null check (last_seq > 0)
);
alter table public.order_number_counters enable row level security;
alter table public.order_number_counters force row level security;
revoke all on public.order_number_counters from public, anon, authenticated;
comment on table public.order_number_counters is
  'Per-day order sequence for place_order. No client access; written only by place_order.';

-- Seed from existing numbers ORD-YYYYMMDD-NNNN so today's next number cannot collide.
insert into public.order_number_counters (day, last_seq)
select to_date(substr(order_number, 5, 8), 'YYYYMMDD'), max(substr(order_number, 14)::int)
from public.orders
where order_number ~ '^ORD-[0-9]{8}-[0-9]+$'
group by 1
on conflict (day) do update set last_seq = greatest(public.order_number_counters.last_seq, excluded.last_seq);

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
  v_seen_listings  bigint[] := '{}';
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
    -- Two concurrent submits with the same key: the second waits here, then
    -- finds the first order and replays it instead of hitting the unique index.
    perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0));
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

    if (v_line->>'listing_id')::bigint = any(v_seen_listings) then
      raise exception 'duplicate listing % in cart', (v_line->>'listing_id') using errcode = '22023';
    end if;
    v_seen_listings := v_seen_listings || (v_line->>'listing_id')::bigint;

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

    -- Row is locked FOR UPDATE above; any later exception rolls this back.
    update public.marketplace_listings
    set available_qty = available_qty - v_qty
    where id = v_listing.id;

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

      -- Price comes only from the seller's published table. Client
      -- unit_price_cents is ignored (was a trust bug).
      if v_concrete_price_db is null or v_concrete_price_db <= 0 then
        raise exception 'no published price for concrete %/% on listing %',
          v_concrete_class, v_concrete_consistency, v_listing.id using errcode = '22023';
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

  insert into public.order_number_counters as c (day, last_seq)
  values ((now() at time zone 'Europe/Bucharest')::date, 1)
  on conflict (day) do update set last_seq = c.last_seq + 1
  returning c.last_seq into v_seq_today;

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

revoke execute on function public.place_order(jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text) to authenticated;
