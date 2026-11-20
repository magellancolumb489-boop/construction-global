-- Fix: a SECURITY DEFINER trigger sees current_user = owner, so the
-- "client caller" check never matched. Trigger runs as the caller; the
-- profile lookup (column not granted to clients) goes through a definer helper.
create or replace function public.is_seller_activated(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = p_user_id and seller_activated_at is not null);
$$;
revoke execute on function public.is_seller_activated(uuid) from public, anon;
grant execute on function public.is_seller_activated(uuid) to authenticated;

create or replace function public.tg_listings_c_require_seller()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin()
     and not public.is_seller_activated(new.seller_id) then
    raise exception 'seller account not activated' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_listings_c_require_seller() from public, anon, authenticated;
;
