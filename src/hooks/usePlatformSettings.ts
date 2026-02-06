import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSettings {
  app_name: string;
  app_tagline: string;
  support_email: string;
  email_from_name: string;
  email_from_address: string;
  dashboard_url: string;
  privacy_email: string;
  terms_url: string;
  privacy_url: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  app_name: 'LeadPulse',
  app_tagline: 'AI-Powered Lead Generation',
  support_email: 'support@leadpulse.com',
  email_from_name: 'LeadPulse',
  email_from_address: 'onboarding@resend.dev',
  dashboard_url: '',
  privacy_email: 'privacy@leadpulse.com',
  terms_url: '/terms',
  privacy_url: '/privacy',
};

async function fetchPlatformSettings(): Promise<PlatformSettings> {
  // Try to fetch from edge function (works for non-admins too)
  const { data, error } = await supabase.functions.invoke('get-platform-settings');
  
  if (error || !data?.settings) {
    console.warn('Could not fetch platform settings, using defaults');
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...data.settings,
  };
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: fetchPlatformSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (replaces cacheTime)
    refetchOnWindowFocus: false,
  });
}

// Simple getter for use in non-React contexts
export async function getPlatformSettings(): Promise<PlatformSettings> {
  return fetchPlatformSettings();
}
