import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Extract healthcare-specific data for the Oracle method
    const matchScore = lead.profile_data?.match_score;
    const scoringNotes = lead.profile_data?.scoring_notes || '';
    const licenses = lead.profile_data?.licenses || '';
    const certifications = lead.profile_data?.certifications || '';
    const specialty = lead.profile_data?.specialty || '';
    const yearsExperience = lead.profile_data?.years_experience || '';

    const systemPrompt = `You are a healthcare recruiter writing cold outreach emails. You follow the Oracle Method: 3 paragraphs, 4-6 sentences total. Every email must be ASSUMPTIVE — never passive.

STRUCTURE (exactly 3 paragraphs):

Paragraph 1 - Who You Are (1-2 sentences):
Introduce yourself, your company, and what you specialize in. Keep it brief and credible.

Paragraph 2 - Why You're Reaching Out (2-3 sentences):
Reference the specific job opening, the candidate's credentials (licenses, certifications, specialty, years of experience), and why they're a match. Use REAL data from their profile.

Paragraph 3 - What You Want (1-2 sentences):
Be ASSUMPTIVE. Ask for specific availability. Never use passive language.

CRITICAL RULES:
- Total email MUST be under 6 sentences
- ASSUMPTIVE language ONLY: "What does your availability look like Thursday or Friday?" / "Looking forward to connecting" / "Thanks in advance"
- NEVER use passive: "Would this be interesting?" / "Is this worth exploring?" / "If you're open to it" / "Worth a chat?"
- Pull REAL data from the candidate profile (licenses, certs, specialty, experience, employer)
- Pull job context from the campaign goal
- Keep it professional but warm — not salesy

Tone: ${tone || 'professional and direct'}`;

    const firstName = lead.name?.split(' ')[0] || lead.name;

    const userPrompt = `Write a cold recruitment email using the Oracle Method for this candidate:

**CANDIDATE:**
Name: ${lead.name} (first name: ${firstName})
Title: ${lead.title || linkedinData?.jobTitle || 'Healthcare Professional'}
Current Employer: ${lead.company || linkedinData?.companyName || 'their current facility'}
Location: ${lead.location || linkedinData?.jobLocation || 'Unknown'}
Specialty: ${specialty || lead.industry || ''}
Licenses: ${licenses || 'Not specified'}
Certifications: ${certifications || 'Not specified'}
Years Experience: ${yearsExperience || 'Not specified'}
Match Score: ${matchScore ? `${matchScore}/100` : 'N/A'}
Scoring Notes: ${scoringNotes || 'None'}

**BACKGROUND DATA:**
${profileContext || 'No detailed background available'}

**JOB OPENING / CAMPAIGN GOAL:**
${campaignGoal || 'Healthcare recruitment opportunity'}

Write the email following the Oracle Method structure exactly. Use the candidate's REAL credentials and data.

Return JSON with:
- subject: Short, specific subject line referencing the opportunity or their specialty (max 50 chars)
- body: Email body in clean HTML. Use <p> tags for each paragraph. Exactly 3 paragraphs, 4-6 sentences total. Example: <p>Paragraph 1.</p><p>Paragraph 2.</p><p>Paragraph 3.</p>
- linkedin_message: Shorter LinkedIn version (max 280 chars) - direct, assumptive, reference their credentials`;

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
