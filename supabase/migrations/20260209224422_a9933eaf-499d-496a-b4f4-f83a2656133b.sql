-- Recreate view with auth.uid() filter for row-level safety
-- SECURITY DEFINER is intentional: bypasses base table RLS (no SELECT policy)
-- but the WHERE clause ensures users only see their own connections
DROP VIEW IF EXISTS public.email_connections_safe;

CREATE VIEW public.email_connections_safe 
WITH (security_invoker = off)
AS
SELECT provider, email, id, user_id, is_active, token_expires_at, created_at, updated_at
FROM public.email_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.email_connections_safe TO authenticated;