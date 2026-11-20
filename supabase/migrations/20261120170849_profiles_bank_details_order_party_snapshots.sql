-- Bank details for proformas + frozen platform identity per order (docs/AUDIT.md 3e).
-- iban / bank_name are NOT in the anon/authenticated column grants on profiles,
-- so they are readable only through get_my_profile() and order snapshots.
alter table public.profiles
  add column if not exists iban text,
  add column if not exists bank_name text;
alter table public.profiles drop constraint if exists profiles_iban_format;
alter table public.profiles add constraint profiles_iban_format
  check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$');

alter table public.orders add column if not exists platform_snapshot jsonb;

-- Snapshots are frozen at order time so a proforma never changes after the fact.
create or replace function public.tg_orders_enrich_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select coalesce(new.seller_snapshot, '{}'::jsonb)
         || jsonb_build_object('iban', p.iban, 'bank_name', p.bank_name)
  into new.seller_snapshot
  from public.profiles p where p.id = new.seller_id;

  select platform_identity into new.platform_snapshot
  from public.platform_settings where id = 1;
  return new;
end;
$$;
revoke execute on function public.tg_orders_enrich_snapshots() from public, anon, authenticated;
drop trigger if exists orders_enrich_snapshots on public.orders;
create trigger orders_enrich_snapshots before insert on public.orders
  for each row execute function public.tg_orders_enrich_snapshots();
