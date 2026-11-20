-- Grant EXECUTE on public.is_admin() to PostgREST roles.

begin;

grant execute on function public.is_admin() to anon, authenticated, service_role;

commit;
;
