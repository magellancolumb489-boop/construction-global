-- Multi-type marketplace listings: wizard fields for concrete transport, materials, equipment, services.
-- Run against your Supabase project (SQL editor or supabase db push).

alter table public.marketplace_listings
  add column if not exists listing_type text not null default 'materials'
    check (listing_type in ('concrete', 'materials', 'equipment', 'services'));

alter table public.marketplace_listings
  add column if not exists pickup_address text,
  add column if not exists pickup_lat double precision,
  add column if not exists pickup_lng double precision,
  add column if not exists transport_modes text[],
  add column if not exists min_order_qty numeric,
  add column if not exists transport_fee numeric,
  add column if not exists service_area text,
  add column if not exists equipment_condition text,
  add column if not exists equipment_model text,
  add column if not exists equipment_year integer;

comment on column public.marketplace_listings.listing_type is 'Wizard listing kind: concrete (calculator distance), materials (fixed transport fee), equipment, services.';
comment on column public.marketplace_listings.transport_fee is 'Fixed delivery fee (RON/EUR per seller); added once per cart line for non-concrete listings when set.';
comment on column public.marketplace_listings.transport_modes is 'For concrete: subset of CIFA, POMPA, VRAC.';
