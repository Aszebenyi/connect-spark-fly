-- Drop the existing partial indexes that don't work with ON CONFLICT
DROP INDEX IF EXISTS leads_linkedin_campaign_unique;
DROP INDEX IF EXISTS leads_email_campaign_unique;

-- Create proper unique constraints that PostgreSQL can use with ON CONFLICT
-- Note: NULL values are considered distinct, so multiple rows with NULL linkedin_url are allowed
ALTER TABLE public.leads 
  ADD CONSTRAINT leads_linkedin_campaign_unique 
  UNIQUE (linkedin_url, campaign_id);

ALTER TABLE public.leads 
  ADD CONSTRAINT leads_email_campaign_unique 
  UNIQUE (email, campaign_id);