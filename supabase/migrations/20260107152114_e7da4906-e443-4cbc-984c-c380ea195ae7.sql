-- Create email_connections table for storing OAuth tokens
CREATE TABLE public.email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'gmail',
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own email connections
CREATE POLICY "Users can view their own email connections"
  ON public.email_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own email connections
CREATE POLICY "Users can insert their own email connections"
  ON public.email_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own email connections
CREATE POLICY "Users can update their own email connections"
  ON public.email_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own email connections
CREATE POLICY "Users can delete their own email connections"
  ON public.email_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_email_connections_updated_at
  BEFORE UPDATE ON public.email_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function for incrementing campaign sent count
CREATE OR REPLACE FUNCTION public.increment_campaign_sent(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns
  SET sent_count = COALESCE(sent_count, 0) + 1,
      updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;