import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingProgress {
  hasEmailConnection: boolean;
  hasCompanyProfile: boolean;
  hasCampaign: boolean;
  hasLeads: boolean;
  hasSentOutreach: boolean;
  isComplete: boolean;
  isLoading: boolean;
  completedCount: number;
  totalSteps: number;
}

export function useOnboardingProgress(): OnboardingProgress & { refresh: () => void } {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Omit<OnboardingProgress, 'isComplete' | 'completedCount' | 'totalSteps'>>({
    hasEmailConnection: false,
    hasCompanyProfile: false,
    hasCampaign: false,
    hasLeads: false,
    hasSentOutreach: false,
    isLoading: true,
  });

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch all data in parallel
      const [emailResult, profileResult, campaignsResult, leadsResult, outreachResult] = await Promise.all([
        supabase.from('email_connections').select('id').eq('is_active', true).limit(1),
        supabase.from('profiles').select('company').eq('user_id', user.id).not('company', 'is', null).limit(1),
        supabase.from('campaigns').select('id').limit(1),
        supabase.from('leads').select('id').limit(1),
        supabase.from('outreach_messages').select('id').limit(1),
      ]);

      setProgress({
        hasEmailConnection: (emailResult.data?.length ?? 0) > 0,
        hasCompanyProfile: (profileResult.data?.length ?? 0) > 0,
        hasCampaign: (campaignsResult.data?.length ?? 0) > 0,
        hasLeads: (leadsResult.data?.length ?? 0) > 0,
        hasSentOutreach: (outreachResult.data?.length ?? 0) > 0,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
      setProgress(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const completedCount = [
    progress.hasEmailConnection,
    progress.hasCompanyProfile,
    progress.hasCampaign,
    progress.hasLeads,
    progress.hasSentOutreach,
  ].filter(Boolean).length;

  const totalSteps = 5;
  const isComplete = completedCount === totalSteps;

  return {
    ...progress,
    isComplete,
    completedCount,
    totalSteps,
    refresh: fetchProgress,
  };
}
