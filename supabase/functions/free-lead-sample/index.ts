import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract name from LinkedIn URL slug as fallback
function extractNameFromLinkedInUrl(url: string): string {
  const urlMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
  if (urlMatch) {
    let slug = urlMatch[1];
    // Remove trailing hash (e.g., "john-doe-a1b2c3")
    slug = slug.replace(/-[a-f0-9]{6,}$/i, '');
    // Convert dashes to spaces and capitalize
    const name = slug
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return name;
  }
  return '';
}

// Parse lead data from Exa result - matching the main app approach
function parseLeadFromResult(result: any): {
  name: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  email_available: boolean;
  linkedin_available: boolean;
  phone_available: boolean;
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
    name = extractNameFromLinkedInUrl(url);
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
  
  // Check for contact info indicators
  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text) || 
    /\bemail\b/i.test(text) ||
    /contact/i.test(text);
  
  const hasPhone = /\+?[\d\s\-\(\)]{10,}/.test(text) ||
    /\bphone\b/i.test(text) ||
    /\bmobile\b/i.test(text);
  
  return {
    name: name.substring(0, 60),
    title: title || 'Professional',
    company: company?.substring(0, 60) || 'Company',
    location,
    url,
    email_available: hasEmail,
    linkedin_available: true,
    phone_available: hasPhone,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const exaApiKey = Deno.env.get('EXA_API_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { email, query } = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate query
    if (!query || query.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Please describe who you\'re looking for (at least 5 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limiting - max 3 per email
    const { data: emailSubmissions } = await adminClient
      .from('lead_magnet_submissions')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('magnet_type', 'free_leads');

    if (emailSubmissions && emailSubmissions.length >= 3) {
      return new Response(JSON.stringify({ 
        error: 'You\'ve already used your free lead samples. Sign up to get unlimited leads!',
        limit_reached: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limiting - max 5 per IP per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: ipSubmissions } = await adminClient
      .from('lead_magnet_submissions')
      .select('id')
      .eq('ip_address', ip)
      .eq('magnet_type', 'free_leads')
      .gte('created_at', oneDayAgo);

    if (ipSubmissions && ipSubmissions.length >= 5) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please try again later or sign up for full access.',
        limit_reached: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchQuery = query.trim();
    console.log('Searching for leads with query:', searchQuery);

    // Use the same approach as the main app: category "people" for LinkedIn profiles
    // Also use structured summary extraction for better data quality
    const exaResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': exaApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        type: 'neural',
        category: 'people', // This targets LinkedIn profiles specifically
        numResults: 15, // Request more to filter down to 5 good ones
        contents: {
          text: { maxCharacters: 1500 },
          // Use structured summary to extract person data
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

    if (!exaResponse.ok) {
      const errorText = await exaResponse.text();
      console.error('Exa API error:', exaResponse.status, errorText);
      throw new Error('Failed to search for leads');
    }

    const exaData = await exaResponse.json();
    const results = exaData.results || [];
    
    console.log(`Exa returned ${results.length} results`);

    // Parse and filter results using the same approach as the main app
    const validLeads: NonNullable<ReturnType<typeof parseLeadFromResult>>[] = [];
    
    for (const result of results) {
      const parsed = parseLeadFromResult(result);
      if (parsed) {
        validLeads.push(parsed);
        console.log('Valid lead found:', parsed.name, '-', parsed.title);
      }
      
      // Stop once we have 5 good leads
      if (validLeads.length >= 5) break;
    }

    console.log(`Parsed ${validLeads.length} valid leads`);

    // Create blurred version for response (hide sensitive data)
    const blurredLeads = validLeads.map((lead) => ({
      name: lead.name,
      title: lead.title,
      company: lead.company ? lead.company.substring(0, 3) + '***' : '***',
      location: lead.location,
      email_available: lead.email_available,
      linkedin_available: lead.linkedin_available,
      phone_available: lead.phone_available,
    }));

    // Store submission with full data
    const { error: insertError } = await adminClient
      .from('lead_magnet_submissions')
      .insert({
        email: email.toLowerCase(),
        magnet_type: 'free_leads',
        input_data: { query: searchQuery },
        output_data: { 
          leads: validLeads, 
          count: validLeads.length,
          raw_results_count: results.length 
        },
        ip_address: ip,
      });

    if (insertError) {
      console.error('Failed to store submission:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      leads: blurredLeads,
      total: blurredLeads.length,
      message: validLeads.length > 0 
        ? 'Sign up to unlock full contact details and get 250+ leads per month!'
        : 'No LinkedIn profiles found for that query. Try being more specific (e.g., "Marketing Director at SaaS companies in Amsterdam").',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Free lead sample error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
