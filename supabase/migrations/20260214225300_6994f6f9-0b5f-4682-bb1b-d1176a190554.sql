-- Add SELECT policy on email_connections so SECURITY INVOKER view can read rows
CREATE POLICY "Users can select own email connections"
ON public.email_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Switch view from SECURITY DEFINER to SECURITY INVOKER
ALTER VIEW public.email_connections_safe SET (security_invoker = on);