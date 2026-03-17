
CREATE TABLE public.dismissed_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_a_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contact_b_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_a_id, contact_b_id)
);

ALTER TABLE public.dismissed_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dismissed suggestions" ON public.dismissed_suggestions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
