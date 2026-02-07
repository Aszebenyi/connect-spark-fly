import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXA_WEBSETS_BASE = 'https://api.exa.ai/websets/v0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Require authentication to prevent unauthorized API usage
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claims.claims.sub as string;
    console.log('Authenticated user:', userId);

    const { query, campaignId } = await req.json();

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY');
    if (!EXA_API_KEY) {
      throw new Error('EXA_API_KEY is not configured');
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Check credit limit before starting search
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('credits_limit, credits_used')
      .eq('user_id', userId)
      .single();

    if (subError) {
      console.error('Error fetching subscription:', subError);
    } else if (subscription) {
      const availableCredits = subscription.credits_limit - (subscription.credits_used || 0);
      console.log('Available credits:', availableCredits);

      if (availableCredits <= 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'NO_CREDITS',
          message: 'You have used all your credits. Please upgrade your plan.',
          credits_used: subscription.credits_used,
          credits_limit: subscription.credits_limit,
        }), { 
          status: 402, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    const searchQuery = query.trim();
    console.log('Creating Webset with query:', searchQuery);

    // Get the webhook URL - this is our edge function URL
    const webhookUrl = `${supabaseUrl}/functions/v1/exa-webhook`;
    console.log('Webhook URL:', webhookUrl);

    // Step 1: Create a webhook to receive notifications
    console.log('Creating webhook...');
    const webhookResponse = await fetch(`${EXA_WEBSETS_BASE}/webhooks`, {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['webset.idle'],  // Only listen for completion, then batch fetch all items
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook creation error:', webhookResponse.status, errorText);
      throw new Error(`Failed to create webhook: ${webhookResponse.status}`);
    }

    const webhook = await webhookResponse.json();
    console.log('Webhook created with ID:', webhook.id);

    // Step 2: Create a Webset with search and enrichments
    const createResponse = await fetch(`${EXA_WEBSETS_BASE}/websets`, {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        search: {
          query: searchQuery,
          count: 10,
        },
        enrichments: [
          { description: "LinkedIn profile URL of this person", format: "text" },
          { description: "Current job title", format: "text" },
          { description: "Current company name", format: "text" },
          { description: "Location (city, country)", format: "text" },
          { description: "Professional email address if available", format: "text" },
        ],
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Exa Websets create error:', createResponse.status, errorText);
      throw new Error(`Exa Websets API error: ${createResponse.status}`);
    }

    const webset = await createResponse.json();
    console.log('Webset created with ID:', webset.id);

    // Step 3: Store the search record for webhook correlation
    const { error: insertError } = await supabase.from('webset_searches').insert({
      webset_id: webset.id,
      campaign_id: campaignId || null,
      query: searchQuery,
      status: 'processing',
      webhook_secret: webhook.secret || null,
    });

    if (insertError) {
      console.error('Error storing search record:', insertError);
    } else {
      console.log('Search record stored for webset:', webset.id);
    }

    // Step 4: Update campaign status to 'searching'
    if (campaignId) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ status: 'searching' })
        .eq('id', campaignId);
      
      if (updateError) {
        console.error('Error updating campaign status to searching:', updateError);
      } else {
        console.log('Campaign status updated to searching:', campaignId);
      }
    }

    // Return immediately - webhook will handle the results
    return new Response(JSON.stringify({
      success: true,
      websetId: webset.id,
      webhookId: webhook.id,
      status: 'searching',
      message: 'Search started. Leads will be saved automatically via webhook.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in exa-search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
