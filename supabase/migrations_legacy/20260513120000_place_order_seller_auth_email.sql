-- Seller snapshot: auth.users.email as auth_email for Resend.
begin;

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
begin
  -- 1) auth gate
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- 2) input shape gate
  if p_cart is null or jsonb_typeof(p_cart) <> 'array' then
    raise exception 'invalid cart payload' using errcode = '22023';
  end if;

  v_cart_len := jsonb_array_length(p_cart);
  if v_cart_len = 0 then
    raise exception 'empty cart' using errcode = '22023';
  end if;

  -- 3) idempotency short-circuit
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

  -- 4) Walk the cart, lock listings, recompute every line.
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

    -- Lock the listing row to prevent concurrent inactivation/price changes.
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

    -- Single-seller cart invariant.
    if v_first_seller is null then
      v_first_seller := v_listing.seller_id;
    elsif v_first_seller <> v_listing.seller_id then
      raise exception 'cart contains items from multiple sellers' using errcode = '22023';
    end if;

    -- Single-currency cart invariant.
    if v_first_currency is null then
      v_first_currency := v_listing.currency;
    elsif v_first_currency <> v_listing.currency then
      raise exception 'cart contains items with mixed currencies' using errcode = '22023';
    end if;

    -- min_order_qty / available_qty checks
    if v_listing.min_order_qty is not null and v_qty < v_listing.min_order_qty then
      raise exception 'qty below min_order_qty for listing %', v_listing.id using errcode = '22023';
    end if;
    if v_qty > v_listing.available_qty then
      raise exception 'qty above available_qty for listing %', v_listing.id using errcode = '22023';
    end if;

    -- Unit price resolution per listing_type.
    if v_listing.listing_type = 'concrete' then
      -- Concrete: client picks class+consistency at configurare; price comes from
      -- marketplace_listing_concrete_classes.consistency_prices map.
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
        -- Phase-2 hardening fallback: trust client unit_price ONLY if it matches
        -- a published row for this listing/class. If we have no rows at all and
        -- the client supplied a unit_price > 0, accept it provisionally and tag
        -- the snapshot for audit. Otherwise reject hard.
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
    else
      -- Materials / equipment / services: authoritative price comes from the listing row.
      v_unit_price := v_listing.price;
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

  -- VAT 19% applied on subtotal + transport (Romanian standard rate).
  v_vat_cents   := round((v_subtotal_cents + v_transport_cents) * 0.19)::bigint;
  v_total_cents := v_subtotal_cents + v_transport_cents + v_vat_cents;

  -- 5) Snapshot buyer + seller from profiles (read past RLS via SECURITY DEFINER).
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

  -- 6) Generate ORD- / DEV- numbers (per-day sequence; falls back to a count+1).
  select count(*) + 1 into v_seq_today
  from public.orders
  where created_at >= (now() at time zone 'Europe/Bucharest')::date;

  v_order_number := 'ORD-' || v_today_token || '-' || lpad(v_seq_today::text, 4, '0');
  v_deviz_number := 'DEV-' || v_today_token || '-' || lpad(v_seq_today::text, 4, '0');

  -- 7) Insert order, lines, payment row.
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
