-- First, clean up existing duplicates (keep the oldest record for each linkedin_url + campaign_id)
DELETE FROM leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (linkedin_url, campaign_id) id 
  FROM leads 
  WHERE linkedin_url IS NOT NULL
  ORDER BY linkedin_url, campaign_id, created_at ASC
)
AND linkedin_url IS NOT NULL;

-- Also clean up duplicates based on email + campaign_id
DELETE FROM leads 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, campaign_id) id 
  FROM leads 
  WHERE email IS NOT NULL
  ORDER BY email, campaign_id, created_at ASC
)
AND email IS NOT NULL
AND linkedin_url IS NULL;

-- Create partial unique index for linkedin_url + campaign_id
CREATE UNIQUE INDEX IF NOT EXISTS leads_linkedin_campaign_unique 
ON leads (linkedin_url, campaign_id) 
WHERE linkedin_url IS NOT NULL;

-- Create partial unique index for email + campaign_id
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_campaign_unique 
ON leads (email, campaign_id) 
WHERE email IS NOT NULL;

-- Update campaign lead counts to match actual lead count
UPDATE campaigns c
SET lead_count = (
  SELECT COUNT(*) FROM leads WHERE campaign_id = c.id
);