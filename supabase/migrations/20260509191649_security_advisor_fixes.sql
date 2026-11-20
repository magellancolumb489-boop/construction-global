-- Fix: revoke direct RPC access on trigger-only SECURITY DEFINER functions.
-- These are meant to fire as triggers, not be called via /rest/v1/rpc.
revoke execute on function public.tg_messages_touch_thread() from public, anon, authenticated;
revoke execute on function public.tg_profiles_block_role_update() from public, anon, authenticated;

-- Fix: revoke is_admin from anon (only authenticated needs it; anon has no session).
revoke execute on function public.is_admin() from anon;

-- Fix: revoke set_user_role from anon (admin-only RPC; gate at grant level too).
revoke execute on function public.set_user_role(uuid, text) from anon;

-- Fix: drop broad SELECT policies on public buckets. Public buckets serve via
-- public URL without needing storage.objects SELECT policy. This prevents
-- clients from listing all files in the bucket.
drop policy if exists "listing-images public read" on storage.objects;
drop policy if exists "avatars public read" on storage.objects;;
