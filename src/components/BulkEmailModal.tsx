import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Send, Mail, AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { generateOutreach } from '@/lib/api';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { useEmailStats } from '@/hooks/useEmailStats';
import { useToast } from '@/hooks/use-toast';

interface BulkEmailModalProps {
  leads: Lead[];
  campaign?: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

type SendPhase = 'edit' | 'generating' | 'preview' | 'sending' | 'done';

interface PersonalizedEmail {
  lead: Lead;
  subject: string;
  body: string;
  error?: string;
}

function getProfileField(lead: Lead, field: string): string | null {
  const pd = lead.profile_data || lead.profileData || {};
  return pd[field] || null;
}

export function BulkEmailModal({ leads, campaign, isOpen, onClose, onSent }: BulkEmailModalProps) {
  const [phase, setPhase] = useState<SendPhase>('edit');
  const [generatingIndex, setGeneratingIndex] = useState(0);
  const [sendingIndex, setSendingIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [personalizedEmails, setPersonalizedEmails] = useState<PersonalizedEmail[]>([]);
  const { isConnected, sendEmail } = useEmailConnection();
  const { stats, refresh: refreshStats } = useEmailStats();
  const { toast } = useToast();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validLeads = useMemo(() => leads.filter(l => l.email && emailRegex.test(l.email)), [leads]);
  const skippedCount = leads.length - validLeads.length;
  const cappedLeads = validLeads.slice(0, 50);

  const handleGenerate = async () => {
    setPhase('generating');
    const results: PersonalizedEmail[] = [];

    for (let i = 0; i < cappedLeads.length; i++) {
      setGeneratingIndex(i + 1);
      const lead = cappedLeads[i];
      try {
        const result = await generateOutreach({
          lead: {
            name: lead.name,
            title: lead.title,
            company: lead.company,
            email: lead.email,
            profile_data: lead.profile_data || lead.profileData,
          },
          campaignGoal: campaign?.goal || campaign?.name,
          tone: 'professional',
        });

        if (result.success && result.outreach) {
          results.push({ lead, subject: result.outreach.subject, body: result.outreach.body });
        } else {
          results.push({ lead, subject: '', body: '', error: result.error || 'Generation failed' });
        }
      } catch {
        results.push({ lead, subject: '', body: '', error: 'Generation failed' });
      }
    }

    setPersonalizedEmails(results);
    setPhase('preview');
  };

  const handleSendAll = async () => {
    setPhase('sending');
    setSendingIndex(0);
    setSuccessCount(0);
    setFailCount(0);

    const sendable = personalizedEmails.filter(e => !e.error && e.subject && e.body);
    
    for (let i = 0; i < sendable.length; i++) {
      setSendingIndex(i + 1);
      const email = sendable[i];
      try {
        const result = await sendEmail({
          leadId: email.lead.id,
          to: email.lead.email,
          subject: email.subject,
          body: email.body,
          campaignId: campaign?.id,
        });
        if (result.success) {
          setSuccessCount(prev => prev + 1);
        } else {
          setFailCount(prev => prev + 1);
        }
      } catch {
        setFailCount(prev => prev + 1);
      }
      // Rate limit delay
      if (i < sendable.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setPhase('done');
  };

  const handleClose = () => {
    if (phase === 'done') {
      onSent();
    }
    setPhase('edit');
    setPersonalizedEmails([]);
    setGeneratingIndex(0);
    setSendingIndex(0);
    setSuccessCount(0);
    setFailCount(0);
    onClose();
  };

  const sendableCount = personalizedEmails.filter(e => !e.error && e.subject && e.body).length;
  const genProgress = cappedLeads.length > 0 ? (generatingIndex / cappedLeads.length) * 100 : 0;
  const sendProgress = sendableCount > 0 ? (sendingIndex / sendableCount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send Emails to {cappedLeads.length} Candidates
          </DialogTitle>
        </DialogHeader>

        {/* Warnings */}
        {skippedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-500 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{skippedCount} candidate{skippedCount > 1 ? 's' : ''} without valid email will be skipped</span>
          </div>
        )}
        {validLeads.length > 50 && (
          <div className="flex items-center gap-2 text-xs text-amber-500 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Maximum 50 emails per batch. Only the first 50 will be sent.</span>
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center gap-2 text-xs text-destructive p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Connect your Gmail in Settings to send emails</span>
          </div>
        )}

        {/* Phase: Edit */}
        {phase === 'edit' && (
          <div className="space-y-4 py-2">
            {/* Over limit warning for bulk */}
            {stats?.over_limit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-900 font-medium">
                    You've already sent {stats.emails_sent_today} emails today.
                    Sending {cappedLeads.length} more will put you at {stats.emails_sent_today + cappedLeads.length}{' '}
                    (recommended: {stats.recommended_limit}/day).
                  </span>
                </div>
              </div>
            )}
            {stats?.approaching_limit && !stats?.over_limit && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-amber-900 font-medium">
                    You've sent {stats.emails_sent_today}/{stats.recommended_limit} emails today.
                    Sending {cappedLeads.length} more may exceed your recommended limit.
                  </span>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Each email will be AI-personalized for every candidate's qualifications, experience, and specialty.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cappedLeads.slice(0, 8).map(l => (
                <Badge key={l.id} variant="secondary" className="text-xs">{l.name}</Badge>
              ))}
              {cappedLeads.length > 8 && (
                <Badge variant="outline" className="text-xs">+{cappedLeads.length - 8} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Phase: Generating */}
        {phase === 'generating' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generating personalized emails...</p>
              <p className="text-xs text-muted-foreground">{generatingIndex} of {cappedLeads.length}</p>
            </div>
            <Progress value={genProgress} className="h-2" />
          </div>
        )}

        {/* Phase: Preview */}
        {phase === 'preview' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {sendableCount} emails ready to send. Preview below:
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {personalizedEmails.slice(0, 5).map((email, idx) => (
                <div key={idx} className="rounded-xl bg-muted/30 border border-border/50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{email.lead.name}</span>
                    {email.error ? (
                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">Ready</Badge>
                    )}
                  </div>
                  {!email.error && (
                    <>
                      <p className="text-xs text-muted-foreground truncate">Subject: {email.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.body}</p>
                    </>
                  )}
                  {email.error && (
                    <p className="text-xs text-destructive">{email.error}</p>
                  )}
                </div>
              ))}
              {personalizedEmails.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{personalizedEmails.length - 5} more emails
                </p>
              )}
            </div>
          </div>
        )}

        {/* Phase: Sending */}
        {phase === 'sending' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Send className="w-8 h-8 text-primary animate-pulse" />
              <p className="text-sm font-medium">Sending emails...</p>
              <p className="text-xs text-muted-foreground">{sendingIndex} of {sendableCount}</p>
            </div>
            <Progress value={sendProgress} className="h-2" />
            <div className="flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" /> {successCount} sent
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="w-3 h-3" /> {failCount} failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase: Done */}
        {phase === 'done' && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="text-lg font-semibold">Bulk Email Complete</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-500 font-medium">{successCount} sent</span>
                {failCount > 0 && <span className="text-destructive font-medium">{failCount} failed</span>}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {phase === 'edit' && (
            <>
              <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleGenerate}
                disabled={!isConnected || cappedLeads.length === 0}
                className="gap-2 rounded-xl"
              >
                <Loader2 className="w-4 h-4" />
                {stats?.over_limit ? 'Continue Anyway ⚠️' : 'Generate & Preview'}
              </Button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleSendAll}
                disabled={sendableCount === 0}
                className="gap-2 rounded-xl"
              >
                <Send className="w-4 h-4" />
                Send {sendableCount} Emails
              </Button>
            </>
          )}
          {phase === 'done' && (
            <Button onClick={handleClose} className="rounded-xl">Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
