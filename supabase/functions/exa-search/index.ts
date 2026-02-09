import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Use AI to expand a healthcare job description into an optimized search query
async function expandHealthcareQuery(rawQuery: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not set, using raw query');
    return rawQuery;
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare recruitment search query optimizer. Given a job description or search query, produce a single optimized search string for finding matching healthcare professionals on LinkedIn.

Rules:
- Output ONLY the optimized search string, nothing else
- Keep it under 200 characters
- Include role synonyms (e.g., ICU Nurse → Intensive Care Nurse, Critical Care Nurse)
- Include location variations (e.g., Los Angeles → LA, Greater Los Angeles)
- Recognize and include healthcare license types: RN, LPN/LVN, NP, PA, PT, OT, RT, SLP, PharmD, MD, DO, CNA, CRNA, BSN, MSN
- Recognize and include certifications: BLS, ACLS, PALS, NRP, TNCC, CCRN, CEN, CNOR, ONS, NIHSS, STABLE
- Recognize specialties and their abbreviations: ICU/Intensive Care, ER/Emergency Room/Emergency Department, OR/Operating Room/Surgical, NICU/Neonatal ICU, Med-Surg/Medical-Surgical, L&D/Labor and Delivery, PACU/Post-Anesthesia, Cath Lab, Tele/Telemetry, PCU/Progressive Care, Psych/Behavioral Health, Oncology, Pediatrics/PICU, Rehab
- Focus on LinkedIn profile language that healthcare professionals actually use
- Do NOT add quotes or formatting, just the plain search text`
          },
          {
            role: 'user',
            content: rawQuery,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI query expansion failed:', response.status);
      return rawQuery;
    }

    const data = await response.json();
    const expanded = data.choices?.[0]?.message?.content?.trim();

    if (expanded && expanded.length > 5 && expanded.length < 300) {
      console.log('Expanded query:', expanded);
      return expanded;
    }

    return rawQuery;
  } catch (e) {
    console.error('AI query expansion error:', e);
    return rawQuery;
  }
}

// Score candidates against job requirements using AI
async function scoreLeadsAgainstRequirements(
  leads: Array<{ id: string; name: string; title: string | null; certifications: string | null; licenses: string | null; specialty: string | null; location: string | null; text: string }>,
  originalQuery: string,
): Promise<Record<string, { match_score: number; license_match: boolean; cert_match: boolean; experience_match: boolean; location_match: boolean; scoring_notes: string }>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || leads.length === 0) return {};

  // Build candidate summaries for batch scoring
  const candidateSummaries = leads.map((l, i) => 
    `[${i}] ${l.name} | Title: ${l.title || 'N/A'} | Location: ${l.location || 'N/A'} | Certs: ${l.certifications || 'N/A'} | Licenses: ${l.licenses || 'N/A'} | Specialty: ${l.specialty || 'N/A'} | Profile: ${l.text.substring(0, 300)}`
  ).join('\n');

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare recruitment qualification engine. Score each candidate against the job requirements.

Scoring criteria (100 points total):
- LICENSE MATCH (30 pts): Does candidate have the required license type (RN, LPN, PT, OT, RT, etc.)? Is it the right state? Is it compact if required?
- CERTIFICATION MATCH (20 pts): Has required certs? BLS required for almost all nursing. ACLS for ICU/ER/Critical Care. PALS for pediatric/NICU. Specialty certs (CCRN, CEN, NRP, TNCC, etc.) are bonus.
- EXPERIENCE MATCH (30 pts): Years in the SPECIFIC specialty (ICU, ER, OR, etc.), not just total experience. 
- LOCATION MATCH (20 pts): Correct location or indication of willingness to relocate/travel.

If information is missing or unclear, give partial credit (e.g., if license type matches but state unknown, give 15/30).

You MUST respond with ONLY a valid JSON object, no markdown, no explanation. Format:
{"results":[{"index":0,"match_score":85,"license_match":true,"cert_match":true,"experience_match":true,"location_match":false,"notes":"RN license found, BLS/ACLS verified, 5yr ICU, location mismatch"}]}`
          },
          {
            role: 'user',
            content: `JOB REQUIREMENTS:\n${originalQuery}\n\nCANDIDATES:\n${candidateSummaries}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI scoring failed:', response.status);
      return {};
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return {};

    // Parse JSON, handling potential markdown wrapping
    const jsonStr = content.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    
    const scoreMap: Record<string, any> = {};
    for (const r of (parsed.results || [])) {
      const lead = leads[r.index];
      if (lead) {
        scoreMap[lead.id] = {
          match_score: Math.min(100, Math.max(0, r.match_score || 0)),
          license_match: !!r.license_match,
          cert_match: !!r.cert_match,
          experience_match: !!r.experience_match,
          location_match: !!r.location_match,
          scoring_notes: r.notes || '',
        };
      }
    }
    
    console.log(`Scored ${Object.keys(scoreMap).length} leads`);
    return scoreMap;
  } catch (e) {
    console.error('AI scoring error:', e);
    return {};
  }
}

// Parse lead data from Exa search result
function parseLeadFromResult(result: any): {
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  email: string | null;
  certifications: string | null;
  licenses: string | null;
  specialty: string | null;
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
  let certifications: string | null = null;
  let licenses: string | null = null;
  let specialty: string | null = null;
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
      certifications = summaryData.certifications || null;
      licenses = summaryData.licenses || null;
      specialty = summaryData.specialty || null;
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
    certifications,
    licenses,
    specialty,
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

    // Calculate how many leads we can save
    const availableCredits = subscription 
      ? subscription.credits_limit - (subscription.credits_used || 0) 
      : 10; // Default for users without subscription
    
    console.log('Searching with query:', trimmedQuery, '| Available credits:', availableCredits);

    // Expand the query using AI for better healthcare search results
    const expandedQuery = await expandHealthcareQuery(trimmedQuery);
    console.log('Using search query:', expandedQuery);

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
        query: expandedQuery,
        type: 'neural',
        category: 'people', // Targets LinkedIn profiles
        numResults: 20,
        contents: {
          text: { maxCharacters: 1500 },
          summary: {
            query: "Extract the person's professional healthcare information including certifications and licenses",
            schema: {
              "$schema": "http://json-schema.org/draft-07/schema#",
              "title": "Healthcare Professional Profile",
              "type": "object",
              "properties": {
                "name": { "type": "string", "description": "Full name of the person" },
                "jobTitle": { "type": "string", "description": "Current job title or role (e.g., ICU Nurse, Physical Therapist)" },
                "company": { "type": "string", "description": "Current employer (hospital, clinic, staffing agency)" },
                "location": { "type": "string", "description": "City and/or state" },
                "certifications": { "type": "string", "description": "Certifications like BLS, ACLS, PALS, CCRN, etc." },
                "licenses": { "type": "string", "description": "Professional licenses like RN, LPN, PT, OT, etc." },
                "specialty": { "type": "string", "description": "Clinical specialty like ICU, ER, OR, NICU, Med-Surg, etc." }
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

    // Parse and filter results - limit to available credits
    let savedCount = 0;
    let skippedCount = 0;
    const savedLeadsForScoring: Array<{ id: string; name: string; title: string | null; certifications: string | null; licenses: string | null; specialty: string | null; location: string | null; text: string }> = [];

    for (const result of results) {
      // Stop if we've reached the credit limit
      if (savedCount >= availableCredits) {
        console.log(`Credit limit reached (${availableCredits}), stopping lead processing`);
        break;
      }

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

      // Separate healthcare fields from parsed data to store in profile_data
      const { certifications: certs, licenses: lics, specialty: spec, ...parsedCore } = parsed;

      const leadData = {
        ...parsedCore,
        campaign_id: campaignId || null,
        user_id: userId,
        status: 'new',
        industry: spec || null,
        profile_data: {
          source: 'exa_search_direct',
          exa_id: result.id,
          exa_score: result.score,
          certifications: certs || null,
          licenses: lics || null,
          specialty: spec || null,
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
          savedLeadsForScoring.push({ id: existingLead.id, name: parsed.name, title: parsed.title, certifications: certs, licenses: lics, specialty: spec, location: parsed.location, text: result.text || '' });
        }
      } else {
        const { data: insertedLead, error: insertError } = await supabase
          .from('leads')
          .insert(leadData)
          .select('id')
          .single();
        
        if (insertError) {
          console.error('Error inserting lead:', insertError);
          skippedCount++;
        } else {
          console.log('Lead inserted:', parsed.name);
          savedCount++;
          if (insertedLead) {
            savedLeadsForScoring.push({ id: insertedLead.id, name: parsed.name, title: parsed.title, certifications: certs, licenses: lics, specialty: spec, location: parsed.location, text: result.text || '' });
          }
        }
      }
    }

    // Score saved leads against job requirements using AI
    if (savedLeadsForScoring.length > 0) {
      try {
        const scores = await scoreLeadsAgainstRequirements(savedLeadsForScoring, trimmedQuery);
        
        // Update each lead's profile_data with match scores
        for (const [leadId, scoreData] of Object.entries(scores)) {
          const { data: currentLead } = await supabase
            .from('leads')
            .select('profile_data')
            .eq('id', leadId)
            .maybeSingle();
          
          const existingData = (currentLead?.profile_data && typeof currentLead.profile_data === 'object')
            ? currentLead.profile_data as Record<string, any>
            : {};
          
          await supabase
            .from('leads')
            .update({
              profile_data: {
                ...existingData,
                match_score: scoreData.match_score,
                license_match: scoreData.license_match,
                cert_match: scoreData.cert_match,
                experience_match: scoreData.experience_match,
                location_match: scoreData.location_match,
                scoring_notes: scoreData.scoring_notes,
              },
            })
            .eq('id', leadId);
        }
        console.log('Lead scoring complete');
      } catch (scoreError) {
        console.error('Lead scoring failed (non-fatal):', scoreError);
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
