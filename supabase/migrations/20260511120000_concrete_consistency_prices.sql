-- Per-consistency unit prices (JSON map) replace single price per class row.

alter table public.marketplace_listing_concrete_classes
  add column if not exists consistency_prices jsonb;

-- Backfill: same legacy unit price for every selected consistency on the row.
update public.marketplace_listing_concrete_classes ml
set consistency_prices = coalesce(
  (
    select jsonb_object_agg(c::text, to_jsonb(ml.price::numeric))
    from unnest(ml.consistencies) as c
  ),
  '{}'::jsonb
)
where consistency_prices is null;

alter table public.marketplace_listing_concrete_classes
  alter column consistency_prices set not null;

alter table public.marketplace_listing_concrete_classes
  drop constraint if exists marketplace_listing_concrete_classes_prices_keys_chk;

-- Keys must match consistencies and values must be positive: enforced in Zod + RPC callers.
-- Postgres forbids subqueries in CHECK; keep only non-empty object guard.
alter table public.marketplace_listing_concrete_classes
  add constraint marketplace_listing_concrete_classes_prices_keys_chk check (
    jsonb_typeof(consistency_prices) = 'object'
    and consistency_prices <> '{}'::jsonb
  );

comment on column public.marketplace_listing_concrete_classes.consistency_prices is
  'Map consistency code -> unit price (RON/EUR per M3 or TON). Keys must match consistencies array.';

alter table public.marketplace_listing_concrete_classes
  drop constraint if exists marketplace_listing_concrete_classes_price_chk;

alter table public.marketplace_listing_concrete_classes
  drop column if exists price;

create or replace function public.upsert_listing_concrete_classes (
  p_listing_id bigint,
  p_rows jsonb
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

  delete from public.marketplace_listing_concrete_classes
  where listing_id = p_listing_id;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return;
  end if;

  insert into public.marketplace_listing_concrete_classes (
    listing_id,
    class_code,
    consistencies,
    consistency_prices
  )
  select
    p_listing_id,
    trim(both from (elem->>'class_code')),
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(elem->'consistencies', '[]'::jsonb))
      ),
      array[]::text[]
    ),
    coalesce(elem->'consistency_prices', '{}'::jsonb)
  from jsonb_array_elements(p_rows) as elem;
end;
$$;

revoke all on function public.upsert_listing_concrete_classes (bigint, jsonb) from public;
grant execute on function public.upsert_listing_concrete_classes (bigint, jsonb) to authenticated;

