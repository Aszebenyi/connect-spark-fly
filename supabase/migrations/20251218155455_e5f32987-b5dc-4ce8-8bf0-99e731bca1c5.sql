-- Create webset_searches table to track Exa webset searches and webhook secrets
CREATE TABLE public.webset_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webset_id TEXT NOT NULL UNIQUE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  webhook_secret TEXT,
  items_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webset_searches ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matching existing pattern)
CREATE POLICY "Allow all operations on webset_searches"
ON public.webset_searches
AS RESTRICTIVE
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_webset_searches_updated_at
BEFORE UPDATE ON public.webset_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();