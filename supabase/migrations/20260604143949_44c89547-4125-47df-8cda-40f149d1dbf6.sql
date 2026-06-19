-- Add new columns to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS asking_price NUMERIC(12,2);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trade_in_vehicle_id UUID REFERENCES public.vehicles(id);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_trade_in BOOLEAN DEFAULT false;

-- Add created_by to expenses for traceability
ALTER TABLE public.vehicle_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create a profiles table for user traceability (names)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS and setup profile trigger
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users into profiles if any
INSERT INTO public.profiles (id, full_name, email)
SELECT id, raw_user_meta_data->>'full_name', email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Update RLS policies to allow shared access within the same project (shared user_id check removed or broadened)
-- Since the user wants "other people to have access", we allow authenticated users to see everything.
DROP POLICY IF EXISTS "Users can manage their own vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can manage all vehicles" ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage their own expenses" ON public.vehicle_expenses;
CREATE POLICY "Authenticated users can manage all expenses" ON public.vehicle_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_expenses TO authenticated;
