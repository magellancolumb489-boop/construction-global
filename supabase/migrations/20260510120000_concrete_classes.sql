-- Per-class concrete specs for marketplace listings (seller wizard).
-- transport_modes for concrete must not include VRAC (materials-only mode).

-- Strip VRAC from existing concrete rows so the new CHECK can be applied.
update public.marketplace_listings ml
set transport_modes = array_remove(ml.transport_modes, 'VRAC')
where ml.listing_type = 'concrete'
  and ml.transport_modes is not null
  and 'VRAC' = any (ml.transport_modes);

create table if not exists public.marketplace_listing_concrete_classes (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.marketplace_listings (id) on delete cascade,
  class_code text not null,
  consistencies text[] not null,
  price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint marketplace_listing_concrete_classes_class_code_chk check (
    class_code in (
      'C8/10',
      'C12/15',
      'C16/20',
      'C20/25',
      'C25/30',
      'C30/37',
      'C35/45'
    )
  ),
  constraint marketplace_listing_concrete_classes_consistencies_chk check (
    array_length(consistencies, 1) >= 1
    and consistencies <@ array['vartos', 'semivartos', 'pompabil', 'moale']::text[]
  ),
  constraint marketplace_listing_concrete_classes_price_chk check (price > 0),
  constraint marketplace_listing_concrete_classes_listing_class_uniq unique (listing_id, class_code)
);

create index if not exists marketplace_listing_concrete_classes_listing_id_idx
  on public.marketplace_listing_concrete_classes (listing_id);

comment on table public.marketplace_listing_concrete_classes is
  'Concrete strength classes + consistencies + per-class price for listing_type = concrete.';

alter table public.marketplace_listing_concrete_classes enable row level security;

-- Read: same visibility as parent listing (active public, owner sees all).
drop policy if exists "listing_concrete_classes_select" on public.marketplace_listing_concrete_classes;
create policy "listing_concrete_classes_select"
on public.marketplace_listing_concrete_classes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_concrete_classes.listing_id
      and (
        ml.is_active = true
        or (auth.uid() is not null and ml.seller_id = auth.uid())
        or public.is_admin()
      )
  )
);

drop policy if exists "listing_concrete_classes_insert" on public.marketplace_listing_concrete_classes;
create policy "listing_concrete_classes_insert"
on public.marketplace_listing_concrete_classes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = listing_id
      and ml.seller_id = auth.uid()
  )
);

drop policy if exists "listing_concrete_classes_update" on public.marketplace_listing_concrete_classes;
create policy "listing_concrete_classes_update"
on public.marketplace_listing_concrete_classes
for update
to authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = listing_id
      and (ml.seller_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = listing_id
      and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_concrete_classes_delete" on public.marketplace_listing_concrete_classes;
create policy "listing_concrete_classes_delete"
on public.marketplace_listing_concrete_classes
for delete
to authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = listing_id
      and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

-- Concrete listings cannot advertise VRAC transport.
alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_concrete_no_vrac_chk;

alter table public.marketplace_listings
  add constraint marketplace_listings_concrete_no_vrac_chk check (
    listing_type <> 'concrete'
    or transport_modes is null
    or not ('VRAC' = any (transport_modes))
  );

comment on column public.marketplace_listings.transport_modes is
  'For concrete: CIFA and/or POMPA only. VRAC is for materials / other flows, not concrete listings.';

-- Transactional replace of all rows for one listing (called after listing insert/update).
create or replace function public.upsert_listing_concrete_classes (
  p_listing_id bigint,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
begin
  if p_listing_id is null or p_listing_id <= 0 then
    raise exception 'Invalid listing id';
  end if;

  select seller_id into v_seller from public.marketplace_listings where id = p_listing_id;
  if v_seller is null then
    raise exception 'Listing not found';
  end if;
  if v_seller is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.marketplace_listing_concrete_classes
  where listing_id = p_listing_id;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return;
  end if;

  insert into public.marketplace_listing_concrete_classes (
    listing_id,
    class_code,
    consistencies,
    price
  )
  select
    p_listing_id,
    trim(both from (elem->>'class_code')),
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(elem->'consistencies', '[]'::jsonb))
      ),
      array[]::text[]
    ),
    (elem->>'price')::numeric
  from jsonb_array_elements(p_rows) as elem;
end;
$$;

revoke all on function public.upsert_listing_concrete_classes (bigint, jsonb) from public;
grant execute on function public.upsert_listing_concrete_classes (bigint, jsonb) to authenticated;
