-- Storage remove() needs SELECT + DELETE on the object. security_advisor_fixes
-- dropped the broad public-read SELECT policies (to stop bucket listing), which
-- left owners unable to delete their own files. Public buckets still serve files
-- by public URL without any SELECT policy; this only lets an owner see and
-- delete objects inside their own {uid}/ folder.
drop policy if exists "listing-images owner select" on storage.objects;
create policy "listing-images owner select"
on storage.objects for select to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatars owner select" on storage.objects;
create policy "avatars owner select"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Advisor 0011: pin search_path on the materials helpers (pure functions).
alter function public.materials_estimate_mass_kg(text, numeric, numeric, numeric) set search_path = '';
alter function public.materials_marketplace_vehicle_allowed(text, text, numeric, boolean) set search_path = '';
alter function public.materials_min_trips(numeric, numeric) set search_path = '';
alter function public.materials_vehicle_payload_valid(text, numeric) set search_path = '';
