
-- Add linkedin_url to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url text;

-- Interaction history
CREATE TABLE public.interaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  interaction_type text NOT NULL,
  interaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.interaction_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view interactions" ON public.interaction_history FOR SELECT TO authenticated USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
CREATE POLICY "Org members can insert interactions" ON public.interaction_history FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Contact maturity (per-user relationship assessment)
CREATE TABLE public.contact_maturity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  maturity_level_id uuid REFERENCES public.maturity_level_taxonomy(id),
  relationship_type_id uuid REFERENCES public.relationship_type_taxonomy(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, user_id)
);
ALTER TABLE public.contact_maturity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own maturity" ON public.contact_maturity FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own maturity" ON public.contact_maturity FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own maturity" ON public.contact_maturity FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Contact interests join table
CREATE TABLE public.contact_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.interest_taxonomy(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, interest_id)
);
ALTER TABLE public.contact_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view contact interests" ON public.contact_interests FOR SELECT TO authenticated USING (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can insert contact interests" ON public.contact_interests FOR INSERT TO authenticated WITH CHECK (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can delete contact interests" ON public.contact_interests FOR DELETE TO authenticated USING (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- Contact connections
CREATE TABLE public.contact_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  connected_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contact_id, connected_contact_id)
);
ALTER TABLE public.contact_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view connections" ON public.contact_connections FOR SELECT TO authenticated USING (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can insert connections" ON public.contact_connections FOR INSERT TO authenticated WITH CHECK (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- Job seeking tags
CREATE TABLE public.job_seeking_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  is_job_seeking boolean NOT NULL DEFAULT false,
  comment text,
  tagged_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);
ALTER TABLE public.job_seeking_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view job tags" ON public.job_seeking_tags FOR SELECT TO authenticated USING (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can insert job tags" ON public.job_seeking_tags FOR INSERT TO authenticated WITH CHECK (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));
CREATE POLICY "Org members can update job tags" ON public.job_seeking_tags FOR UPDATE TO authenticated USING (contact_id IN (SELECT id FROM public.contacts WHERE organization_id IN (SELECT public.get_user_org_ids(auth.uid()))));

-- Add RLS policies for taxonomy tables (read-only for authenticated)
CREATE POLICY "Authenticated can read interest taxonomy" ON public.interest_taxonomy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read maturity taxonomy" ON public.maturity_level_taxonomy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read relationship type taxonomy" ON public.relationship_type_taxonomy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read role taxonomy" ON public.role_taxonomy FOR SELECT TO authenticated USING (true);
