import { useEffect } from 'react';
import { Loader2, Mail } from 'lucide-react';

export function OAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && window.opener) {
      // Send code to parent window
      window.opener.postMessage(
        { type: 'gmail-oauth', code }, 
        window.location.origin
      );
      // Close popup after a short delay to show the message
      setTimeout(() => window.close(), 1500);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Mail className="h-8 w-8 text-primary" />
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Connecting Gmail...</p>
        <p className="text-xs text-muted-foreground">This window will close automatically.</p>
      </div>
    </div>
  );
}
