import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailStats {
  emails_sent_today: number;
  recommended_limit: number;
  account_age_days: number;
  approaching_limit: boolean;
  over_limit: boolean;
  has_connection: boolean;
}

export function useEmailStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-email-stats');
      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch email stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refresh: fetchStats };
}
