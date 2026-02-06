import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingProgress {
  hasCampaign: boolean;
  hasLeads: boolean;
  hasEmailConnection: boolean;
  hasSentOutreach: boolean;
  isComplete: boolean;
  isLoading: boolean;
  completedCount: number;
  totalSteps: number;
}

export function useOnboardingProgress(): OnboardingProgress & { refresh: () => void } {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Omit<OnboardingProgress, 'isComplete' | 'completedCount' | 'totalSteps'>>({
    hasCampaign: false,
    hasLeads: false,
    hasEmailConnection: false,
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
      const [campaignsResult, leadsResult, emailResult, contactedResult] = await Promise.all([
        supabase.from('campaigns').select('id').limit(1),
        supabase.from('leads').select('id').limit(1),
        supabase.from('email_connections').select('id').eq('is_active', true).limit(1),
        supabase.from('leads').select('id').eq('status', 'contacted').limit(1),
      ]);

      setProgress({
        hasCampaign: (campaignsResult.data?.length ?? 0) > 0,
        hasLeads: (leadsResult.data?.length ?? 0) > 0,
        hasEmailConnection: (emailResult.data?.length ?? 0) > 0,
        hasSentOutreach: (contactedResult.data?.length ?? 0) > 0,
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
    progress.hasCampaign,
    progress.hasLeads,
    progress.hasEmailConnection,
    progress.hasSentOutreach,
  ].filter(Boolean).length;

  const totalSteps = 4;
  const isComplete = completedCount === totalSteps;

  return {
    ...progress,
    isComplete,
    completedCount,
    totalSteps,
    refresh: fetchProgress,
  };
}
