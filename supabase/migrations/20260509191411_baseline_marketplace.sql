create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  phone         text,
  avatar_path   text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile, 1:1 with auth.users. Provisioned by handle_new_user trigger.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_display_name text;
begin
  if new.raw_user_meta_data is not null
     and coalesce(trim(new.raw_user_meta_data ->> 'display_name'), '') <> '' then
    derived_display_name := trim(new.raw_user_meta_data ->> 'display_name');
  elsif new.raw_user_meta_data is not null
     and coalesce(trim(new.raw_user_meta_data ->> 'full_name'), '') <> '' then
    derived_display_name := trim(new.raw_user_meta_data ->> 'full_name');
  elsif new.email is not null and position('@' in new.email) > 0 then
    derived_display_name := split_part(new.email, '@', 1);
  else
    derived_display_name := null;
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, derived_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  parent_id   bigint references public.categories(id) on delete set null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_categories_parent_id on public.categories (parent_id);
create index if not exists idx_categories_active_sort on public.categories (is_active, sort_order, id);

comment on table public.categories is
  'Hierarchical product categories. Read-only via REST; write paths via admin RPC or service role.';

create table if not exists public.marketplace_listings (
  id              bigint generated always as identity primary key,
  seller_id       uuid not null references public.profiles(id) on delete cascade,
  category_id     bigint references public.categories(id) on delete set null,
  title           text not null,
  slug            text not null unique,
  description     text,
  price           numeric not null check (price >= 0),
  unit            text not null check (unit in ('TON','KG','M3','BUC','ML')),
  currency        text not null default 'RON' check (currency in ('RON','EUR')),
  available_qty   numeric not null default 0 check (available_qty >= 0),
  is_active       boolean not null default true,
  location        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_seller_id  on public.marketplace_listings (seller_id);
create index if not exists idx_marketplace_listings_category_id on public.marketplace_listings (category_id);
create index if not exists idx_marketplace_listings_is_active   on public.marketplace_listings (is_active);

comment on table public.marketplace_listings is
  'Marketplace product listings created by sellers.';

create table if not exists public.marketplace_listing_images (
  id             bigint generated always as identity primary key,
  listing_id     bigint not null references public.marketplace_listings(id) on delete cascade,
  storage_path   text not null,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_marketplace_listing_images_listing_id
  on public.marketplace_listing_images (listing_id);

comment on table public.marketplace_listing_images is
  'Image metadata for marketplace listings. storage_path references storage.objects in listing-images bucket.';;
