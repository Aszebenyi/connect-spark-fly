import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-exa-signature',
};

const EXA_WEBSETS_BASE = 'https://api.exa.ai/websets/v0';

// Helper function to verify HMAC signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const EXA_API_KEY = Deno.env.get('EXA_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Clone request to read body twice (once for signature, once for parsing)
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    const eventType = payload.type;
    const data = payload.data;

    if (!eventType || !data) {
      console.error('Invalid webhook payload - missing type or data');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle webset.idle - search is complete, now batch fetch all items
    if (eventType === 'webset.idle') {
      const websetId = data.id || data.websetId;
      console.log('Webset completed, fetching all items:', websetId);
      
      // Get the webset search record to find campaign_id and webhook_secret
      const { data: searchRecord, error: searchError } = await supabase
        .from('webset_searches')
        .select('*, campaigns(user_id)')
        .eq('webset_id', websetId)
        .maybeSingle();

      if (searchError) {
        console.error('Error fetching search record:', searchError);
      }

      // SECURITY: Verify webhook signature if secret is configured
      const exaSignature = req.headers.get('x-exa-signature');
      if (searchRecord?.webhook_secret) {
        if (!exaSignature) {
          console.error('Missing webhook signature');
          return new Response(JSON.stringify({ error: 'Missing signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const isValid = await verifySignature(rawBody, exaSignature, searchRecord.webhook_secret);
        if (!isValid) {
          console.error('Invalid webhook signature');
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.log('Webhook signature verified successfully');
      } else if (!searchRecord) {
        // No search record found - reject unknown webhooks
        console.error('Unknown webset ID, rejecting webhook');
        return new Response(JSON.stringify({ error: 'Unknown webset' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // IDEMPOTENCY CHECK: Skip if already processed
      if (searchRecord?.status === 'completed') {
        console.log('Webset already processed, skipping:', websetId);
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Mark as processing_webhook immediately to prevent race conditions
      const { error: lockError } = await supabase
        .from('webset_searches')
        .update({ status: 'processing_webhook' })
        .eq('webset_id', websetId)
        .eq('status', 'processing');  // Only update if still in 'processing' state

      if (lockError) {
        console.log('Could not acquire lock (likely already processing):', lockError);
      }

      const campaignId = searchRecord?.campaign_id || null;
      const userId = (searchRecord?.campaigns as any)?.user_id || null;

      // Fetch ALL items from the webset in one API call
      const response = await fetch(`${EXA_WEBSETS_BASE}/websets/${websetId}?expand=items`, {
        headers: {
          'x-api-key': EXA_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch webset items:', response.status, errorText);
        throw new Error(`Failed to fetch webset items: ${response.status}`);
      }

      const webset = await response.json();
      const items = webset.items || [];
      
      console.log(`Fetched ${items.length} items from webset ${websetId}`);

      let savedCount = 0;
      let skippedCount = 0;

      // Process each item with all enrichments complete
      for (const item of items) {
        const lead = parseLeadFromItem(item);
        lead.campaign_id = campaignId;
        lead.user_id = userId;

        console.log('Parsed lead:', JSON.stringify(lead, null, 2));

        // VALIDATE: Only save leads with meaningful data
        const hasValidName = lead.name && lead.name !== 'Unknown' && lead.name.trim().length > 0;
        const hasLinkedIn = lead.linkedin_url && lead.linkedin_url.includes('linkedin.com');
        const hasEmail = lead.email && lead.email.includes('@');

        if (!hasValidName && !hasLinkedIn && !hasEmail) {
          console.log('Skipping invalid lead - no name, linkedin, or email');
          skippedCount++;
          continue;
        }

        // Try to find existing lead by linkedin_url or email within the same campaign
        let existingLead = null;
        
        if (lead.linkedin_url && campaignId) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .eq('linkedin_url', lead.linkedin_url)
            .eq('campaign_id', campaignId)
            .maybeSingle();
          existingLead = data;
        }
        
        if (!existingLead && lead.email && campaignId) {
          const { data } = await supabase
            .from('leads')
            .select('id')
            .eq('email', lead.email)
            .eq('campaign_id', campaignId)
            .maybeSingle();
          existingLead = data;
        }

        if (existingLead) {
          // Update existing lead
          const { error: updateError } = await supabase
            .from('leads')
            .update(lead)
            .eq('id', existingLead.id);
          
          if (updateError) {
            console.error('Error updating lead:', updateError);
            skippedCount++;
          } else {
            console.log('Lead updated:', lead.name);
            savedCount++;
          }
        } else {
          // Insert new lead
          const { error: insertError } = await supabase
            .from('leads')
            .insert(lead);
          
          if (insertError) {
            console.error('Error inserting lead:', insertError);
            skippedCount++;
          } else {
            console.log('Lead inserted:', lead.name);
            savedCount++;
          }
        }
      }

      // Increment credits used for the user
      if (userId && savedCount > 0) {
        console.log(`Incrementing credits by ${savedCount} for user ${userId}`);
        
        const { error: creditError } = await supabase.rpc('increment_credits_used', {
          p_user_id: userId,
          p_amount: savedCount,
        });

        if (creditError) {
          console.error('Error incrementing credits:', creditError);
        } else {
          console.log('Credits incremented successfully');
        }

        // Get subscription ID for credit_usage logs
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, credits_limit, credits_used')
          .eq('user_id', userId)
          .single();

        // Log credit usage
        if (subscription) {
          const { error: logError } = await supabase
            .from('credit_usage')
            .insert({
              user_id: userId,
              subscription_id: subscription.id,
              credits_used: savedCount,
              description: `${savedCount} leads discovered via Exa search`,
            });

          if (logError) {
            console.error('Error logging credit usage:', logError);
          }

          // 🚀 TRIGGER: Send "leads_found" email notification
          const campaignName = searchRecord?.query || 'Your Campaign';
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-automated-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                event_type: 'leads_found',
                user_id: userId,
                data: {
                  lead_count: savedCount,
                  campaign_name: campaignName,
                },
              }),
            });
            console.log('Leads found email trigger response:', emailResponse.status);
          } catch (emailError) {
            console.error('Error triggering leads_found email:', emailError);
          }

          // 🚀 TRIGGER: Check for low credits and send warning
          const creditsRemaining = (subscription.credits_limit || 0) - (subscription.credits_used || 0) - savedCount;
          const creditsThreshold = (subscription.credits_limit || 0) * 0.1; // 10% threshold
          
          if (creditsRemaining <= creditsThreshold && creditsRemaining > 0) {
            try {
              const lowCreditResponse = await fetch(`${supabaseUrl}/functions/v1/send-automated-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  event_type: 'low_credits',
                  user_id: userId,
                }),
              });
              console.log('Low credits email trigger response:', lowCreditResponse.status);
            } catch (emailError) {
              console.error('Error triggering low_credits email:', emailError);
            }
          }
        }
      }

      // Update search record
      await supabase
        .from('webset_searches')
        .update({ 
          status: 'completed',
          items_received: items.length
        })
        .eq('webset_id', websetId);

      // Update campaign lead count and status to 'active'
      if (campaignId) {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', campaignId);

        await supabase
          .from('campaigns')
          .update({ 
            lead_count: count || 0,
            status: 'active'  // Automatically activate when leads are found
          })
          .eq('id', campaignId);
        
        console.log('Campaign status updated to active with', count, 'leads');
      }

      console.log(`Webset ${websetId} complete: ${savedCount} saved, ${skippedCount} skipped`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseLeadFromItem(item: any): any {
  const enrichments = item.enrichments || [];
  const properties = item.properties || {};

  console.log('Raw item:', JSON.stringify({ id: item.id, properties, enrichments }, null, 2));

  // Helper to get result value from enrichment
  const getResult = (enrichment: any): string => {
    if (!enrichment) return '';
    const result = enrichment.result || enrichment.value || enrichment.answer;
    if (!result) return '';
    if (Array.isArray(result)) return result[0] || '';
    return String(result);
  };

  // SMART DETECTION: Identify fields by their content, not by array index
  let linkedinUrl = '';
  let email = '';
  let title = '';
  let company = '';
  let location = '';
  let name = '';

  // First try to get data from properties (structured data from Exa)
  if (properties.type === 'person' && properties.person) {
    name = properties.person.name || '';
    location = properties.person.location || '';
    title = properties.person.position || '';
    if (properties.person.company) {
      company = properties.person.company.name || '';
    }
  }

  // Get URL from properties
  if (properties.url && properties.url.includes('linkedin.com/in/')) {
    linkedinUrl = properties.url;
  }

  // Then augment/override with enrichment data
  for (const enrichment of enrichments) {
    const val = getResult(enrichment).trim();
    if (!val) continue;

    // Detect LinkedIn URL
    if (val.includes('linkedin.com/in/') && !linkedinUrl) {
      linkedinUrl = val;
      continue;
    }

    // Detect email
    if (val.includes('@') && val.includes('.') && !val.includes(' ') && !email) {
      email = val;
      continue;
    }

    // Use enrichment description/prompt to identify field type
    const desc = (enrichment.description || enrichment.prompt || '').toLowerCase();
    
    if ((desc.includes('title') || desc.includes('job') || desc.includes('role') || desc.includes('position')) && !title) {
      title = val;
    } else if ((desc.includes('company') || desc.includes('employer') || desc.includes('organization')) && !company) {
      company = val;
    } else if ((desc.includes('location') || desc.includes('city') || desc.includes('country') || desc.includes('based')) && !location) {
      location = val;
    }
  }

  // Fallback: use item.url if no LinkedIn found
  if (!linkedinUrl && item.url && item.url.includes('linkedin.com/in/')) {
    linkedinUrl = item.url;
  }

  // Extract name from enrichment references if not already found
  if (!name) {
    for (const enrichment of enrichments) {
      if (enrichment.references && enrichment.references.length > 0) {
        const refTitle = enrichment.references[0].title || '';
        if (refTitle && !refTitle.includes('linkedin.com') && refTitle.length < 50 && refTitle.length > 2) {
          name = refTitle;
          break;
        }
      }
    }
  }

  // Fallback: extract name from LinkedIn URL slug
  if (!name && linkedinUrl) {
    const urlMatch = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (urlMatch) {
      let slug = urlMatch[1];
      slug = slug.replace(/-[a-f0-9]{6,}$/i, '');
      name = slug.replace(/-/g, ' ');
    }
  }

  // Capitalize name
  name = name.trim();
  if (name) {
    name = name.split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  console.log(`Parsed: name=${name}, title=${title}, company=${company}, location=${location}, email=${email}, linkedin=${linkedinUrl}`);

  return {
    name: name || 'Unknown',
    title: title || null,
    company: company || null,
    linkedin_url: linkedinUrl || null,
    location: location || null,
    email: email || null,
    industry: null,
    status: 'new',
    profile_data: {
      source: 'exa_websets_batch',
      item_id: item.id,
      enrichments: enrichments,
    },
  };
}
