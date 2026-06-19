-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'negotiating', 'closed', 'lost')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow public to insert leads (for the frontend form)
CREATE POLICY "Enable insert for anonymous users" ON public.leads
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow authenticated users to view and manage leads
CREATE POLICY "Enable read access for authenticated users" ON public.leads
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.leads
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.leads
    FOR DELETE
    TO authenticated
    USING (true);


-- Create vehicle_documents table
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for vehicle_documents
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to vehicle_documents
CREATE POLICY "Enable full access for authenticated users" ON public.vehicle_documents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create storage bucket for vehicle documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the documents bucket
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read documents" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents');
