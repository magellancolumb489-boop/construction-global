create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

do $$
begin
  begin
    alter table public.marketplace_listings
      drop constraint if exists marketplace_listings_price_check;
  exception when others then null;
  end;

  alter table public.marketplace_listings
    add constraint marketplace_listings_price_check
    check (price > 0);
end $$;

drop trigger if exists touch_updated_at on public.profiles;
create trigger touch_updated_at
  before update on public.profiles
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists touch_updated_at on public.categories;
create trigger touch_updated_at
  before update on public.categories
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists touch_updated_at on public.marketplace_listings;
create trigger touch_updated_at
  before update on public.marketplace_listings
  for each row execute function public.tg_touch_updated_at();

alter table public.profiles                    enable row level security;
alter table public.categories                  enable row level security;
alter table public.marketplace_listings        enable row level security;
alter table public.marketplace_listing_images  enable row level security;

do $$
begin
  execute 'alter table public.profiles                   force row level security';
  execute 'alter table public.categories                 force row level security';
  execute 'alter table public.marketplace_listings       force row level security';
  execute 'alter table public.marketplace_listing_images force row level security';
exception when others then
  null;
end $$;

drop policy if exists "profiles_select_self_or_admin"     on public.profiles;
drop policy if exists "profiles_select_public"            on public.profiles;
drop policy if exists "profiles_select_public_via_view"   on public.profiles;
drop policy if exists "profiles_update_self"              on public.profiles;
drop policy if exists "profiles_insert_self"              on public.profiles;
drop policy if exists "profiles_no_delete"                on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (auth.uid() = id or public.is_admin());

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_insert_self"
on public.profiles for insert to authenticated
with check (false);

create policy "profiles_no_delete"
on public.profiles for delete to authenticated
using (false);

create or replace function public.tg_profiles_block_role_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role changes are admin-only' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_role_update on public.profiles;
create trigger profiles_block_role_update
  before update on public.profiles
  for each row execute function public.tg_profiles_block_role_update();

create or replace view public.public_profiles
with (security_invoker = true) as
select id, display_name, avatar_path
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create policy "profiles_select_public_via_view"
on public.profiles for select to anon, authenticated
using (true);

revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_path) on public.profiles to anon, authenticated;

drop policy if exists "categories_select_public"    on public.categories;
drop policy if exists "categories_admin_insert"     on public.categories;
drop policy if exists "categories_admin_update"     on public.categories;
drop policy if exists "categories_admin_delete"     on public.categories;

create policy "categories_select_public"
on public.categories for select to anon, authenticated
using (is_active = true or public.is_admin());

create policy "categories_admin_insert"
on public.categories for insert to authenticated
with check (public.is_admin());

create policy "categories_admin_update"
on public.categories for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "categories_admin_delete"
on public.categories for delete to authenticated
using (public.is_admin());

drop policy if exists "listings_select_public_or_owner"  on public.marketplace_listings;
drop policy if exists "listings_insert_self"             on public.marketplace_listings;
drop policy if exists "listings_update_owner"            on public.marketplace_listings;
drop policy if exists "listings_delete_owner"            on public.marketplace_listings;

create policy "listings_select_public_or_owner"
on public.marketplace_listings for select to anon, authenticated
using (
  is_active = true
  or (auth.uid() is not null and seller_id = auth.uid())
  or public.is_admin()
);

create policy "listings_insert_self"
on public.marketplace_listings for insert to authenticated
with check (auth.uid() = seller_id);

create policy "listings_update_owner"
on public.marketplace_listings for update to authenticated
using (auth.uid() = seller_id or public.is_admin())
with check (auth.uid() = seller_id or public.is_admin());

create policy "listings_delete_owner"
on public.marketplace_listings for delete to authenticated
using (auth.uid() = seller_id or public.is_admin());

create or replace function public.tg_listings_lock_seller_id()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.seller_id is distinct from old.seller_id then
    raise exception 'seller_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_lock_seller_id on public.marketplace_listings;
create trigger listings_lock_seller_id
  before update on public.marketplace_listings
  for each row execute function public.tg_listings_lock_seller_id();

drop policy if exists "listing_images_select"  on public.marketplace_listing_images;
drop policy if exists "listing_images_insert"  on public.marketplace_listing_images;
drop policy if exists "listing_images_update"  on public.marketplace_listing_images;
drop policy if exists "listing_images_delete"  on public.marketplace_listing_images;

create policy "listing_images_select"
on public.marketplace_listing_images for select to anon, authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = marketplace_listing_images.listing_id
      and (ml.is_active = true
           or (auth.uid() is not null and ml.seller_id = auth.uid())
           or public.is_admin())
  )
);

create policy "listing_images_insert"
on public.marketplace_listing_images for insert to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = auth.uid()
  )
);

create policy "listing_images_update"
on public.marketplace_listing_images for update to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

create policy "listing_images_delete"
on public.marketplace_listing_images for delete to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

create index if not exists marketplace_listings_seller_id_idx on public.marketplace_listings (seller_id);
create index if not exists marketplace_listings_is_active_idx on public.marketplace_listings (is_active);
create index if not exists marketplace_listing_images_listing_id_idx on public.marketplace_listing_images (listing_id);

comment on function public.is_admin() is
  'RLS helper: true if the current session user has profiles.role = admin.';
comment on view public.public_profiles is
  'Anon/auth-safe projection of profiles (display_name, avatar_path).';;
