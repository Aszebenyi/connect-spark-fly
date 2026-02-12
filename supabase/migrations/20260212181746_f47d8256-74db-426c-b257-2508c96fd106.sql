
-- Add indexes on outreach_messages for performance
CREATE INDEX IF NOT EXISTS idx_outreach_messages_lead_id ON public.outreach_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_sent_at ON public.outreach_messages(sent_at DESC);
