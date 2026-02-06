-- Create leads table to store found leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  location TEXT,
  industry TEXT,
  profile_data JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'qualified', 'unqualified')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  sent_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outreach messages table
CREATE TABLE public.outreach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'replied')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

-- Create public policies (for demo purposes - in production you'd add auth)
CREATE POLICY "Allow all operations on leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on outreach_messages" ON public.outreach_messages FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_company ON public.leads(company);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_outreach_lead_id ON public.outreach_messages(lead_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();