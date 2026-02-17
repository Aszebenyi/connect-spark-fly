import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RingLoader } from '@/components/ui/visual-elements';
import { Lead, generateOutreach, GeneratedOutreach } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Clock, Lock } from 'lucide-react';

interface LeadResultCardProps {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: () => void;
  campaignGoal?: string;
}

// --- Helper functions for healthcare data extraction ---

function getMatchScore(lead: Lead): number | null {
  return lead.profile_data?.match_score ?? lead.profile_data?.score ?? null;
}

function getMatchScoreColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  return 'bg-red-500/15 text-red-500 border-red-500/30';
}

function getMatchScoreDot(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

interface LicenseInfo {
  status: 'active' | 'expiring' | 'expired';
  label: string;
  number?: string;
}

function getLicense(lead: Lead): LicenseInfo | null {
  const pd = lead.profile_data;
  if (!pd) return null;
  // Handle structured license object
  if (pd.license) return pd.license as LicenseInfo;
  // Handle comma-separated string from regex extraction (e.g., "RN, BSN")
  if (typeof pd.licenses === 'string' && pd.licenses) {
    return {
      status: 'active',
      label: pd.licenses,
    };
  }
  if (pd.license_status) {
    return {
      status: pd.license_status,
      label: pd.license_type || 'License',
      number: pd.license_number,
    };
  }
  return null;
}

function getCertifications(lead: Lead): string[] {
  const pd = lead.profile_data;
  if (!pd) return [];
  // Handle comma-separated string (from regex extraction)
  if (typeof pd.certifications === 'string' && pd.certifications) {
    return pd.certifications.split(',').map((c: string) => c.trim()).filter(Boolean);
  }
  if (Array.isArray(pd.certifications)) {
    return pd.certifications.map((c: any) => (typeof c === 'string' ? c : c.name || c.title || ''));
  }
  return [];
}

function getYearsExperience(lead: Lead): number | null {
  const pd = lead.profile_data;
  if (!pd) return null;
  if (pd.years_experience != null) return pd.years_experience;
  if (pd.linkedin?.totalExperienceYears != null) return pd.linkedin.totalExperienceYears;
  return null;
}

function getSpecialtyLabel(lead: Lead): string | null {
  return lead.profile_data?.specialty || lead.industry || null;
}

// --- License status icon ---
function LicenseStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    case 'expiring':
      return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    case 'expired':
      return <ShieldX className="w-4 h-4 text-destructive" />;
    default:
      return <ShieldCheck className="w-4 h-4 text-muted-foreground" />;
  }
}

