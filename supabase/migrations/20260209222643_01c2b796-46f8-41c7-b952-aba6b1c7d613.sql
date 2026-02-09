-- Fix security definer view by setting it to SECURITY INVOKER
-- This ensures the view respects the querying user's RLS policies
ALTER VIEW public.email_connections_safe SET (security_invoker = on);