-- Persoane fizice (PF) may sell, but some products stay reserved for
-- companies (PFA, II, IF, SRL, SA): concrete listings and the materials
-- ciment, bitum_rutier_50_70, filer. TS twin: lib/listings/seller-eligibility.ts.

create or replace function public.seller_is_company(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and entity_type is not null and entity_type <> 'PF'
  );
$$;
revoke execute on function public.seller_is_company(uuid) from public, anon;
grant execute on function public.seller_is_company(uuid) to authenticated;

-- Listing type gate. Fires on insert, a type change, or (re)activation, so
-- stock updates from place_order on older listings are not affected.
create or replace function public.tg_listings_company_only_type()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.listing_type is not distinct from old.listing_type
     and not (new.is_active and not coalesce(old.is_active, false)) then
    return new;
  end if;
  if new.listing_type = 'concrete' and not public.is_admin()
     and not public.seller_is_company(new.seller_id) then
    raise exception 'company only listing' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_listings_company_only_type() from public, anon, authenticated;

drop trigger if exists listings_company_only_type on public.marketplace_listings;
create trigger listings_company_only_type
  before insert or update of listing_type, is_active on public.marketplace_listings
  for each row execute function public.tg_listings_company_only_type();

-- Material gate on the spec row (written by upsert_listing_material_logistics).
create or replace function public.tg_material_spec_company_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seller uuid;
begin
  if new.material_code not in ('ciment', 'bitum_rutier_50_70', 'filer') then
    return new;
  end if;
  if public.is_admin() then return new; end if;
  select seller_id into v_seller from public.marketplace_listings where id = new.listing_id;
  if not public.seller_is_company(v_seller) then
    raise exception 'company only listing' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_material_spec_company_only() from public, anon, authenticated;

drop trigger if exists material_spec_company_only on public.marketplace_listing_material_spec;
create trigger material_spec_company_only
  before insert or update of material_code on public.marketplace_listing_material_spec
  for each row execute function public.tg_material_spec_company_only();
