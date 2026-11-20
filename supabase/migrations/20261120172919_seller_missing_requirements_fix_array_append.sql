-- Fix: `text[] || 'literal'` parsed the literal as an array. Use array_append.
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

  if coalesce(length(trim(p.display_name)), 0) < 2 then missing := array_append(missing, 'display_name'); end if;
  if not public.ro_phone_valid(p.phone) then missing := array_append(missing, 'phone'); end if;
  if p.entity_type is null then missing := array_append(missing, 'entity_type'); end if;
  if coalesce(trim(p.fiscal_address->>'line1'), '') = '' or coalesce(trim(p.fiscal_address->>'city'), '') = '' then
    missing := array_append(missing, 'fiscal_address');
  end if;
  if p.iban is null then missing := array_append(missing, 'iban'); end if;
  if p.entity_type is not null and p.entity_type <> 'PF' then
    if coalesce(length(trim(p.company_name)), 0) < 2 then missing := array_append(missing, 'company_name'); end if;
    if not public.ro_cui_valid(p.tax_id) then missing := array_append(missing, 'tax_id'); end if;
  end if;
  return missing;
end;
$$;
revoke execute on function public.seller_missing_requirements(uuid) from public, anon;
grant execute on function public.seller_missing_requirements(uuid) to authenticated;
;
