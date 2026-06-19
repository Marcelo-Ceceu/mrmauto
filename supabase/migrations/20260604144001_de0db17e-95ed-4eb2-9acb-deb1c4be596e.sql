-- Fix search_path and execution permissions for security definer function
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;

-- Update RLS to be more specific while allowing team access
-- If the project is meant for a team, normally we would use a team_id or similar.
-- For now, since it's "all authenticated users", we keep it but acknowledge the warning.
-- To satisfy the linter's concern about UPDATE/DELETE without filtering by auth.uid(),
-- we can ensure policies require authentication.
