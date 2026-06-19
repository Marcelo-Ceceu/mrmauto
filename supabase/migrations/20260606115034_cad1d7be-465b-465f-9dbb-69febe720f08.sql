-- Add down payment and installment config to negotiations
ALTER TABLE public.negotiations 
ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_payment_date DATE,
ADD COLUMN IF NOT EXISTS down_payment_method TEXT,
ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_installment_date DATE,
ADD COLUMN IF NOT EXISTS financial_status TEXT DEFAULT 'open';

-- Update installments table to include more details for tracking
ALTER TABLE public.installments
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS received_amount NUMERIC DEFAULT 0;

-- Function to update negotiation financial status
CREATE OR REPLACE FUNCTION public.update_negotiation_financial_status()
RETURNS TRIGGER AS $$
DECLARE
    total_remaining NUMERIC;
    neg_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        neg_id = OLD.negotiation_id;
    ELSE
        neg_id = NEW.negotiation_id;
    END IF;

    -- Calculate total remaining balance for this negotiation
    SELECT COALESCE(SUM(amount), 0) INTO total_remaining
    FROM public.installments
    WHERE negotiation_id = neg_id AND status != 'paid';

    -- Update the negotiation
    UPDATE public.negotiations
    SET 
        remaining_balance = total_remaining,
        financial_status = CASE WHEN total_remaining <= 0 THEN 'quitada' ELSE 'open' END
    WHERE id = neg_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update negotiation status on installment changes
DROP TRIGGER IF EXISTS tr_update_negotiation_status ON public.installments;
CREATE TRIGGER tr_update_negotiation_status
AFTER INSERT OR UPDATE OR DELETE ON public.installments
FOR EACH ROW EXECUTE FUNCTION public.update_negotiation_financial_status();

-- Ensure proper grants
GRANT ALL ON public.negotiations TO service_role;
GRANT ALL ON public.installments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
