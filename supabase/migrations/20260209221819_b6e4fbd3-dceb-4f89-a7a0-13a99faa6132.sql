-- Drop and recreate the view with proper column order matching existing schema
DROP VIEW IF EXISTS public.email_connections_safe;

CREATE VIEW public.email_connections_safe AS
SELECT provider, email, id, user_id, is_active, token_expires_at, created_at, updated_at
FROM public.email_connections;

-- Grant SELECT to authenticated users - view security is enforced by underlying table RLS
GRANT SELECT ON public.email_connections_safe TO authenticated;