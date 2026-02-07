import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent unauthorized AI API usage
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', claims.claims.sub);
    const { lead, campaignGoal, tone } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!lead) {
      throw new Error('Lead information is required');
    }

    console.log('Generating outreach for:', lead.name);
    console.log('Campaign goal:', campaignGoal);

    // Extract rich context from Exa enrichment data
    const enrichments = lead.profile_data?.enrichments || [];
    const enrichmentSnippets = enrichments
      .map((e: any) => e.references?.[0]?.snippet)
      .filter(Boolean)
      .join('\n\n');

    // Get LinkedIn enrichment data (from Apify)
    const linkedinData = lead.profile_data?.linkedin || null;
    
    // Build comprehensive profile context
    let profileContext = '';
    
    // LinkedIn About/Summary - most valuable for personalization
    if (linkedinData?.summary) {
      profileContext += `**ABOUT (from their LinkedIn):**\n${linkedinData.summary}\n\n`;
    }
    
    // Current role details
    if (linkedinData?.experiences?.[0]) {
      const currentRole = linkedinData.experiences[0];
      profileContext += `**CURRENT ROLE:**\n`;
      profileContext += `${currentRole.title} at ${currentRole.companyName}`;
      if (currentRole.duration) profileContext += ` (${currentRole.duration})`;
      profileContext += '\n';
      if (currentRole.description) {
        profileContext += `Role description: ${currentRole.description}\n`;
      }
      profileContext += '\n';
    }
    
    // Skills - useful for connecting value to their expertise
    if (linkedinData?.skills?.length > 0) {
      const topSkills = linkedinData.skills.slice(0, 8).map((s: any) => s.title).join(', ');
      profileContext += `**KEY SKILLS:** ${topSkills}\n\n`;
    }
    
    // Education - can be useful for alumni connection
    if (linkedinData?.educations?.[0]) {
      const edu = linkedinData.educations[0];
      profileContext += `**EDUCATION:** ${edu.degree || ''} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''} from ${edu.schoolName}\n\n`;
    }
    
    // Career trajectory - shows their journey
    if (linkedinData?.experiences?.length > 1) {
      const careerPath = linkedinData.experiences.slice(0, 3)
        .map((e: any) => `${e.title} at ${e.companyName}`)
        .join(' → ');
      profileContext += `**CAREER PATH:** ${careerPath}\n\n`;
    }
    
    // Company intel
    if (linkedinData?.companyIndustry || linkedinData?.companySize) {
      profileContext += `**COMPANY:** ${linkedinData.companyName || lead.company || 'Unknown'}`;
      if (linkedinData.companyIndustry) profileContext += ` (${linkedinData.companyIndustry})`;
      if (linkedinData.companySize) profileContext += ` - ${linkedinData.companySize} employees`;
      profileContext += '\n\n';
    }
    
    // Exa web enrichment data
    if (enrichmentSnippets) {
      profileContext += `**WEB PRESENCE/MENTIONS:**\n${enrichmentSnippets}\n\n`;
    }
    
    // Fallback context
    const profileSummary = lead.profile_data?.summary || '';
    const profileHeadline = lead.profile_data?.headline || linkedinData?.headline || '';
    
    if (!profileContext && (profileSummary || profileHeadline)) {
      profileContext = `**PROFILE:** ${profileSummary || profileHeadline}\n`;
    }

    console.log('Profile context length:', profileContext.length);
    console.log('Has LinkedIn data:', !!linkedinData);

    const systemPrompt = `You are an elite cold email copywriter. Your messages get 40%+ open rates and 15%+ reply rates. You write like a human, not a marketer.

Your style:
- Short, punchy sentences. Never more than 2 lines per paragraph
- No generic phrases like "I hope this finds you well" or "I came across your profile"
- Pattern interrupt opening lines that make them curious
- Reference SPECIFIC details from their background - be precise
- Connect their experience to value, don't sell features
- Soft CTAs that are easy to say yes to
- Write like you're texting a colleague, not writing a formal letter
- Use their first name naturally, not repeatedly

Tone: ${tone || 'professional but human'}

CRITICAL: The outreach must feel 1:1 personalized, not templated. Reference actual things from their profile.

PERSONALIZATION PRIORITIES:
1. Their "About" section - shows what they care about
2. Specific job responsibilities or achievements
3. Their skills and how they connect to your value
4. Career trajectory and transitions
5. Education (especially for alumni connection)
6. Company context (industry, size, challenges)`;

    const userPrompt = `Write a high-converting cold outreach for this lead:

**LEAD PROFILE:**
Name: ${lead.name}
Title: ${lead.title || linkedinData?.jobTitle || 'Professional'}
Company: ${lead.company || linkedinData?.companyName || 'their company'}
Location: ${lead.location || linkedinData?.jobLocation || 'Unknown'}
Industry: ${lead.industry || linkedinData?.companyIndustry || ''}

**RICH BACKGROUND DATA (USE THIS for deep personalization):**
${profileContext || 'No detailed background available - use general professional context'}

**CAMPAIGN GOAL:**
${campaignGoal || 'Connect and explore potential collaboration'}

Write outreach that:
1. Opens with something specific about THEM (reference their about section, skills, or recent role)
2. Connects their expertise/background to your value proposition
3. Shows you understand their world (use industry/role context)
4. Has a low-friction CTA aligned with the campaign goal
5. Feels like it was written by someone who actually researched them

Return JSON with:
- subject: Compelling, curiosity-driven subject line (max 50 chars, reference something specific about them)
- body: Email body in clean HTML format. Use <p> tags for paragraphs (2-3 short sentences max per paragraph). Do NOT use <br> between paragraphs. Keep it conversational and punchy. Example: <p>First paragraph here.</p><p>Second paragraph here.</p>
- linkedin_message: Shorter LinkedIn version (max 280 chars) - direct, personal, reference one specific thing from their profile`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_outreach',
              description: 'Generate personalized outreach messages',
              parameters: {
                type: 'object',
                properties: {
                  subject: { type: 'string', description: 'Email subject line' },
                  body: { type: 'string', description: 'Email body' },
                  linkedin_message: { type: 'string', description: 'Short LinkedIn message' },
                },
                required: ['subject', 'body', 'linkedin_message'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_outreach' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const outreach = JSON.parse(toolCall.function.arguments);
    
    console.log('Generated outreach subject:', outreach.subject);

    return new Response(
      JSON.stringify({ success: true, outreach }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in generate-outreach:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
