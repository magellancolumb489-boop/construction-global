-- Supabase default privileges grant EXECUTE on new functions to anon and
-- authenticated directly, so the earlier "revoke ... from public" did nothing.

-- _build_order_payload has no caller check: any client with an order uuid could
-- read the full order (buyer/seller snapshots). Only place_order (definer) calls it.
revoke execute on function public._build_order_payload(uuid) from public, anon, authenticated;

-- Writers require a session; anon has none. Defense in depth.
revoke execute on function public.place_order(jsonb, jsonb, jsonb, text, text) from public, anon;
revoke execute on function public.upsert_listing_concrete_classes(bigint, jsonb) from public, anon;
revoke execute on function public.upsert_listing_material_logistics(bigint, jsonb, jsonb) from public, anon;
revoke execute on function public.get_my_profile() from public, anon;

-- is_admin stays executable by anon: public listing RLS policies call it.
