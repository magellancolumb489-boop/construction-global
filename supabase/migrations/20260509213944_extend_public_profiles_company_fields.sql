CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  avatar_path,
  company_name,
  entity_type
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;;
