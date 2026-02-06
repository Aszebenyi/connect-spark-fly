import { Mail, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEmailConnection } from '@/hooks/useEmailConnection';

export function EmailConnectionCard() {
  const { connection, isConnected, isLoading, isConnecting, connect, disconnect } = useEmailConnection();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Gmail</p>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            isConnected ? 'bg-green-500/10' : 'bg-muted'
          }`}>
            <Mail className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">Gmail</p>
              {isConnected && (
                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                  <Check className="h-3 w-3" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isConnected 
                ? connection?.email 
                : 'Send outreach emails from your Gmail account'
              }
            </p>
          </div>
        </div>
        
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="text-destructive hover:text-destructive"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Gmail
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
