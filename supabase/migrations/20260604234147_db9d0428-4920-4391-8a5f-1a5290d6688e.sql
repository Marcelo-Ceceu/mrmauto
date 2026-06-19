ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS has_trade_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trade_in_entry_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_in_resale_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_in_status TEXT DEFAULT 'maintenance',
ADD COLUMN IF NOT EXISTS trade_in_publish BOOLEAN DEFAULT FALSE;

-- Create an index for has_trade_in for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_has_trade_in ON public.vehicles(has_trade_in);
