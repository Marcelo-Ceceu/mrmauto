ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Update existing available vehicles to be published
UPDATE public.vehicles SET is_published = true WHERE status = 'available';
-- Update sold vehicles to not be published by default
UPDATE public.vehicles SET is_published = false WHERE status = 'sold';

-- Re-grant permissions
GRANT ALL ON public.vehicles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
