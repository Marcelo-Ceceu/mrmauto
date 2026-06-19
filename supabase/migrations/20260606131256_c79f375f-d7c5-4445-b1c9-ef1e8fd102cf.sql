ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS down_payment_amount NUMERIC DEFAULT 0;
COMMENT ON COLUMN public.vehicles.down_payment_amount IS 'Valor do sinal recebido na venda do veículo';