
-- Junction table for many-to-many lead <-> campaign (job opening) assignments
CREATE TABLE public.lead_campaign_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(lead_id, campaign_id)
);

-- Enable RLS
ALTER TABLE public.lead_campaign_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view assignments for their own leads
CREATE POLICY "Users can view their own lead assignments"
ON public.lead_campaign_assignments
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_campaign_assignments.lead_id AND leads.user_id = auth.uid())
);

-- Users can create assignments for their own leads
CREATE POLICY "Users can create their own lead assignments"
ON public.lead_campaign_assignments
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_campaign_assignments.lead_id AND leads.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = lead_campaign_assignments.campaign_id AND campaigns.user_id = auth.uid())
);

-- Users can delete assignments for their own leads
CREATE POLICY "Users can delete their own lead assignments"
ON public.lead_campaign_assignments
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_campaign_assignments.lead_id AND leads.user_id = auth.uid())
);

-- Indexes for performance
CREATE INDEX idx_lead_campaign_assignments_lead ON public.lead_campaign_assignments(lead_id);
CREATE INDEX idx_lead_campaign_assignments_campaign ON public.lead_campaign_assignments(campaign_id);

-- Seed existing campaign_id data into the junction table (migrate existing single-assignment data)
INSERT INTO public.lead_campaign_assignments (lead_id, campaign_id, assigned_by)
SELECT l.id, l.campaign_id, l.user_id
FROM public.leads l
WHERE l.campaign_id IS NOT NULL
ON CONFLICT (lead_id, campaign_id) DO NOTHING;
