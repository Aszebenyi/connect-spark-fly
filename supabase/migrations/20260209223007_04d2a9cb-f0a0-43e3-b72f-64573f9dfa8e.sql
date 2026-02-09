-- Revert to SECURITY DEFINER for the view - this is intentional
-- The view only exposes safe columns (no tokens), and the base table
-- has no SELECT policy so users can't read tokens directly
ALTER VIEW public.email_connections_safe SET (security_invoker = off);