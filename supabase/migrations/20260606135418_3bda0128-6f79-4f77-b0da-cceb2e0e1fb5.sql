ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS down_payment_date DATE;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS down_payment_method TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS first_installment_date DATE;

COMMENT ON COLUMN public.vehicles.down_payment_date IS 'Data do recebimento do sinal da venda';
COMMENT ON COLUMN public.vehicles.down_payment_method IS 'Forma de recebimento do sinal (PIX, Dinheiro, etc)';
COMMENT ON COLUMN public.vehicles.first_installment_date IS 'Data prevista para o primeiro vencimento do saldo';