
CREATE OR REPLACE FUNCTION public.update_last_contacted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contacts
  SET last_contacted = NEW.interaction_date
  WHERE id = NEW.contact_id
    AND (last_contacted IS NULL OR last_contacted < NEW.interaction_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_interaction_inserted
  AFTER INSERT ON public.interaction_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_contacted();