export function LeadResultCard({ lead, isSelected, onToggleSelect, campaignGoal }: LeadResultCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [outreach, setOutreach] = useState<GeneratedOutreach | null>(null);
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const { isConnected, sendEmail } = useEmailConnection();
  const { subscription } = useAuth();

  const isPaidUser = subscription?.plan_id && subscription.plan_id !== 'free';

  // Healthcare data
  const matchScore = getMatchScore(lead);
  const license = getLicense(lead);
  const certifications = getCertifications(lead);
  const yearsExperience = getYearsExperience(lead);
  const specialty = getSpecialtyLabel(lead);

  // Sync edited values when outreach is generated
  useEffect(() => {
    if (outreach) {
      setEditedSubject(outreach.subject);
      setEditedBody(outreach.body);
    }
  }, [outreach]);

  const handleGenerateOutreach = async () => {
    setIsGenerating(true);
    try {
      const result = await generateOutreach({ 
        lead, 
        campaignGoal: campaignGoal || undefined 
      });
      
      if (result.success && result.outreach) {
        setOutreach(result.outreach);
        setShowOutreachDialog(true);
        toast.success('Personalized message ready to edit and send');
      } else {
        toast.error(result.error || 'Could not generate outreach');
      }
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate outreach. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!isConnected) {
      toast.error('Please connect your Gmail account first in Settings');
      return;
    }

    setIsSending(true);
    try {
      const result = await sendEmail({
        leadId: lead.id,
        to: 'luukalleman@gmail.com',
        subject: editedSubject,
        body: editedBody,
        campaignId: lead.campaign_id,
      });

      if (result.success) {
        setShowOutreachDialog(false);
        toast.success(`Successfully sent to luukalleman@gmail.com (test mode)`);
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Build employer + location line
  const employerLocation = [lead.company, lead.location].filter(Boolean).join(' · ');

  return (
    <>
      <div
        className={`glass rounded-2xl p-6 card-shadow transition-all duration-300 hover:shadow-elevated ${
          isSelected ? 'border-primary/40 ring-2 ring-primary/15' : 'hover:border-border/80'
        }`}
      >
        <div className="flex items-start gap-5">
          {/* Selection Checkbox */}
          <button
            onClick={onToggleSelect}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 mt-1 ${
              isSelected
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30 hover:border-primary/50'
            }`}
          >
            {isSelected && (
              <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 -translate-y-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {/* TOP SECTION */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-lg leading-tight">{lead.name}</h4>
                {lead.title && (
                  <p className="text-sm text-muted-foreground">{lead.title}</p>
                )}
                {employerLocation && (
                  <p className="text-sm text-muted-foreground">{employerLocation}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Match Score Badge */}
                {matchScore != null && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${getMatchScoreColor(matchScore)}`}>
                    <span className={`w-2 h-2 rounded-full ${getMatchScoreDot(matchScore)}`} />
                    {matchScore}% Match
                  </div>
                )}

                {lead.linkedin_url && (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20 transition-colors"
                  >
                    <span className="text-xs font-bold">in</span>
                  </a>
                )}
              </div>
            </div>

            {/* CREDENTIALS SECTION */}
            {(license || certifications.length > 0 || yearsExperience != null || specialty) && (
              <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                {/* License Status */}
                {license && (
                  <div className="flex items-center gap-2 text-sm">
                    <LicenseStatusIcon status={license.status} />
                    <span className="text-foreground font-medium">
                      {license.status === 'active' && 'Active'}
                      {license.status === 'expiring' && 'Expiring'}
                      {license.status === 'expired' && 'Expired'}
                      {' '}{license.label}
                    </span>
                    {license.number && (
                      <span className="text-muted-foreground">({license.number})</span>
                    )}
                  </div>
                )}

                {/* Certifications */}
                {certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {certifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-full">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Years of Experience */}
                {yearsExperience != null && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{yearsExperience} year{yearsExperience !== 1 ? 's' : ''} {specialty ? `${specialty} ` : ''}experience</span>
                  </div>
                )}
              </div>
            )}

            {/* CONTACT SECTION */}
            <div className="mt-4">
              {isPaidUser ? (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {lead.email && (
                    <span className="text-muted-foreground">{lead.email}</span>
                  )}
                  {lead.phone && (
                    <span className="text-muted-foreground">{lead.phone}</span>
                  )}
                </div>
              ) : (
                <div className="relative rounded-xl bg-muted/20 border border-border/40 p-3">
                  <div className="flex items-center gap-x-6 gap-y-1 text-sm select-none" style={{ filter: 'blur(5px)' }}>
                    <span className="text-muted-foreground">candidate@email.com</span>
                    <span className="text-muted-foreground">(555) 123-4567</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Upgrade to unlock contact info</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-5">
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerateOutreach}
                disabled={isGenerating}
                className="rounded-xl"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <RingLoader className="w-3 h-3" />
                    Generating...
                  </span>
                ) : (
                  'Generate Outreach'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Outreach Dialog */}
      <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
        <DialogContent className="max-w-2xl bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="visual-badge-sm">
                <div className="w-5 h-5 relative">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-0.5 h-2 bg-gradient-to-t from-primary to-transparent origin-bottom left-1/2 -translate-x-1/2"
                      style={{ transform: `translateX(-50%) rotate(${i * 60}deg)`, transformOrigin: 'bottom center' }}
                    />
                  ))}
                  <div className="absolute inset-[35%] rounded-full bg-primary" />
                </div>
              </div>
              Outreach for {lead.name}
            </DialogTitle>
          </DialogHeader>

          {outreach && (
            <div className="space-y-6 mt-4">
              {!isConnected && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">Connect your Gmail in Settings to send emails directly.</p>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600">
                <Send className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">Test mode: Emails will be sent to <strong>luukalleman@gmail.com</strong></p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">Email Subject</label>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(editedSubject, 'Subject')} className="h-8 rounded-lg">Copy</Button>
                </div>
                <Input value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)} className="bg-muted/30 border-border/50 rounded-xl" placeholder="Email subject..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">Email Body</label>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(editedBody, 'Email body')} className="h-8 rounded-lg">Copy</Button>
                </div>
                <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} className="min-h-[150px] bg-muted/30 border-border/50 resize-none rounded-xl" placeholder="Email body..." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">LinkedIn Message</label>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(outreach.linkedin_message, 'LinkedIn message')} className="h-8 rounded-lg">Copy</Button>
                </div>
                <Textarea value={outreach.linkedin_message} readOnly className="min-h-[100px] bg-muted/30 border-border/50 resize-none rounded-xl" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSendEmail} disabled={isSending || !isConnected} className="flex-1 rounded-xl gap-2">
                  {isSending ? (<><Loader2 className="w-4 h-4 animate-spin" />Sending...</>) : (<><Send className="w-4 h-4" />Send Email</>)}
                </Button>
                {lead.linkedin_url && (
                  <Button variant="outline" className="rounded-xl" onClick={() => window.open(lead.linkedin_url, '_blank')}>Open LinkedIn →</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
