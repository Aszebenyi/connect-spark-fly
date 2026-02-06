-- Add search_query and lead_count to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN search_query text,
ADD COLUMN lead_count integer DEFAULT 0;

-- Add campaign_id to leads table (nullable for standalone leads)
ALTER TABLE public.leads 
ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create index for faster campaign-based lead queries
CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);

-- Update existing leads to have lead_count of 0 for campaigns
UPDATE public.campaigns SET lead_count = 0 WHERE lead_count IS NULL;