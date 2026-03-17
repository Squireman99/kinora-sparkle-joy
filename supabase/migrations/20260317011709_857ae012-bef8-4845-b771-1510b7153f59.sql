
-- Fix companies RLS to use security definer function
DROP POLICY IF EXISTS "Org members can view companies" ON public.companies;
CREATE POLICY "Org members can view companies" ON public.companies FOR SELECT TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Org members can insert companies" ON public.companies;
CREATE POLICY "Org members can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

DROP POLICY IF EXISTS "Org members can update companies" ON public.companies;
CREATE POLICY "Org members can update companies" ON public.companies FOR UPDATE TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Add RLS policies on company_open_roles
CREATE POLICY "Org members can view open roles" ON public.company_open_roles FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can insert open roles" ON public.company_open_roles FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can update open roles" ON public.company_open_roles FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
