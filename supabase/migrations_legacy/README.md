# Legacy migrations (do not apply)

These are the repo's original migration files. They were never applied under these version numbers. The live project (`mfmhsicriufttcztljzv`) was built with the SQL now in `../migrations/`, which is copied verbatim from `supabase_migrations.schema_migrations` on 2026-11-20.

Differences found on that date:
- Live has 4 migrations that never existed in the repo: `baseline_marketplace` (profiles, categories, listings, images, `handle_new_user`), `security_advisor_fixes`, `performance_fixes`, `extend_public_profiles_company_fields`.
- `20260513120000_place_order_seller_auth_email.sql` has no live counterpart. Its change (`auth_email` in the seller snapshot) is already inside live `place_order_rpc_and_payload` / `materials_logistics_place_order`.
- The other files differ mainly in formatting. Live adds a `transport_modes` CHECK and `set search_path` on `tg_touch_updated_at`. The repo's `storage_policies` also drops the old `auction-images` policies.

Keep this folder for history only. New migrations go in `../migrations/`.
