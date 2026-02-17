-- Fix rate_limits: restrict access to service_role only
-- Drop any existing permissive policy
DROP POLICY IF EXISTS "Service role full access on rate_limits" ON public.rate_limits;

-- Create proper service_role-only policy
CREATE POLICY "Service role full access on rate_limits"
  ON public.rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);