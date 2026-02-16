-- Fix rate_limits RLS: restrict to service role only by removing overly permissive policy
-- and using a function check instead
DROP POLICY IF EXISTS "Service role full access on rate_limits" ON public.rate_limits;

-- No RLS policies for anon/authenticated users - only service role (which bypasses RLS) accesses this table
-- This means regular users have NO access, and service role bypasses RLS entirely
