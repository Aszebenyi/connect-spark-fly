
-- Create do_not_contact table for CAN-SPAM compliance
CREATE TABLE public.do_not_contact (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'unsubscribe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, user_id)
);

-- Enable RLS
ALTER TABLE public.do_not_contact ENABLE ROW LEVEL SECURITY;

-- Users can only see their own entries
CREATE POLICY "Users can view their own do_not_contact entries"
ON public.do_not_contact FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own do_not_contact entries"
ON public.do_not_contact FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own do_not_contact entries"
ON public.do_not_contact FOR DELETE
USING (auth.uid() = user_id);

-- Service role needs access for edge function checks
CREATE POLICY "Service role can view all do_not_contact"
ON public.do_not_contact FOR SELECT
TO service_role
USING (true);
