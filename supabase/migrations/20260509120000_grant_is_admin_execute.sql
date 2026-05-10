-- RLS policies on marketplace_listings, categories, etc. call public.is_admin().
-- PostgREST sessions use anon or authenticated; those roles must have EXECUTE.
-- Without it: "permission denied for function is_admin" on reads like getProductListItems.
--
-- Safe if already granted. Requires public.is_admin() to exist (see security_rls_baseline migration).

begin;

grant execute on function public.is_admin() to anon, authenticated, service_role;

commit;
