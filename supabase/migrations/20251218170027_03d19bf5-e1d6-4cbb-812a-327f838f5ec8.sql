-- Clean up leads with null linkedin_url where a lead with the same name exists with a linkedin_url
DELETE FROM leads a
WHERE a.linkedin_url IS NULL
AND EXISTS (
  SELECT 1 FROM leads b 
  WHERE b.campaign_id = a.campaign_id 
  AND b.name = a.name 
  AND b.linkedin_url IS NOT NULL
);

-- Also delete leads where name is 'Unknown' if there are too many
DELETE FROM leads WHERE name = 'Unknown';

-- Update campaign lead counts to reflect reality
UPDATE campaigns c
SET lead_count = (
  SELECT COUNT(*) FROM leads l WHERE l.campaign_id = c.id
);