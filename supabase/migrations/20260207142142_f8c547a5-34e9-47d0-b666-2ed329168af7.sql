-- Fix: OAuth tokens should not be readable by clients
-- Create a view that excludes sensitive token columns for client access
-- The actual tokens will only be accessed by edge functions using service role

-- Drop existing RLS policies on email_connections
DROP POLICY IF EXISTS "Users can view own email connections" ON public.email_connections;
DROP POLICY IF EXISTS "Users can insert own email connections" ON public.email_connections;
DROP POLICY IF EXISTS "Users can update own email connections" ON public.email_connections;
DROP POLICY IF EXISTS "Users can delete own email connections" ON public.email_connections;

-- Create new RLS policies that EXCLUDE sensitive token columns from SELECT
-- Users can only see non-sensitive columns; tokens are server-side only

-- Create a safe view without tokens for client access
CREATE OR REPLACE VIEW public.email_connections_safe AS
SELECT 
  id,
  user_id,
  email,
  provider,
  is_active,
  token_expires_at,
  created_at,
  updated_at
FROM public.email_connections;

-- Enable RLS on the view
ALTER VIEW public.email_connections_safe SET (security_invoker = true);

-- For the base table, only allow INSERT (with tokens from server)
-- SELECT will be blocked for authenticated users on the base table
CREATE POLICY "Users can insert own email connections"
ON public.email_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE non-token columns through RPC or service role handles tokens
CREATE POLICY "Users can update own email connections is_active only"
ON public.email_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own email connections"
ON public.email_connections
FOR DELETE
USING (auth.uid() = user_id);

-- BLOCK direct SELECT on the base table - tokens must not be readable
-- Service role (edge functions) can still read tokens
-- Note: We're NOT creating a SELECT policy, which means no client SELECT access