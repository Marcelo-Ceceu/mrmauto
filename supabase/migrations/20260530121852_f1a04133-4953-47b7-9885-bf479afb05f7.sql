
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

UPDATE storage.buckets SET public = false WHERE id = 'vehicle-photos';

DROP POLICY IF EXISTS "users can view own vehicle photos" ON storage.objects;
CREATE POLICY "users can view own vehicle photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
