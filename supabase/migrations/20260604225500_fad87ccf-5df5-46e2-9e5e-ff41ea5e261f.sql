ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS ad_text TEXT;
COMMENT ON COLUMN public.vehicles.ad_text IS 'Texto gerado para anúncio do veículo';
