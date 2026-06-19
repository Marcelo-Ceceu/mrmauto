-- Drop all existing policies for affected tables to ensure a clean slate
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('vehicles', 'vehicle_expenses', 'negotiations', 'installments', 'settings', 'profiles')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 1. Vehicles table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published vehicles" ON public.vehicles
FOR SELECT USING (is_published = true AND (status = 'available' OR status = 'maintenance'));

CREATE POLICY "Authenticated users can manage vehicles" ON public.vehicles
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Vehicle expenses
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage vehicle_expenses" ON public.vehicle_expenses
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Negotiations
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage negotiations" ON public.negotiations
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage installments" ON public.installments
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read specific settings" ON public.settings
FOR SELECT USING (key IN ('whatsapp_number', 'company_name'));

CREATE POLICY "Authenticated users can manage settings" ON public.settings
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Ensure correct GRANTS
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

GRANT ALL ON public.vehicle_expenses TO authenticated;
GRANT ALL ON public.vehicle_expenses TO service_role;

GRANT ALL ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;

GRANT ALL ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
