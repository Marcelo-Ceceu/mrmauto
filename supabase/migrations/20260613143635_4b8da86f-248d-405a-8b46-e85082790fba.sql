
-- Restrict anonymous (public) access on vehicles to non-sensitive columns only.
-- Prevents leakage of owner PII (CPF, name, phone, email, address), plate/renavam/chassis,
-- internal financials (purchase_price, profit_margin_pct, commission, taxes, buyer info, etc.)
-- and user_id ownership. Authenticated staff retain full access via existing RLS policy.

REVOKE ALL ON public.vehicles FROM anon;

GRANT SELECT (
  id,
  brand,
  model,
  year,
  mileage,
  color,
  fuel,
  transmission,
  photos,
  status,
  asking_price,
  ad_text,
  is_published,
  created_at,
  updated_at
) ON public.vehicles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
