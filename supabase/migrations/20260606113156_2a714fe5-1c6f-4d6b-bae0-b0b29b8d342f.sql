DROP POLICY IF EXISTS "Allow authenticated to manage negotiations" ON public.negotiations;
DROP POLICY IF EXISTS "Allow authenticated to manage installments" ON public.installments;

CREATE POLICY "Authenticated users can manage negotiations" ON public.negotiations 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage installments" ON public.installments 
FOR ALL TO authenticated USING (true) WITH CHECK (true);
