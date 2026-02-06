-- Add user_id to campaigns table
ALTER TABLE public.campaigns ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to leads table  
ALTER TABLE public.leads ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Allow all operations on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow all operations on outreach_messages" ON public.outreach_messages;
DROP POLICY IF EXISTS "Allow all operations on webset_searches" ON public.webset_searches;

-- Create proper RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns"
ON public.campaigns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
ON public.campaigns FOR DELETE
USING (auth.uid() = user_id);

-- Create proper RLS policies for leads
CREATE POLICY "Users can view their own leads"
ON public.leads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads"
ON public.leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads"
ON public.leads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads"
ON public.leads FOR DELETE
USING (auth.uid() = user_id);

-- Create proper RLS policies for outreach_messages (via lead ownership)
CREATE POLICY "Users can view their own outreach messages"
ON public.outreach_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = outreach_messages.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own outreach messages"
ON public.outreach_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own outreach messages"
ON public.outreach_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = outreach_messages.lead_id
    AND leads.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own outreach messages"
ON public.outreach_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = outreach_messages.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Create proper RLS policies for webset_searches (via campaign ownership)
CREATE POLICY "Users can view their own webset searches"
ON public.webset_searches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = webset_searches.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own webset searches"
ON public.webset_searches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own webset searches"
ON public.webset_searches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = webset_searches.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);