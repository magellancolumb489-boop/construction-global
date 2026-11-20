begin;

alter table public.marketplace_listing_material_spec enable row level security;
alter table public.marketplace_listing_material_transport enable row level security;

drop policy if exists "listing_material_spec_select" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_select"
on public.marketplace_listing_material_spec
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_material_spec.listing_id
      and (
        ml.is_active = true
        or (auth.uid() is not null and ml.seller_id = auth.uid())
        or public.is_admin()
      )
  )
);

drop policy if exists "listing_material_spec_insert" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_insert"
on public.marketplace_listing_material_spec
for insert
to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = auth.uid()
  )
);

drop policy if exists "listing_material_spec_update" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_update"
on public.marketplace_listing_material_spec
for update
to authenticated
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

drop policy if exists "listing_material_spec_delete" on public.marketplace_listing_material_spec;
create policy "listing_material_spec_delete"
on public.marketplace_listing_material_spec
for delete
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_material_transport_select" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_select"
on public.marketplace_listing_material_transport
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_material_transport.listing_id
      and (
        ml.is_active = true
        or (auth.uid() is not null and ml.seller_id = auth.uid())
        or public.is_admin()
      )
  )
);

drop policy if exists "listing_material_transport_insert" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_insert"
on public.marketplace_listing_material_transport
for insert
to authenticated
with check (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and ml.seller_id = auth.uid()
  )
);

drop policy if exists "listing_material_transport_update" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_update"
on public.marketplace_listing_material_transport
for update
to authenticated
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

drop policy if exists "listing_material_transport_delete" on public.marketplace_listing_material_transport;
create policy "listing_material_transport_delete"
on public.marketplace_listing_material_transport
for delete
to authenticated
using (
  exists (
    select 1 from public.marketplace_listings ml
    where ml.id = listing_id and (ml.seller_id = auth.uid() or public.is_admin())
  )
);

commit;
;
