import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Lead } from '@/lib/api';

interface UseLeadSubscriptionOptions {
  campaignId?: string;
  enabled?: boolean;
  onLeadArrived?: (lead: Lead) => void;
}

interface UseLeadSubscriptionReturn {
  newLeadsCount: number;
  latestLead: Lead | null;
  isListening: boolean;
  resetCount: () => void;
}

export function useLeadSubscription({
  campaignId,
  enabled = true,
  onLeadArrived,
}: UseLeadSubscriptionOptions): UseLeadSubscriptionReturn {
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [latestLead, setLatestLead] = useState<Lead | null>(null);
  const [isListening, setIsListening] = useState(false);

  const resetCount = useCallback(() => {
    setNewLeadsCount(0);
    setLatestLead(null);
  }, []);

  useEffect(() => {
    if (!enabled || !campaignId) {
      setIsListening(false);
      return;
    }

    const channel = supabase
      .channel(`leads-campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newLead = payload.new as Lead;
          setNewLeadsCount((prev) => prev + 1);
          setLatestLead(newLead);
          onLeadArrived?.(newLead);
        }
      )
      .subscribe((status) => {
        setIsListening(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsListening(false);
    };
  }, [campaignId, enabled, onLeadArrived]);

  return {
    newLeadsCount,
    latestLead,
    isListening,
    resetCount,
  };
}
