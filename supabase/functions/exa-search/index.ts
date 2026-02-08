import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXA_SEARCH_URL = 'https://api.exa.ai/search';

// Parse lead data from Exa search result
function parseLeadFromResult(result: any): {
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  email: string | null;
} | null {
  const url = result.url || '';
  const text = result.text || '';
  const properties = result.properties || {};
  
  // Skip non-LinkedIn profile URLs
  if (!url.toLowerCase().includes('linkedin.com/in/')) {
    return null;
  }
  
  let name = '';
  let title = '';
  let company = '';
  let location: string | null = null;
  
  // Try structured summary first (if we requested JSON schema)
  if (result.summary) {
    try {
      const summaryData = typeof result.summary === 'string' 
        ? JSON.parse(result.summary) 
        : result.summary;
      
      name = summaryData.name || summaryData.fullName || '';
      title = summaryData.jobTitle || summaryData.title || summaryData.position || '';
      company = summaryData.company || summaryData.companyName || '';
      location = summaryData.location || null;
    } catch (e) {
      // Summary parsing failed, continue with other methods
    }
  }
  
  // Try properties.person (structured data from Exa)
  if (!name && properties.type === 'person' && properties.person) {
    name = properties.person.name || '';
    location = properties.person.location || location;
    title = properties.person.position || title;
    if (properties.person.company) {
      company = properties.person.company.name || company;
    }
  }
  
  // Parse from title string: "Name - Title at Company | LinkedIn"
  if (!name) {
    const titleStr = result.title || '';
    const cleanTitle = titleStr.replace(/\s*[|]\s*LinkedIn.*$/i, '').trim();
    const parts = cleanTitle.split(/\s*[-–]\s*/);
    
    if (parts.length >= 1) {
      name = parts[0]?.trim() || '';
    }
    
    if (parts.length >= 2 && !title) {
      const secondPart = parts[1]?.trim() || '';
      const atMatch = secondPart.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
      
      if (atMatch) {
        title = atMatch[1]?.trim() || '';
        company = atMatch[2]?.trim() || company;
      } else {
        title = secondPart;
      }
    }
    
    if (parts.length >= 3 && !company) {
      company = parts[2]?.trim() || '';
    }
  }
  
  // Fallback: extract name from LinkedIn URL slug
  if (!name) {
    const urlMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (urlMatch) {
      let slug = urlMatch[1];
      // Remove trailing hash (e.g., "john-doe-a1b2c3")
      slug = slug.replace(/-[a-f0-9]{6,}$/i, '');
      // Convert dashes to spaces and capitalize
      name = slug
        .replace(/-/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
  }
  
  // Skip invalid results
  if (!name || name.length < 2) {
    return null;
  }
  
  // Skip if name looks like a search query or error page
  const nameLower = name.toLowerCase();
  if (nameLower.includes('job') || 
      nameLower.includes('search') || 
      nameLower.includes('result') ||
      nameLower.includes("couldn't find") ||
      nameLower.includes('linkedin')) {
    return null;
  }
  
  // Extract location from text if not found
  if (!location) {
    const locationPatterns = [
      /(?:based in|located in|from|📍)\s*([^|\n,]+(?:,\s*[^|\n]+)?)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+))\s*(?:\||·|area|$)/,
      /(Netherlands|Amsterdam|Rotterdam|The Hague|Utrecht|Germany|Berlin|Munich|France|Paris|United Kingdom|UK|London|USA|United States|New York|San Francisco|Los Angeles|Canada|Toronto|Vancouver|Australia|Sydney|Melbourne|India|Bangalore|Mumbai)/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length < 50) {
        location = match[1].trim();
        break;
      }
    }
  }
  
  // Extract email from text
  let email: string | null = null;
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
  }
  
  return {
    name: name.substring(0, 60),
    title: title || null,
    company: company?.substring(0, 60) || null,
    location,
    linkedin_url: url,
    email,
  };
}

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    const body = await req.json();
    
    // Input validation with length limits
    const query = body.query;
    const campaignId = body.campaignId;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trimmedQuery.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query must be 500 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate campaignId format if provided
    if (campaignId !== undefined && campaignId !== null) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof campaignId !== 'string' || !uuidRegex.test(campaignId)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid campaign ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY');
    if (!EXA_API_KEY) {
      throw new Error('EXA_API_KEY is not configured');
    }

    // Check credit limit before starting search
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, credits_limit, credits_used')
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

    console.log('Searching with query:', trimmedQuery);

    // Update campaign status to 'searching'
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

    // Direct Exa search API call
    const searchResponse = await fetch(EXA_SEARCH_URL, {
      method: 'POST',
      headers: {
        'x-api-key': EXA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: trimmedQuery,
        type: 'neural',
        category: 'people', // Targets LinkedIn profiles
        numResults: 20,
        contents: {
          text: { maxCharacters: 1500 },
          summary: {
            query: "Extract the person's professional information",
            schema: {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "Person Profile",
              "type": "object",
              "properties": {
                "name": { "type": "string", "description": "Full name of the person" },
                "jobTitle": { "type": "string", "description": "Current job title or role" },
                "company": { "type": "string", "description": "Current company or employer" },
                "location": { "type": "string", "description": "City and/or country" }
              },
              "required": ["name"]
            }
          }
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Exa search error:', searchResponse.status, errorText);
      throw new Error(`Exa search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.results || [];
    
    console.log(`Exa returned ${results.length} results`);

    // Parse and filter results
    let savedCount = 0;
    let skippedCount = 0;

    for (const result of results) {
      const parsed = parseLeadFromResult(result);
      if (!parsed) {
        skippedCount++;
        continue;
      }

      console.log('Valid lead found:', parsed.name, '-', parsed.title);

      // Check for duplicate in same campaign
      let existingLead = null;
      
      if (parsed.linkedin_url && campaignId) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('linkedin_url', parsed.linkedin_url)
          .eq('campaign_id', campaignId)
          .maybeSingle();
        existingLead = data;
      }
      
      if (!existingLead && parsed.email && campaignId) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('email', parsed.email)
          .eq('campaign_id', campaignId)
          .maybeSingle();
        existingLead = data;
      }

      const leadData = {
        ...parsed,
        campaign_id: campaignId || null,
        user_id: userId,
        status: 'new',
        industry: null,
        profile_data: {
          source: 'exa_search_direct',
          exa_id: result.id,
          exa_score: result.score,
        },
      };

      if (existingLead) {
        const { error: updateError } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id);
        
        if (updateError) {
          console.error('Error updating lead:', updateError);
          skippedCount++;
        } else {
          console.log('Lead updated:', parsed.name);
          savedCount++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('leads')
          .insert(leadData);
        
        if (insertError) {
          console.error('Error inserting lead:', insertError);
          skippedCount++;
        } else {
          console.log('Lead inserted:', parsed.name);
          savedCount++;
        }
      }
    }

    // Increment credits used
    if (subscription && savedCount > 0) {
      console.log(`Incrementing credits by ${savedCount} for user ${userId}`);
      
      const { error: creditError } = await supabase.rpc('increment_credits_used', {
        p_user_id: userId,
        p_amount: savedCount,
      });

      if (creditError) {
        console.error('Error incrementing credits:', creditError);
      }

      // Log credit usage
      await supabase
        .from('credit_usage')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          credits_used: savedCount,
          description: `${savedCount} leads discovered via Exa search`,
        });

      // Trigger leads_found email notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-automated-email`, {
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
              campaign_name: trimmedQuery,
            },
          }),
        });
      } catch (emailError) {
        console.error('Error triggering leads_found email:', emailError);
      }

      // Check for low credits warning
      const creditsRemaining = subscription.credits_limit - (subscription.credits_used || 0) - savedCount;
      const creditsThreshold = subscription.credits_limit * 0.1;
      
      if (creditsRemaining <= creditsThreshold && creditsRemaining > 0) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-automated-email`, {
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
        } catch (emailError) {
          console.error('Error triggering low_credits email:', emailError);
        }
      }
    }

    // Update campaign lead count and status
    if (campaignId) {
      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      await supabase
        .from('campaigns')
        .update({ 
          lead_count: count || 0,
          status: savedCount > 0 ? 'active' : 'draft'
        })
        .eq('id', campaignId);
      
      console.log('Campaign updated with', count, 'leads');
    }

    console.log(`Search complete: ${savedCount} saved, ${skippedCount} skipped`);

    return new Response(JSON.stringify({
      success: true,
      leads_found: savedCount,
      leads_skipped: skippedCount,
      message: savedCount > 0 
        ? `Found ${savedCount} leads!` 
        : 'No matching LinkedIn profiles found. Try a different search query.',
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
