# Testing Checklist — Schema-to-Code Integration + Batch 2

## DB Access

- [ ] `GET /api/supabase-health` returns `{ healthy: true }`
- [ ] `/test/categories` renders the 4 seeded categories in a table
- [ ] `/test/profile` (logged in) shows the current user's profile row from `public.profiles`

## RLS Behavior

### Categories
- [ ] Anonymous visitor can see active categories (`is_active = true`)
- [ ] Authenticated user can see active categories
- [ ] Inactive categories (`is_active = false`) are never returned

### Profiles
- [ ] Authenticated user can SELECT their own profile row
- [ ] Authenticated user can UPDATE only `display_name`, `phone`, `avatar_path` on their own row
- [ ] Authenticated user cannot SELECT or UPDATE another user's row

### Marketplace Listings
- [ ] Anonymous can read active listings (`is_active = true`)
- [ ] Authenticated user can read active listings
- [ ] Authenticated user can INSERT a listing with their own `seller_id`
- [ ] INSERT with a different `seller_id` is rejected by RLS
- [ ] Only the listing owner can UPDATE their listing
- [ ] Only the listing owner can DELETE their listing
- [ ] Inactive listings (`is_active = false`) are not returned by SELECT

### Listing Images
- [ ] Anyone can read images belonging to active listings
- [ ] Listing owner can INSERT image rows for their own listing
- [ ] Listing owner can DELETE image rows for their own listing
- [ ] Deleting a listing cascades and removes all its image rows

## Signup / Profile Trigger

- [ ] Register a new user via `/register` with a display name
- [ ] Check `public.profiles` — a row was created with the correct `display_name`
- [ ] Verify `created_at` and `updated_at` are populated
- [ ] Verify `role` defaults to `'user'`
- [ ] Register a user without a display name — trigger falls back to email prefix

## App Integration

- [ ] Header shows correct auth state (logged in vs. logged out)
- [ ] `/account` fetches the real profile from `public.profiles`, not mock data
- [ ] Saving profile changes on `/account` persists to `public.profiles` (verify with `/test/profile`)
- [ ] `/login` and `/register` redirect to `/account` when already authenticated
- [ ] Categories test page (`/test/categories`) works for both anon and authenticated

## Storage (listing-images bucket)

- [ ] Upload an image via `uploadListingImage()` — file appears in `listing-images` bucket under `{user_id}/` prefix
- [ ] Image URL from `getImagePublicUrl()` is publicly readable
- [ ] Uploading to another user's folder is rejected by storage policy
- [ ] Deleting own uploaded file succeeds

## File Inventory

| File | Purpose |
|---|---|
| `types/supabase.ts` | Auto-generated DB types (profiles, categories, marketplace_listings, marketplace_listing_images) |
| `lib/supabase/client.ts` | Browser Supabase client with `Database` generic |
| `lib/supabase/server.ts` | Server Supabase client with `Database` generic |
| `lib/api/profile.ts` | Server-side `getProfile()` |
| `lib/api/profile-client.ts` | Client-side `updateProfile()` |
| `lib/api/categories.ts` | Server-side `getCategories()` |
| `lib/api/listings.ts` | Server-side `getListings()`, `getListingDetail()` |
| `lib/api/listings-client.ts` | Client-side `createListing()`, `updateListing()`, `deleteListing()`, `uploadListingImage()`, `getImagePublicUrl()` |
| `app/test/categories/page.tsx` | Categories test page |
| `app/test/profile/page.tsx` | Profile test page (server) |
| `app/test/profile/profile-test-form.tsx` | Profile test form (client) |
| `app/account/page.tsx` | Account page — fetches real profile |
| `app/account/account-content.tsx` | Account UI — saves to Supabase |
| `types/domain.ts` | User type aligned with DB (`role: 'user' | 'admin'`) |
