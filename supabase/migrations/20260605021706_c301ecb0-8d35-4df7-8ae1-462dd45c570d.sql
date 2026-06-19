
-- 1) PROFILES: restrict public read
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Prevent privilege escalation via trigger (RLS WITH CHECK can't reference OLD)
CREATE OR REPLACE FUNCTION public.prevent_is_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    ) THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_is_admin_escalation ON public.profiles;
CREATE TRIGGER prevent_is_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_is_admin_escalation();

REVOKE EXECUTE ON FUNCTION public.prevent_is_admin_escalation() FROM PUBLIC, anon, authenticated;

-- 2) VEHICLES: restrict columns visible to anonymous visitors (hide PII)
REVOKE SELECT ON public.vehicles FROM anon;
GRANT SELECT (
  id, brand, model, year, mileage, color, fuel, transmission,
  photos, status, asking_price, purchase_price, ad_text,
  created_at, updated_at
) ON public.vehicles TO anon;

-- 3) SETTINGS: only admins can modify
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4) Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5) Revoke EXECUTE on SECURITY DEFINER trigger functions (they're invoked by triggers, not clients)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
