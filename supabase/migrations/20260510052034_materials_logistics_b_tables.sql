begin;

-- --- Tables

create table if not exists public.marketplace_listing_material_spec (
  listing_id bigint primary key references public.marketplace_listings (id) on delete cascade,
  category_code text not null,
  material_code text not null,
  pallet_sac_kg numeric,
  pallet_pieces numeric,
  pallet_total_kg numeric,
  max_piece_length_m numeric,
  macara_addon boolean not null default false,
  macara_fee numeric default 0,
  allow_non_bulk_transport boolean not null default false,
  created_at timestamptz not null default now(),
  constraint marketplace_listing_material_spec_category_chk check (
    category_code in (
      'ALTE_MATERIALE',
      'AGREGATE_CARIERA',
      'AGREGATE_BALASTIERA',
      'DIMENSIUNI_MEDII',
      'DIMENSIUNI_MICI'
    )
  ),
  constraint marketplace_listing_material_spec_macara_fee_chk check (macara_fee is null or macara_fee >= 0)
);

comment on table public.marketplace_listing_material_spec is
  'Per-listing materials taxonomy + pallet/long-piece/macara flags for listing_type = materials.';

create table if not exists public.marketplace_listing_material_transport (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.marketplace_listings (id) on delete cascade,
  vehicle_code text not null,
  payload_t numeric not null,
  created_at timestamptz not null default now(),
  constraint marketplace_listing_material_transport_vehicle_chk check (
    vehicle_code in (
      'DUBA',
      'AUTOUTILITARA',
      'CAMION_BENA',
      'CAMION_HIAB',
      'TIR',
      'TRAILER',
      'AUTOBASCULANTA'
    )
  ),
  constraint marketplace_listing_material_transport_payload_chk check (
    public.materials_vehicle_payload_valid(vehicle_code, payload_t)
  ),
  constraint marketplace_listing_material_transport_uniq unique (listing_id, vehicle_code, payload_t)
);

create index if not exists marketplace_listing_material_transport_listing_id_idx
  on public.marketplace_listing_material_transport (listing_id);

comment on table public.marketplace_listing_material_transport is
  'Seller-declared vehicle capacities for materials listings (multiple rows per listing).';

commit;
;
