-- Seller activation is a gate, not a button (docs/AUDIT.md section 3f).
-- Before: any user could flip profiles.seller_activated_at (UI or direct API)
-- with no data, then publish listings and appear on proformas with blank CUI/IBAN.
-- Now: activate_seller() checks the profile; clients cannot set the flag directly;
-- listings can only be created by activated sellers.
-- TS twins: lib/validation/ro-fiscal.ts (isValidCui, isValidRoPhone) and
-- lib/account/seller-readiness.ts (same requirement codes).

create or replace function public.ro_cui_valid(p_cui text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  c text := regexp_replace(upper(coalesce(p_cui, '')), '^RO|\s', '', 'g');
  k text := '753217532';
  body text;
  s integer := 0;
  chk integer;
begin
  if c !~ '^[0-9]{2,10}$' then return false; end if;
  body := lpad(left(c, length(c) - 1), 9, '0');
  for i in 1..9 loop
    s := s + substr(body, i, 1)::integer * substr(k, i, 1)::integer;
  end loop;
  chk := (s * 10) % 11;
  if chk = 10 then chk := 0; end if;
  return chk = right(c, 1)::integer;
end;
$$;

create or replace function public.ro_phone_valid(p_phone text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g') ~ '^((\+40|0040|0)[237][0-9]{8}|\+[1-9][0-9]{7,14})$';
$$;

-- Missing requirement codes for selling; empty array = ready.
create or replace function public.seller_missing_requirements(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  p public.profiles%rowtype;
  missing text[] := '{}';
begin
  if p_user_id is distinct from auth.uid() and not public.is_admin()
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into p from public.profiles where id = p_user_id;
  if not found then return array['profile']; end if;

  if coalesce(length(trim(p.display_name)), 0) < 2 then missing := missing || 'display_name'; end if;
  if not public.ro_phone_valid(p.phone) then missing := missing || 'phone'; end if;
  if p.entity_type is null then missing := missing || 'entity_type'; end if;
  if coalesce(trim(p.fiscal_address->>'line1'), '') = '' or coalesce(trim(p.fiscal_address->>'city'), '') = '' then
    missing := missing || 'fiscal_address';
  end if;
  if p.iban is null then missing := missing || 'iban'; end if;
  if p.entity_type is not null and p.entity_type <> 'PF' then
    if coalesce(length(trim(p.company_name)), 0) < 2 then missing := missing || 'company_name'; end if;
    if not public.ro_cui_valid(p.tax_id) then missing := missing || 'tax_id'; end if;
  end if;
  return missing;
end;
$$;

create or replace function public.activate_seller()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_missing text[];
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  v_missing := public.seller_missing_requirements(v_uid);
  if array_length(v_missing, 1) is not null then
    return jsonb_build_object('ok', false, 'missing', to_jsonb(v_missing));
  end if;
  update public.profiles set seller_activated_at = now()
  where id = v_uid and seller_activated_at is null;
  return jsonb_build_object('ok', true, 'missing', '[]'::jsonb);
end;
$$;

-- Clients cannot set or clear the seller flag themselves.
create or replace function public.tg_profiles_guard_seller_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.seller_activated_at is distinct from old.seller_activated_at
     and current_user in ('authenticated', 'anon')
     and not public.is_admin() then
    raise exception 'seller activation goes through activate_seller()' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_seller_flag on public.profiles;
create trigger profiles_guard_seller_flag before update on public.profiles
  for each row execute function public.tg_profiles_guard_seller_flag();

-- Only activated sellers create listings (UI gate was the only check).
create or replace function public.tg_listings_c_require_seller()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin()
     and not exists (select 1 from public.profiles where id = new.seller_id and seller_activated_at is not null) then
    raise exception 'seller account not activated' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists listings_c_require_seller on public.marketplace_listings;
create trigger listings_c_require_seller before insert on public.marketplace_listings
  for each row execute function public.tg_listings_c_require_seller();

revoke execute on function public.tg_profiles_guard_seller_flag() from public, anon, authenticated;
revoke execute on function public.tg_listings_c_require_seller() from public, anon, authenticated;
revoke execute on function public.seller_missing_requirements(uuid) from public, anon;
grant execute on function public.seller_missing_requirements(uuid) to authenticated;
revoke execute on function public.activate_seller() from public, anon;
grant execute on function public.activate_seller() to authenticated;
grant execute on function public.ro_cui_valid(text) to anon, authenticated;
grant execute on function public.ro_phone_valid(text) to anon, authenticated;
;
