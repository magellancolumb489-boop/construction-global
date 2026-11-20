-- Drop duplicate indexes (keep idx_* prefix, drop *_idx suffix versions)
drop index if exists public.marketplace_listing_images_listing_id_idx;
drop index if exists public.marketplace_listings_is_active_idx;
drop index if exists public.marketplace_listings_seller_id_idx;

-- Rewrite all RLS policies to use (select auth.uid()) for performance.
-- This caches the auth.uid() call once per query instead of per row.

-- profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_select_public_via_view" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_admin());

create policy "profiles_update_self"
on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Drop the redundant SELECT policy; column-level grants handle public access via view
-- (the view uses security_invoker; column grants restrict what anon/auth can read)

-- marketplace_listings
drop policy if exists "listings_select_public_or_owner" on public.marketplace_listings;
drop policy if exists "listings_insert_self" on public.marketplace_listings;
drop policy if exists "listings_update_owner" on public.marketplace_listings;
drop policy if exists "listings_delete_owner" on public.marketplace_listings;

create policy "listings_select_public_or_owner"
on public.marketplace_listings for select to anon, authenticated
using (
  is_active = true
  or ((select auth.uid()) is not null and seller_id = (select auth.uid()))
  or public.is_admin()
);

create policy "listings_insert_self"
on public.marketplace_listings for insert to authenticated
with check ((select auth.uid()) = seller_id);

create policy "listings_update_owner"
on public.marketplace_listings for update to authenticated
using (seller_id = (select auth.uid()) or public.is_admin())
with check (seller_id = (select auth.uid()) or public.is_admin());

create policy "listings_delete_owner"
on public.marketplace_listings for delete to authenticated
using (seller_id = (select auth.uid()) or public.is_admin());

-- marketplace_listing_images
drop policy if exists "listing_images_select" on public.marketplace_listing_images;
drop policy if exists "listing_images_insert" on public.marketplace_listing_images;
drop policy if exists "listing_images_update" on public.marketplace_listing_images;
drop policy if exists "listing_images_delete" on public.marketplace_listing_images;

create policy "listing_images_select"
on public.marketplace_listing_images for select to anon, authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = marketplace_listing_images.listing_id
      and (ml.is_active = true
           or ((select auth.uid()) is not null and ml.seller_id = (select auth.uid()))
           or public.is_admin())
  )
);

create policy "listing_images_insert"
on public.marketplace_listing_images for insert to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = (select auth.uid())
  )
);

create policy "listing_images_update"
on public.marketplace_listing_images for update to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = (select auth.uid()) or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = (select auth.uid()) or public.is_admin())
  )
);

create policy "listing_images_delete"
on public.marketplace_listing_images for delete to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = (select auth.uid()) or public.is_admin())
  )
);

-- user_addresses
drop policy if exists "user_addresses_select_self" on public.user_addresses;
drop policy if exists "user_addresses_insert_self" on public.user_addresses;
drop policy if exists "user_addresses_update_self" on public.user_addresses;
drop policy if exists "user_addresses_delete_self" on public.user_addresses;

create policy "user_addresses_select_self" on public.user_addresses for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
create policy "user_addresses_insert_self" on public.user_addresses for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "user_addresses_update_self" on public.user_addresses for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_addresses_delete_self" on public.user_addresses for delete to authenticated
using ((select auth.uid()) = user_id);

-- user_notification_preferences
drop policy if exists "user_notif_select_self" on public.user_notification_preferences;
drop policy if exists "user_notif_upsert_self" on public.user_notification_preferences;
drop policy if exists "user_notif_update_self" on public.user_notification_preferences;
drop policy if exists "user_notif_delete_self" on public.user_notification_preferences;

create policy "user_notif_select_self" on public.user_notification_preferences for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
create policy "user_notif_upsert_self" on public.user_notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "user_notif_update_self" on public.user_notification_preferences for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_notif_delete_self" on public.user_notification_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

