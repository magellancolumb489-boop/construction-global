begin;

-- --- Reference-level helpers (keep aligned with lib/materials-logistics/catalog.ts)

create or replace function public.materials_vehicle_payload_valid(p_vehicle text, p_payload numeric)
returns boolean
language sql
immutable
as $$
  select case trim(both from upper(p_vehicle))
    when 'DUBA' then p_payload in (1, 1.5, 2, 3.5)
    when 'AUTOUTILITARA' then p_payload in (1, 1.5, 2, 3.5)
    when 'CAMION_BENA' then p_payload in (7.5, 12, 18)
    when 'CAMION_HIAB' then p_payload in (7.5, 12, 18)
    when 'TIR' then p_payload in (22, 23, 24)
    when 'TRAILER' then p_payload in (24, 26, 28, 30)
    when 'AUTOBASCULANTA' then p_payload in (8, 12, 18, 24)
    else false
  end;
$$;

create or replace function public.materials_marketplace_vehicle_allowed(
  p_category text,
  p_vehicle text,
  p_payload numeric,
  p_allow_non_bulk boolean
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_ok boolean;
begin
  if not public.materials_vehicle_payload_valid(p_vehicle, p_payload) then
    return false;
  end if;

  v_ok := trim(both from upper(p_vehicle));

  if p_category in ('AGREGATE_CARIERA', 'AGREGATE_BALASTIERA') then
    if v_ok = 'AUTOBASCULANTA' then
      return true;
    end if;
    return coalesce(p_allow_non_bulk, false);
  end if;

  if v_ok = 'AUTOBASCULANTA' then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.materials_estimate_mass_kg(
  p_unit text,
  p_qty numeric,
  p_pallet_total_kg numeric,
  p_pallet_count numeric
)
returns numeric
language plpgsql
immutable
as $$
declare
  u text := trim(both from upper(coalesce(p_unit, '')));
begin
  if p_pallet_count is not null and p_pallet_count > 0
     and p_pallet_total_kg is not null and p_pallet_total_kg > 0 then
    return p_pallet_count * p_pallet_total_kg;
  end if;

  if u = 'TON' then return p_qty * 1000; end if;
  if u = 'KG' then return p_qty; end if;
  if u = 'M3' then return p_qty * 1600; end if;
  if u = 'CUP' then return p_qty * 1500; end if;
  if u = 'CAMION' then return p_qty * 18000; end if;
  return greatest(p_qty * 25, 1);
end;
$$;

create or replace function public.materials_min_trips(
  p_mass_kg numeric,
  p_payload_t numeric
)
returns integer
language sql
immutable
as $$
  select greatest(1, ceil(p_mass_kg / greatest(p_payload_t * 1000, 0.001))::integer);
$$;

commit;
;
