insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 10 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "listing-images public read"  on storage.objects;
drop policy if exists "listing-images owner insert" on storage.objects;
drop policy if exists "listing-images owner update" on storage.objects;
drop policy if exists "listing-images owner delete" on storage.objects;

create policy "listing-images public read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'listing-images');

create policy "listing-images owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "listing-images owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "listing-images owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);;
