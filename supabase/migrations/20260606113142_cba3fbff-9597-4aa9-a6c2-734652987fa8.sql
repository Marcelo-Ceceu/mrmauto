-- Table for negotiations/sales
CREATE TABLE public.negotiations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    buyer_name TEXT,
    buyer_cpf TEXT,
    buyer_phone TEXT,
    buyer_email TEXT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sale_price NUMERIC(15, 2) NOT NULL,
    trade_in_vehicle_id UUID REFERENCES public.vehicles(id),
    trade_in_value NUMERIC(15, 2) DEFAULT 0,
    cash_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    payment_method TEXT, -- 'cash', 'installments', 'mixed'
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for installments/payments
CREATE TABLE public.installments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update vehicles table to support trade-in tracking
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS origin_negotiation_id UUID REFERENCES public.negotiations(id);

-- RLS and Permissions
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;
GRANT ALL ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;

CREATE POLICY "Allow authenticated to manage negotiations" ON public.negotiations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to manage installments" ON public.installments FOR ALL USING (auth.role() = 'authenticated');

-- Updated at triggers
CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON public.negotiations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
