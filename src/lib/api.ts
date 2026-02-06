import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  id?: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  location?: string;
  industry?: string;
  profile_data?: any;
  status?: string;
  campaign_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Campaign {
  id?: string;
  name: string;
  goal?: string;
  status?: string;
  sent_count?: number;
  reply_count?: number;
  search_query?: string;
  lead_count?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OutreachMessage {
  id?: string;
  lead_id?: string;
  campaign_id?: string;
  subject?: string;
  body: string;
  status?: string;
  sent_at?: string;
  created_at?: string;
}

export interface GeneratedOutreach {
  subject: string;
  body: string;
  linkedin_message: string;
}

// Lead functions
export async function searchLeadsWithExa(params: {
  query?: string;
  campaignId?: string;
}): Promise<{ success: boolean; leads?: Lead[]; websetId?: string; status?: string; message?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('exa-search', {
    body: params,
  });

  if (error) {
    console.error('Exa search error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export async function generateOutreach(params: {
  lead: Lead;
  campaignGoal?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}): Promise<{ success: boolean; outreach?: GeneratedOutreach; error?: string }> {
  const { data, error } = await supabase.functions.invoke('generate-outreach', {
    body: params,
  });

  if (error) {
    console.error('Generate outreach error:', error);
    return { success: false, error: error.message };
  }

  return data;
}

export async function saveLeads(leads: Lead[], campaignId?: string): Promise<{ success: boolean; error?: string }> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const leadsWithCampaign = leads.map(lead => ({
    ...lead,
    campaign_id: campaignId || null,
    user_id: user.id,
  }));

  const { error } = await supabase.from('leads').insert(leadsWithCampaign);

  if (error) {
    console.error('Save leads error:', error);
    return { success: false, error: error.message };
  }

  // Update campaign lead_count if campaign_id provided
  if (campaignId) {
    await updateCampaignLeadCount(campaignId);
  }

  return { success: true };
}

export async function updateCampaignLeadCount(campaignId: string): Promise<void> {
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  await supabase
    .from('campaigns')
    .update({ lead_count: count || 0 })
    .eq('id', campaignId);
}

export async function getLeadsByCampaign(campaignId: string): Promise<{ success: boolean; leads?: Lead[]; error?: string }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get leads by campaign error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, leads: data };
}

