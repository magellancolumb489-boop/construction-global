create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select *
  from public.profiles
  where id = auth.uid();
$$;

comment on function public.get_my_profile() is
  'Returns the caller''s full profiles row (one row). Bypasses column grants; restricted by auth.uid() in SQL body.';

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;;
