
CREATE POLICY "Org members can delete relationships" ON public.relationships FOR DELETE TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update relationships" ON public.relationships FOR UPDATE TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
