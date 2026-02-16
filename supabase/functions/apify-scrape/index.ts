import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';
import { logError, logInfo } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent unauthorized API usage
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

    logInfo('Authenticated user', { userId: claims.claims.sub, endpoint: 'apify-scrape' });

    // Rate limit check  
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const rateLimit = await checkRateLimit(supabaseAdmin, claims.claims.sub as string, 'apify-scrape');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt, rateLimit.retryAfter!);
    }

    const { linkedinUrl } = await req.json();
    
    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY is not configured');
    }

    if (!linkedinUrl) {
      throw new Error('LinkedIn URL is required');
    }

    console.log('Scraping LinkedIn profile:', linkedinUrl);

    // Use the new LinkedIn Profile Scraper actor (2SyF0bVxmgGr8IVCZ)
    const actorId = '2SyF0bVxmgGr8IVCZ';
    
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrls: [linkedinUrl],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Apify API error:', response.status, errorText);
      throw new Error(`Apify API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Apify scrape completed, items:', data.length);

    if (!data || data.length === 0) {
      throw new Error('No profile data returned from Apify');
    }

    const profile = data[0];

    // Helper to parse education subtitle like "Master's degree, Marketing Management"
    const parseEducationSubtitle = (subtitle: string | undefined): { degree: string; fieldOfStudy: string } => {
      if (!subtitle) return { degree: '', fieldOfStudy: '' };
      const parts = subtitle.split(', ');
      return {
        degree: parts[0] || '',
        fieldOfStudy: parts.slice(1).join(', ') || '',
      };
    };
    
    // Extract and normalize the comprehensive profile data
    const linkedinProfile = {
      // Basic info
      fullName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      headline: profile.headline || '',
      summary: profile.about || profile.summary || '',
      
      // Contact info
      email: profile.email || null,
      mobileNumber: profile.mobileNumber || null,
      
      // Current job
      jobTitle: profile.jobTitle || '',
      companyName: profile.companyName || '',
      companyIndustry: profile.companyIndustry || '',
      companySize: profile.companySize || '',
      companyWebsite: profile.companyWebsite || '',
      companyLinkedin: profile.companyLinkedin || '',
      jobLocation: profile.jobLocation || profile.addressWithCountry || '',
      jobStartedOn: profile.jobStartedOn || '',
      currentJobDuration: profile.currentJobDuration || '',
      
      // Profile stats
      connections: profile.connections || 0,
      followers: profile.followers || 0,
      
      // Verification and status
      isVerified: profile.isVerified || false,
      isPremium: profile.isPremium || false,
      isCreator: profile.isCreator || false,
      isInfluencer: profile.isInfluencer || false,
      
      // Career stats
      totalExperienceYears: profile.totalExperienceYears || 0,
      firstRoleYear: profile.firstRoleYear || null,
      experiencesCount: profile.experiencesCount || 0,
      
      // Full experience history
      experiences: (profile.experiences || []).map((exp: any) => ({
        title: exp.title || '',
        companyName: exp.companyName || '',
        description: exp.jobDescription || exp.description || '',
        location: exp.jobLocation || exp.location || '',
        startDate: exp.jobStartedOn || exp.startDate || '',
        endDate: exp.jobEndedOn || exp.endDate || null,
        stillWorking: exp.jobStillWorking || false,
        duration: '',
        companyIndustry: exp.companyIndustry || '',
        companySize: exp.companySize || '',
        companyLogo: exp.logo || '',
        companyWebsite: exp.companyWebsite || '',
        employmentType: exp.employmentType || '',
      })),
      
      // Education - fix nested structure from Apify
      educations: (profile.educations || []).map((edu: any) => {
        const parsed = parseEducationSubtitle(edu.subtitle);
        return {
          schoolName: edu.title || edu.schoolName || '',
          degree: parsed.degree || edu.degree || '',
          fieldOfStudy: parsed.fieldOfStudy || edu.fieldOfStudy || '',
          startYear: edu.period?.startedOn?.year?.toString() || edu.startYear || '',
          endYear: edu.period?.endedOn?.year?.toString() || edu.endYear || '',
          description: edu.description || '',
          logo: edu.logo || '',
        };
      }),
      
      // Skills
      skills: (profile.skills || []).map((skill: any) => ({
        title: typeof skill === 'string' ? skill : (skill.title || skill.name || ''),
      })),
      
      // Languages
      languages: (profile.languages || []).map((lang: any) => ({
        name: typeof lang === 'string' ? lang : (lang.name || ''),
        proficiency: typeof lang === 'object' ? (lang.proficiency || '') : '',
      })),
      
      // Certifications - Apify uses licenseAndCertificates
      certifications: (profile.licenseAndCertificates || profile.certifications || []).map((cert: any) => ({
        name: cert.name || cert.title || '',
        authority: cert.authority || '',
        issueDate: cert.startedOn?.year ? cert.startedOn.year.toString() : (cert.issueDate || ''),
        url: cert.url || '',
      })),
      
      // Volunteer experience
      volunteerExperience: (profile.volunteerAndAwards || []).map((vol: any) => ({
        role: vol.role || '',
        organization: vol.organization || '',
        description: vol.description || '',
        industry: vol.industry || '',
      })),
      
      // Related profiles (people also viewed)
      relatedProfiles: (profile.peopleAlsoViewed || []).slice(0, 10).map((person: any) => ({
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        headline: person.headline || '',
        linkedinUrl: person.url || '',
        profilePicture: person.profile_picture || '',
        followers: person.follower_count || 0,
      })),
      
      // Profile URL and identifiers
      linkedinUrl: profile.linkedinUrl || profile.linkedinPublicUrl || linkedinUrl,
      publicIdentifier: profile.publicIdentifier || '',
      
      // Profile pictures - Apify uses profilePic not profilePicture
      profilePicture: profile.profilePic || profile.profilePicHighQuality || profile.profilePicture || '',
      backgroundPicture: profile.backgroundPic || '',
      
      // Location
      addressCountryOnly: profile.addressCountryOnly || '',
      addressWithCountry: profile.addressWithCountry || '',
    };

    console.log('Profile extracted:', linkedinProfile.fullName, '- Skills:', linkedinProfile.skills.length, '- Experiences:', linkedinProfile.experiences.length, '- Certifications:', linkedinProfile.certifications.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: linkedinProfile,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in apify-scrape:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
