import { useState, useEffect } from 'react';
import { Lead } from '@/types/lead';
import { Campaign } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Mail } from 'lucide-react';
import { generateOutreach } from '@/lib/api';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmailModalProps {
  lead: Lead | null;
  campaign?: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

export function EmailModal({ lead, campaign, isOpen, onClose, onSent }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { isConnected, sendEmail } = useEmailConnection();
  const { user } = useAuth();
  const { toast } = useToast();

  // Generate email when modal opens with a new lead
  useEffect(() => {
    if (!isOpen || !lead) return;
    setSubject('');
    setBody('');
    setIsGenerating(true);

    generateOutreach({
      lead: {
        name: lead.name,
        title: lead.title,
        company: lead.company,
        email: lead.email,
        profile_data: lead.profile_data || lead.profileData,
      },
      campaignGoal: campaign?.goal || campaign?.name,
      tone: 'professional',
    }).then((result) => {
      if (result.success && result.outreach) {
        setSubject(result.outreach.subject);
        setBody(result.outreach.body);
      } else {
        toast({ title: 'Failed to generate email', description: result.error, variant: 'destructive' });
      }
    }).catch(() => {
      toast({ title: 'Failed to generate email', variant: 'destructive' });
    }).finally(() => {
      setIsGenerating(false);
    });
  }, [isOpen, lead?.id]);

  const handleSend = async () => {
    if (!lead?.email) {
      toast({ title: 'No email address', description: 'This candidate has no email address.', variant: 'destructive' });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and body are required.', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        leadId: lead.id,
        to: lead.email,
        subject,
        body,
        campaignId: campaign?.id,
      });

      if (result.success) {
        toast({ title: `Email sent to ${lead.name}` });
        onSent();
        onClose();
      }
    } catch (error) {
      toast({ title: 'Failed to send email', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send Email to {lead.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input value={user?.email || ''} readOnly className="mt-1 bg-muted/30 text-muted-foreground" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input value={lead.email || 'No email'} readOnly className="mt-1 bg-muted/30 text-muted-foreground" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            {isGenerating ? (
              <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/20">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating...</span>
              </div>
            ) : (
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Email subject" />
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Body</Label>
            {isGenerating ? (
              <div className="mt-1 flex items-center justify-center min-h-[200px] rounded-md border border-input bg-muted/20">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Generating personalized email...</span>
                </div>
              </div>
            ) : (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 min-h-[200px]"
                placeholder="Email body"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || isGenerating || !isConnected || !lead.email}
            className="gap-2 rounded-xl"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
