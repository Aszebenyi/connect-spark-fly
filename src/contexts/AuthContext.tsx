import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  plan_id: string;
  plan_name: string;
  credits_limit: number;
  credits_used: number;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionData | null;
  subscriptionLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const refreshSubscription = useCallback(async () => {
    if (!session) {
      setSubscription(null);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Failed to check subscription:', error);
        // Set default free subscription on error
        setSubscription({
          subscribed: false,
          plan_id: 'free',
          plan_name: 'Free',
          credits_limit: 10,
          credits_used: 0,
          subscription_end: null,
        });
        return;
      }

      setSubscription(data);
    } catch (error) {
      console.error('Subscription check error:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer subscription check to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            refreshSubscription();
          }, 0);
        } else {
          setSubscription(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch subscription for existing session on initial load
      if (session?.user) {
        supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }).then(({ data, error }) => {
          if (!error && data) {
            setSubscription(data);
          }
        });
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Refresh subscription periodically (every 60 seconds)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(refreshSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Trigger welcome email for new users
    if (!error && data.user) {
      supabase.functions.invoke('send-automated-email', {
        body: { event_type: 'user_signup', user_id: data.user.id }
      }).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });
    }

    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      subscription,
      subscriptionLoading,
      signUp,
      signIn,
      signOut,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
