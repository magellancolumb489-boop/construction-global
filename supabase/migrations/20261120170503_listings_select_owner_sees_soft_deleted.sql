-- Postgres checks the updated row against SELECT policies too. Hiding soft-deleted
-- rows from their owner made "update ... set deleted_at = now()" fail RLS.
-- Public: live + active only. Owner: all own rows (the app filters deleted_at).
drop policy if exists listings_select_public_or_owner on public.marketplace_listings;
create policy listings_select_public_or_owner on public.marketplace_listings
  for select to anon, authenticated
  using (
    (deleted_at is null and is_active = true)
    or ((select auth.uid()) is not null and seller_id = (select auth.uid()))
    or public.is_admin()
  );
