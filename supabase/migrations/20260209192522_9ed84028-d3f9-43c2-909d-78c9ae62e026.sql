
-- Remove the SELECT policy that exposes OAuth tokens to authenticated users
DROP POLICY IF EXISTS "Users can view their own email connections" ON public.email_connections;

-- Also remove the duplicate older policies if they exist
DROP POLICY IF EXISTS "Users can insert their own email connections" ON public.email_connections;

-- Keep only: insert own, update own, delete own (no SELECT on the raw table)
-- The email_connections_safe view (without tokens) is the proper read path
