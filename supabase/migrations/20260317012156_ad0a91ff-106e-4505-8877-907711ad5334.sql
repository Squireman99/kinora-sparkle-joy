
CREATE POLICY "Org members can delete open roles" ON public.company_open_roles FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

CREATE POLICY "Org members can delete interactions" ON public.interaction_history FOR DELETE TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Org members can update interactions" ON public.interaction_history FOR UPDATE TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