-- wishlist_items
drop policy if exists "wishlist_items_select_self" on public.wishlist_items;
drop policy if exists "wishlist_items_insert_self" on public.wishlist_items;
drop policy if exists "wishlist_items_delete_self" on public.wishlist_items;

create policy "wishlist_items_select_self" on public.wishlist_items for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
create policy "wishlist_items_insert_self" on public.wishlist_items for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "wishlist_items_delete_self" on public.wishlist_items for delete to authenticated
using ((select auth.uid()) = user_id);

-- reviews
drop policy if exists "reviews_insert_reviewer" on public.reviews;
drop policy if exists "reviews_update_reviewer" on public.reviews;
drop policy if exists "reviews_delete_reviewer" on public.reviews;

create policy "reviews_insert_reviewer" on public.reviews for insert to authenticated
with check ((select auth.uid()) = reviewer_id);
create policy "reviews_update_reviewer" on public.reviews for update to authenticated
using ((select auth.uid()) = reviewer_id or public.is_admin())
with check ((select auth.uid()) = reviewer_id or public.is_admin());
create policy "reviews_delete_reviewer" on public.reviews for delete to authenticated
using ((select auth.uid()) = reviewer_id or public.is_admin());

-- message_threads
drop policy if exists "threads_select_member" on public.message_threads;
drop policy if exists "threads_insert_member" on public.message_threads;
drop policy if exists "threads_update_member" on public.message_threads;

create policy "threads_select_member" on public.message_threads for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id) or public.is_admin());
create policy "threads_insert_member" on public.message_threads for insert to authenticated
with check ((select auth.uid()) in (buyer_id, seller_id));
create policy "threads_update_member" on public.message_threads for update to authenticated
using ((select auth.uid()) in (buyer_id, seller_id) or public.is_admin())
with check ((select auth.uid()) in (buyer_id, seller_id) or public.is_admin());

-- messages
drop policy if exists "messages_select_member" on public.messages;
drop policy if exists "messages_insert_member" on public.messages;
drop policy if exists "messages_update_member" on public.messages;

create policy "messages_select_member" on public.messages for select to authenticated
using (
  exists (
    select 1 from public.message_threads mt
    where mt.id = messages.thread_id
      and ((select auth.uid()) in (mt.buyer_id, mt.seller_id) or public.is_admin())
  )
);
create policy "messages_insert_member" on public.messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1 from public.message_threads mt
    where mt.id = thread_id and (select auth.uid()) in (mt.buyer_id, mt.seller_id)
  )
);
create policy "messages_update_member" on public.messages for update to authenticated
using (
  exists (
    select 1 from public.message_threads mt
    where mt.id = messages.thread_id and (select auth.uid()) in (mt.buyer_id, mt.seller_id)
  )
)
with check (
  exists (
    select 1 from public.message_threads mt
    where mt.id = messages.thread_id and (select auth.uid()) in (mt.buyer_id, mt.seller_id)
  )
);

-- login_events
drop policy if exists "login_events_select_self" on public.login_events;
drop policy if exists "login_events_insert_self" on public.login_events;

create policy "login_events_select_self" on public.login_events for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
create policy "login_events_insert_self" on public.login_events for insert to authenticated
with check ((select auth.uid()) = user_id);

-- account_deletion_requests
drop policy if exists "del_req_select_self"  on public.account_deletion_requests;
drop policy if exists "del_req_insert_self"  on public.account_deletion_requests;
drop policy if exists "del_req_update_self"  on public.account_deletion_requests;

create policy "del_req_select_self" on public.account_deletion_requests for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
create policy "del_req_insert_self" on public.account_deletion_requests for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "del_req_update_self" on public.account_deletion_requests for update to authenticated
using ((select auth.uid()) = user_id or public.is_admin())
with check (
  public.is_admin()
  or ((select auth.uid()) = user_id and status in ('pending','cancelled'))
);;
