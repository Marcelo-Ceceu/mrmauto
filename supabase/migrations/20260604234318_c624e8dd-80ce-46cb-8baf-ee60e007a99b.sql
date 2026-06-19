ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set the first user as admin if no admin exists
UPDATE public.profiles 
SET is_admin = TRUE 
WHERE id IN (
  SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1
) AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE is_admin = TRUE
);
