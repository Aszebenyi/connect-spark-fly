
-- Create a database function to aggregate lead stats by status
CREATE OR REPLACE FUNCTION public.get_lead_stats()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(l.status, 'new') as status, COUNT(*) as count
  FROM public.leads l
  WHERE l.user_id = auth.uid()
  GROUP BY l.status;
$$;
