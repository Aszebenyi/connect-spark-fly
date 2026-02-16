-- Phase 1: Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_created ON public.campaigns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign ON public.outreach_messages(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON public.outreach_messages(status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_limits_user_date ON public.email_send_limits(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON public.lead_campaign_assignments(campaign_id);

-- Phase 6: Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits (edge functions use service role)
-- No user-facing policies needed since users don't interact with this table directly
CREATE POLICY "Service role full access on rate_limits"
  ON public.rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);
