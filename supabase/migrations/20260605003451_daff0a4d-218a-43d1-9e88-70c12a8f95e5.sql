ALTER TABLE public.vehicles ADD COLUMN tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN tax_rate NUMERIC DEFAULT 6;

-- Update existing records to have default tax_rate
UPDATE public.vehicles SET tax_rate = 6 WHERE tax_rate IS NULL;