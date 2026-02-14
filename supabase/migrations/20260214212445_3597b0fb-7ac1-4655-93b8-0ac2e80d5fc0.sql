
-- Create table for tracking daily email send counts
CREATE TABLE public.email_send_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  emails_sent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.email_send_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own send limits
CREATE POLICY "Users can view their own send limits"
ON public.email_send_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own send limits
CREATE POLICY "Users can insert their own send limits"
ON public.email_send_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own send limits
CREATE POLICY "Users can update their own send limits"
ON public.email_send_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role needs full access for edge functions
-- (service role bypasses RLS by default)

-- Add trigger for updated_at
CREATE TRIGGER update_email_send_limits_updated_at
BEFORE UPDATE ON public.email_send_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
