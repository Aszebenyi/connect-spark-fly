import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Expand query with AI
async function expandHealthcareQuery(rawQuery: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return rawQuery;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare recruitment search query optimizer. Given a job description, produce a single optimized search string for finding matching healthcare professionals on LinkedIn.
Rules:
- Output ONLY the optimized search string, nothing else
- Keep it under 200 characters
- Include role synonyms and location variations
- Include relevant license types and certifications
- Focus on LinkedIn profile language`
          },
          { role: 'user', content: rawQuery },
        ],
      }),
    });

    if (!response.ok) return rawQuery;
    const data = await response.json();
    const expanded = data.choices?.[0]?.message?.content?.trim();
    return (expanded && expanded.length > 5 && expanded.length < 300) ? expanded : rawQuery;
  } catch {
    return rawQuery;
  }
}

// Score candidates against requirements
async function scoreLeads(
  leads: Array<{ idx: number; name: string; title: string | null; certifications: string | null; licenses: string | null; specialty: string | null; location: string | null; text: string }>,
  originalQuery: string,
): Promise<Record<number, { match_score: number; license_match: boolean; cert_match: boolean; experience_match: boolean; location_match: boolean; scoring_notes: string }>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY || leads.length === 0) return {};

  const candidateSummaries = leads.map(l =>
    `[${l.idx}] ${l.name} | Title: ${l.title || 'N/A'} | Location: ${l.location || 'N/A'} | Certs: ${l.certifications || 'N/A'} | Licenses: ${l.licenses || 'N/A'} | Specialty: ${l.specialty || 'N/A'} | Profile: ${l.text.substring(0, 300)}`
  ).join('\n');

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a healthcare recruitment qualification engine. Score each candidate against the job requirements.
Scoring (100 pts): LICENSE (30), CERTIFICATIONS (20), EXPERIENCE (30), LOCATION (20). Give partial credit for missing info.`
          },
          { role: 'user', content: `JOB REQUIREMENTS:\n${originalQuery}\n\nCANDIDATES:\n${candidateSummaries}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_scores',
            description: 'Submit scores for all candidates',
            parameters: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'number' },
                      match_score: { type: 'number' },
                      license_match: { type: 'boolean' },
                      cert_match: { type: 'boolean' },
                      experience_match: { type: 'boolean' },
                      location_match: { type: 'boolean' },
                      notes: { type: 'string' },
                    },
                    required: ['index', 'match_score', 'license_match', 'cert_match', 'experience_match', 'location_match', 'notes'],
                  },
                },
              },
              required: ['results'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_scores' } },
      }),
    });

    if (!response.ok) return {};
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return {};

    const parsed = JSON.parse(toolCall.function.arguments);
    const scoreMap: Record<number, any> = {};
    for (const r of (parsed.results || [])) {
      scoreMap[r.index] = {
        match_score: Math.min(100, Math.max(0, r.match_score || 0)),
        license_match: !!r.license_match,
        cert_match: !!r.cert_match,
        experience_match: !!r.experience_match,
        location_match: !!r.location_match,
        scoring_notes: r.notes || '',
      };
    }
    return scoreMap;
  } catch {
    return {};
  }
}

// Extract healthcare credentials
function extractHealthcareData(text: string) {
  if (!text) return { certifications: null, licenses: null, specialty: null };
  const textUpper = text.toUpperCase();

  const certPatterns = ['BLS', 'ACLS', 'PALS', 'NRP', 'TNCC', 'CCRN', 'CEN', 'CNOR', 'ONS', 'NIHSS', 'STABLE'];
  const foundCerts = certPatterns.filter(c => new RegExp(`(?:^|[^A-Z])${c}(?:[^A-Z]|$)`).test(textUpper));

  const licensePatterns = [
    { pattern: /\bRN\b/, label: 'RN' }, { pattern: /\bBSN\b/, label: 'BSN' },
    { pattern: /\bMSN\b/, label: 'MSN' }, { pattern: /\bLPN\b/, label: 'LPN' },
    { pattern: /\bNP\b/, label: 'NP' }, { pattern: /\bCRNA\b/, label: 'CRNA' },
    { pattern: /\bCNA\b/, label: 'CNA' },
  ];
  const foundLicenses = licensePatterns.filter(l => l.pattern.test(text)).map(l => l.label);

  const specialtyPatterns = [
    { pattern: /\b(?:ICU|Intensive Care)\b/i, label: 'ICU' },
    { pattern: /\b(?:ER|Emergency)\b/i, label: 'Emergency' },
    { pattern: /\b(?:OR|Operating Room|Surgical)\b/i, label: 'Surgical' },
    { pattern: /\bNICU\b/i, label: 'NICU' },
    { pattern: /\b(?:Med[\s-]?Surg)\b/i, label: 'Med-Surg' },
    { pattern: /\b(?:L&D|Labor)\b/i, label: 'L&D' },
    { pattern: /\bPACU\b/i, label: 'PACU' },
    { pattern: /\b(?:Tele|Telemetry)\b/i, label: 'Telemetry' },
    { pattern: /\bOncology\b/i, label: 'Oncology' },
    { pattern: /\bPediatric/i, label: 'Pediatrics' },
  ];
  const foundSpecialties = specialtyPatterns.filter(s => s.pattern.test(text)).map(s => s.label);

  return {
    certifications: foundCerts.length > 0 ? foundCerts.join(', ') : null,
    licenses: foundLicenses.length > 0 ? foundLicenses.join(', ') : null,
    specialty: foundSpecialties.length > 0 ? foundSpecialties.join(', ') : null,
  };
}

// Parse lead from Exa result
function parseLeadFromResult(result: any) {
  const url = result.url || '';
  const text = result.text || '';
  if (!url.toLowerCase().includes('linkedin.com/in/')) return null;

  let name = '', title = '', company = '';
  let location: string | null = null;

  const titleStr = result.title || '';
  const cleanTitle = titleStr.replace(/\s*[|·]\s*LinkedIn.*$/i, '').trim();
  const pipesParts = cleanTitle.split(/\s*[|]\s*/);
  if (pipesParts.length >= 2) {
    name = pipesParts[0]?.trim() || '';
    const secondPart = pipesParts[1]?.trim() || '';
    const atMatch = secondPart.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (atMatch) { title = atMatch[1]?.trim() || ''; company = atMatch[2]?.trim() || ''; }
    else title = secondPart;
  } else {
    const parts = cleanTitle.split(/\s*[-–]\s*/);
    if (parts.length >= 1) name = parts[0]?.trim() || '';
    if (parts.length >= 2) {
      const atMatch = parts[1]?.trim().match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
      if (atMatch) { title = atMatch[1]?.trim() || ''; company = atMatch[2]?.trim() || ''; }
      else title = parts[1]?.trim() || '';
    }
    if (parts.length >= 3 && !company) company = parts[2]?.trim() || '';
  }

  if (!name) {
    const urlMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (urlMatch) {
      let slug = urlMatch[1].replace(/-[a-f0-9]{6,}$/i, '');
      name = slug.replace(/-/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  if (!name || name.length < 2) return null;
  const nameLower = name.toLowerCase();
  if (['job', 'search', 'result', 'linkedin'].some(w => nameLower.includes(w))) return null;

  // Extract location
  const locationPatterns = [
    /(?:based in|located in|from|📍)\s*([^|\n,]+(?:,\s*[^|\n]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+))\s*(?:\||·|area|$)/,
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length < 50) { location = match[1].trim(); break; }
  }

  // Extract years of experience
  let years_experience: number | null = null;
  const yearsMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|nursing|healthcare)/i);
  if (yearsMatch) years_experience = parseInt(yearsMatch[1]);

  const healthcareData = extractHealthcareData(text + ' ' + titleStr);

  return {
    name: name.substring(0, 60),
    title: title || null,
    company: company?.substring(0, 60) || null,
    location,
    years_experience,
    ...healthcareData,
    // DO NOT include: email, phone, linkedin_url (locked fields)
    summary: text.substring(0, 200),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // IP-based rate limiting (3 searches per IP per day)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('cf-connecting-ip') ||
               'unknown';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check IP rate limit using rate_limits table
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: existingLimit } = await supabase
      .from('rate_limits')
      .select('id, request_count')
      .eq('user_id', '00000000-0000-0000-0000-000000000000') // Anonymous user placeholder
      .eq('endpoint', `preview-search:${ip}`)
      .gte('window_start', windowStart)
      .maybeSingle();

    if (existingLimit && existingLimit.request_count >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Daily preview search limit reached. Sign up for unlimited searches.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update or insert rate limit
    if (existingLimit) {
      await supabase.from('rate_limits')
        .update({ request_count: existingLimit.request_count + 1 })
        .eq('id', existingLimit.id);
    } else {
      await supabase.from('rate_limits')
        .insert({ user_id: '00000000-0000-0000-0000-000000000000', endpoint: `preview-search:${ip}`, window_start: windowStart, request_count: 1 });
    }

    const body = await req.json();
    const query = body.query;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (query.trim().length > 300) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedQuery = query.trim();

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY');
    if (!EXA_API_KEY) throw new Error('EXA_API_KEY not configured');

    // Expand query
    const expandedQuery = await expandHealthcareQuery(trimmedQuery);
    console.log('Preview search query:', expandedQuery);

    // Exa search - limited to 10 results, we'll take top 5 valid ones
    const searchResponse = await fetch(EXA_SEARCH_URL, {
      method: 'POST',
      headers: { 'x-api-key': EXA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: expandedQuery,
        type: 'neural',
        category: 'people',
        numResults: 10,
        contents: { text: { maxCharacters: 1500 } },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Exa search error:', searchResponse.status, errorText);
      throw new Error(`Search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.results || [];

    // Parse results, limit to 5
    const parsedLeads: Array<any> = [];
    for (const result of results) {
      if (parsedLeads.length >= 5) break;
      const parsed = parseLeadFromResult(result);
      if (parsed) {
        parsedLeads.push({ ...parsed, _text: result.text || '' });
      }
    }

    // Score leads
    if (parsedLeads.length > 0) {
      const leadsForScoring = parsedLeads.map((l, i) => ({
        idx: i, name: l.name, title: l.title, certifications: l.certifications,
        licenses: l.licenses, specialty: l.specialty, location: l.location, text: l._text,
      }));

      const scores = await scoreLeads(leadsForScoring, trimmedQuery);

      for (let i = 0; i < parsedLeads.length; i++) {
        const score = scores[i];
        if (score) {
          parsedLeads[i].match_score = score.match_score;
          parsedLeads[i].license_match = score.license_match;
          parsedLeads[i].cert_match = score.cert_match;
          parsedLeads[i].experience_match = score.experience_match;
          parsedLeads[i].location_match = score.location_match;
          parsedLeads[i].scoring_notes = score.scoring_notes;
        }
        // Remove internal fields
        delete parsedLeads[i]._text;
      }
    }

    // Sort by match score descending
    parsedLeads.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return new Response(JSON.stringify({
      success: true,
      leads: parsedLeads,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Preview search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
