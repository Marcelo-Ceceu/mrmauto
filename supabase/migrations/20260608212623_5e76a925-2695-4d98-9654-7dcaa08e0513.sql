-- Refine management policies to be more explicit about authenticated access
-- This helps the linter understand that access is restricted to logged-in users.

-- 1. Vehicles
DROP POLICY IF EXISTS "Authenticated users can manage vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can manage vehicles" ON public.vehicles
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Vehicle expenses
DROP POLICY IF EXISTS "Authenticated users can manage vehicle_expenses" ON public.vehicle_expenses;
CREATE POLICY "Authenticated users can manage vehicle_expenses" ON public.vehicle_expenses
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Negotiations
DROP POLICY IF EXISTS "Authenticated users can manage negotiations" ON public.negotiations;
CREATE POLICY "Authenticated users can manage negotiations" ON public.negotiations
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Installments
DROP POLICY IF EXISTS "Authenticated users can manage installments" ON public.installments;
CREATE POLICY "Authenticated users can manage installments" ON public.installments
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. Settings
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
CREATE POLICY "Authenticated users can manage settings" ON public.settings
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 6. Negotiation Logs (Ensuring it's secured as well)
ALTER TABLE public.negotiation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage negotiation_logs" ON public.negotiation_logs;
CREATE POLICY "Authenticated users can manage negotiation_logs" ON public.negotiation_logs
FOR ALL TO authenticated USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
GRANT ALL ON public.negotiation_logs TO authenticated;
GRANT ALL ON public.negotiation_logs TO service_role;
