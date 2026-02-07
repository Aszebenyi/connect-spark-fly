-- Security Fix: Restrict SECURITY DEFINER functions to service_role only
-- This prevents authenticated users from directly calling these functions

-- Revoke EXECUTE from authenticated role on increment_credits_used
REVOKE EXECUTE ON FUNCTION public.increment_credits_used(uuid, integer) FROM authenticated;

-- Revoke EXECUTE from authenticated role on increment_campaign_sent
REVOKE EXECUTE ON FUNCTION public.increment_campaign_sent(uuid) FROM authenticated;

-- Ensure service_role has EXECUTE privileges
GRANT EXECUTE ON FUNCTION public.increment_credits_used(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_campaign_sent(uuid) TO service_role;

-- Security Fix: Add explicit DELETE deny policy on credit_usage for audit integrity
-- This ensures users cannot delete their credit usage records
CREATE POLICY "Users cannot delete credit usage records"
ON public.credit_usage
FOR DELETE
USING (false);