begin;

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

commit;
;
