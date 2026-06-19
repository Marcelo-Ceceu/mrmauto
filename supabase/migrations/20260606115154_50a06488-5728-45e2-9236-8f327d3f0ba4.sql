CREATE TABLE public.negotiation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID REFERENCES public.negotiations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT ALL ON public.negotiation_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.negotiation_logs TO authenticated;
ALTER TABLE public.negotiation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their negotiation logs" ON public.negotiation_logs FOR ALL USING (true);
