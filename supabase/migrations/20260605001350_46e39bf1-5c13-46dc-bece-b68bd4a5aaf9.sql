CREATE POLICY "Allow public read access to vehicles"
ON public.vehicles
FOR SELECT
USING (true);

GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.vehicles TO authenticated;
