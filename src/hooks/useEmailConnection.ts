import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EmailConnection {
  id: string;
  provider: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export function useEmailConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<EmailConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('email_connections_safe')
        .select('id, provider, email, is_active, created_at')
        .eq('user_id', user.id)
        .eq('provider', 'gmail')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error fetching email connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to connect your Gmail');
      return;
    }

    setIsConnecting(true);

    try {
      // Use /dashboard as redirect - it's a real route
      const redirectUri = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'authorize', redirectUri },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open Google OAuth in a popup
        const popup = window.open(
          data.authUrl,
          'gmail-oauth',
          'width=600,height=700,left=200,top=100'
        );

        if (!popup) {
          toast.error('Please allow popups to connect your Gmail');
          setIsConnecting(false);
          return;
        }

        // Listen for message from popup (more reliable than polling URL)
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'gmail-oauth') return;
          
          window.removeEventListener('message', handleMessage);
          const code = event.data.code;
          
          if (code) {
            try {
              const { data: callbackData, error: callbackError } = await supabase.functions.invoke('gmail-auth', {
                body: { action: 'callback', code, redirectUri },
              });

              if (callbackError) throw callbackError;

              if (callbackData?.success) {
                toast.success(`Gmail connected: ${callbackData.email}`);
                await fetchConnection();
              }
            } catch (err: any) {
              console.error('Gmail callback error:', err);
              toast.error(err.message || 'Failed to complete Gmail connection');
            }
          }
          
          setIsConnecting(false);
        };
        
        window.addEventListener('message', handleMessage);

        // Also check if popup is closed manually
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setIsConnecting(false);
            fetchConnection(); // Refresh in case it connected
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Gmail connect error:', error);
      toast.error(error.message || 'Failed to connect Gmail');
      setIsConnecting(false);
    }
  }, [user, fetchConnection]);

  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'disconnect' },
      });

      if (error) throw error;

      // Also delete locally
      await supabase
        .from('email_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'gmail');

      setConnection(null);
      toast.success('Gmail disconnected');
    } catch (error: any) {
      console.error('Gmail disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect Gmail');
    }
  }, [user]);

  const sendEmail = useCallback(async (params: {
    leadId?: string;
    to: string;
    subject: string;
    body: string;
    campaignId?: string;
  }) => {
    if (!connection) {
      toast.error('Please connect your Gmail account first');
      return { success: false, error: 'No email connection' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          leadId: params.leadId,
          to: params.to,
          subject: params.subject,
          emailBody: params.body,
          campaignId: params.campaignId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Email sent successfully!');
        return { success: true, messageId: data.messageId };
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Send email error:', error);
      toast.error(error.message || 'Failed to send email');
      return { success: false, error: error.message };
    }
  }, [connection]);

  return {
    connection,
    isConnected: !!connection,
    isLoading,
    isConnecting,
    connect,
    disconnect,
    sendEmail,
    refresh: fetchConnection,
  };
}
