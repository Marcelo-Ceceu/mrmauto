
-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Vehicle info
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  color TEXT,
  fuel TEXT,
  transmission TEXT,
  plate TEXT,
  renavam TEXT,
  chassis TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  -- Purchase
  purchase_date DATE,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Owner (seller to us)
  owner_name TEXT,
  owner_cpf TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  owner_address TEXT,
  -- Pricing
  profit_margin_pct NUMERIC(6,2) NOT NULL DEFAULT 20,
  -- Sale
  status TEXT NOT NULL DEFAULT 'available', -- available | reserved | sold
  sale_date DATE,
  sale_price NUMERIC(12,2),
  payment_method TEXT, -- cash | financed | trade | mixed
  payment_installments INTEGER,
  intermediary_commission NUMERIC(12,2) DEFAULT 0,
  -- Buyer
  buyer_name TEXT,
  buyer_cpf TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_user ON public.vehicles(user_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vehicles select" ON public.vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own vehicles insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vehicles update" ON public.vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vehicles delete" ON public.vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Vehicle expenses
CREATE TABLE public.vehicle_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other', -- ipva | fines | transfer | repair | detailing | parts | other
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_vehicle ON public.vehicle_expenses(vehicle_id);
CREATE INDEX idx_expenses_user ON public.vehicle_expenses(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_expenses TO authenticated;
GRANT ALL ON public.vehicle_expenses TO service_role;

ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own expenses select" ON public.vehicle_expenses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own expenses insert" ON public.vehicle_expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own expenses update" ON public.vehicle_expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own expenses delete" ON public.vehicle_expenses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for photos (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users can view own vehicle photos" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "users can upload own vehicle photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users can update own vehicle photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users can delete own vehicle photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