export async function getLeads(): Promise<{ success: boolean; leads?: Lead[]; error?: string }> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get leads error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, leads: data };
}

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) {
    console.error('Update lead status error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  if (error) {
    console.error('Delete lead error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export interface LinkedInProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  email: string | null;
  mobileNumber: string | null;
  jobTitle: string;
  companyName: string;
  companyIndustry: string;
  companySize: string;
  companyWebsite: string;
  companyLinkedin: string;
  jobLocation: string;
  jobStartedOn: string;
  currentJobDuration: string;
  connections: number;
  followers: number;
  // Verification & status
  isVerified?: boolean;
  isPremium?: boolean;
  isCreator?: boolean;
  isInfluencer?: boolean;
  // Career stats
  totalExperienceYears?: number;
  firstRoleYear?: number | null;
  experiencesCount?: number;
  experiences: Array<{
    title: string;
    companyName: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string | null;
    stillWorking: boolean;
    duration: string;
    companyIndustry: string;
    companySize: string;
    companyLogo?: string;
    companyWebsite?: string;
    employmentType?: string;
  }>;
  educations: Array<{
    schoolName: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    description: string;
    logo?: string;
  }>;
  skills: Array<{ title: string }>;
  languages: Array<{ name: string; proficiency: string }>;
  certifications: Array<{ name: string; authority: string; issueDate: string; url?: string }>;
  volunteerExperience?: Array<{
    role: string;
    organization: string;
    description: string;
    industry: string;
  }>;
  relatedProfiles?: Array<{
    name: string;
    headline: string;
    linkedinUrl: string;
    profilePicture: string;
    followers?: number;
  }>;
  linkedinUrl: string;
  publicIdentifier: string;
  profilePicture: string;
  backgroundPicture?: string;
  addressCountryOnly?: string;
  addressWithCountry?: string;
}

export async function enrichLeadWithLinkedIn(
  leadId: string,
  linkedinUrl: string
): Promise<{ success: boolean; profile?: LinkedInProfile; error?: string }> {
  console.log('Enriching lead with LinkedIn:', leadId, linkedinUrl);

  // Call the apify-scrape edge function
  const { data, error } = await supabase.functions.invoke('apify-scrape', {
    body: { linkedinUrl },
  });

  if (error) {
    console.error('LinkedIn enrichment error:', error);
    return { success: false, error: error.message };
  }

  if (!data?.success || !data?.profile) {
    console.error('LinkedIn enrichment failed:', data?.error);
    return { success: false, error: data?.error || 'Failed to fetch LinkedIn profile' };
  }

  const profile: LinkedInProfile = data.profile;

  // Get current lead data to merge profile_data
  const { data: currentLead } = await supabase
    .from('leads')
    .select('profile_data')
    .eq('id', leadId)
    .single();

  // Merge LinkedIn data into profile_data
  const existingProfileData = (currentLead?.profile_data && typeof currentLead.profile_data === 'object') 
    ? currentLead.profile_data 
    : {};
  const updatedProfileData = {
    ...existingProfileData,
    linkedin: profile,
    linkedin_enriched_at: new Date().toISOString(),
  };

  // Update lead with enriched data
  const updates: Record<string, any> = {
    profile_data: updatedProfileData,
  };

  // Fill in missing basic fields from LinkedIn data
  const { data: leadData } = await supabase
    .from('leads')
    .select('email, phone, title, company, industry, location')
    .eq('id', leadId)
    .single();

  if (!leadData?.email && profile.email) {
    updates.email = profile.email;
  }
  if (!leadData?.phone && profile.mobileNumber) {
    updates.phone = profile.mobileNumber;
  }
  if (!leadData?.title && profile.jobTitle) {
    updates.title = profile.jobTitle;
  }
  if (!leadData?.company && profile.companyName) {
    updates.company = profile.companyName;
  }
  if (!leadData?.industry && profile.companyIndustry) {
    updates.industry = profile.companyIndustry;
  }
  if (!leadData?.location && profile.jobLocation) {
    updates.location = profile.jobLocation;
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId);

  if (updateError) {
    console.error('Failed to update lead with LinkedIn data:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log('Lead enriched successfully with LinkedIn data');
  return { success: true, profile };
}

// Campaign functions
export async function getCampaigns(): Promise<{ success: boolean; campaigns?: Campaign[]; error?: string }> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get campaigns error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, campaigns: data };
}

export async function getCampaignById(campaignId: string): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (error) {
    console.error('Get campaign error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, campaign: data || undefined };
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...campaign, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Create campaign error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, campaign: data };
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId);

  if (error) {
    console.error('Update campaign error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (error) {
    console.error('Delete campaign error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Outreach message functions
export async function saveOutreachMessage(params: {
  lead_id: string;
  subject?: string;
  body: string;
  campaign_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('outreach_messages').insert(params);

  if (error) {
    console.error('Save outreach error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getOutreachMessages(leadId?: string): Promise<{ success: boolean; messages?: OutreachMessage[]; error?: string }> {
  let query = supabase
    .from('outreach_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get outreach messages error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, messages: data };
}

// Stats functions
export async function getStats(): Promise<{
  totalLeads: number;
  contacted: number;
  replied: number;
  qualified: number;
}> {
  const { data: leads } = await supabase.from('leads').select('status');
  
  const allLeads = leads || [];
  
  return {
    totalLeads: allLeads.length,
    contacted: allLeads.filter(l => l.status === 'contacted').length,
    replied: allLeads.filter(l => l.status === 'replied').length,
    qualified: allLeads.filter(l => l.status === 'qualified').length,
  };
}
