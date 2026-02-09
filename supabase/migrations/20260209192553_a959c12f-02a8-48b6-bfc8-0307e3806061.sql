
-- Remove ALL remaining SELECT policies on email_connections to prevent token exposure
DROP POLICY IF EXISTS "Users can view their own email connections" ON public.email_connections;

-- Remove duplicate INSERT/UPDATE/DELETE policies (keep only the newer ones)
DROP POLICY IF EXISTS "Users can insert their own email connections" ON public.email_connections;
DROP POLICY IF EXISTS "Users can update their own email connections" ON public.email_connections;
DROP POLICY IF EXISTS "Users can delete their own email connections" ON public.email_connections;

-- Keep these policies (the newer ones):
-- "Users can insert own email connections" (INSERT)
-- "Users can update own email connections is_active only" (UPDATE)
-- "Users can delete own email connections" (DELETE)
