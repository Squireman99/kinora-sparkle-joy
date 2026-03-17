
-- Create a security definer function to check org membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _organization_id
  )
$$;

-- Also create a helper to get a user's org ids
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

-- Drop and recreate the recursive SELECT policy on organization_members
DROP POLICY IF EXISTS "Members can read org members" ON public.organization_members;
CREATE POLICY "Members can read org members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix the organizations SELECT policy which also references organization_members
DROP POLICY IF EXISTS "Members can read their orgs" ON public.organizations;
CREATE POLICY "Members can read their orgs"
ON public.organizations
FOR SELECT
TO authenticated
USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix the contacts SELECT policy
DROP POLICY IF EXISTS "Org members can view contacts" ON public.contacts;
CREATE POLICY "Org members can view contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix the contacts INSERT policy
DROP POLICY IF EXISTS "Org members can insert contacts" ON public.contacts;
CREATE POLICY "Org members can insert contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix the contacts UPDATE policy
DROP POLICY IF EXISTS "Org members can update contacts" ON public.contacts;
CREATE POLICY "Org members can update contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix audit_log SELECT policy
DROP POLICY IF EXISTS "Members can read org audit log" ON public.audit_log;
CREATE POLICY "Members can read org audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));

-- Fix pending_invites SELECT policy
DROP POLICY IF EXISTS "Members can read org invites" ON public.pending_invites;
CREATE POLICY "Members can read org invites"
ON public.pending_invites
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
