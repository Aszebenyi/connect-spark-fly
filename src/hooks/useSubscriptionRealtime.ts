import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSubscriptionRealtime() {
  const { user, refreshSubscription } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up subscription realtime for user:', user.id);

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Subscription changed via realtime:', payload);
          refreshSubscription();
        }
      )
      .subscribe((status) => {
        console.log('Subscription realtime status:', status);
      });

    return () => {
      console.log('Cleaning up subscription realtime');
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshSubscription]);
}
