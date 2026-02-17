import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { useLeadSubscription } from '@/hooks/useLeadSubscription';
import { supabase } from '@/integrations/supabase/client';
import { createCampaign, searchLeadsWithExa, generateOutreach, Lead } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import {
  Sparkles, ArrowRight, Briefcase, Search, Mail, CheckCircle2,
  Loader2, Zap, Send, Users, X
} from 'lucide-react';

type WizardStep = 'welcome' | 'create-opening' | 'search' | 'first-email' | 'done';

const STEPS: WizardStep[] = ['welcome', 'create-opening', 'search', 'first-email', 'done'];

interface OnboardingWizardProps {
  onComplete: () => void;
  onClose: () => void;
}

export function OnboardingWizard({ onComplete, onClose }: OnboardingWizardProps) {
  const { user, refreshSubscription } = useAuth();
  const { isConnected, connect, isConnecting, sendEmail } = useEmailConnection();

  const [step, setStep] = useState<WizardStep>('welcome');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Step 2 state
  const [roleTitle, setRoleTitle] = useState('');
  const [idealCandidate, setIdealCandidate] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Step 3 state
  const [foundLeads, setFoundLeads] = useState<Lead[]>([]);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [latestLead, setLatestLead] = useState<Lead | null>(null);
  const [searchStarted, setSearchStarted] = useState(false);

  // Step 4 state
  const [topLead, setTopLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Lead subscription for real-time counting
  const { newLeadsCount: realtimeCount, latestLead: realtimeLatest } = useLeadSubscription({
    campaignId: campaignId || undefined,
    enabled: step === 'search' && !!campaignId,
  });

  useEffect(() => {
    if (realtimeCount > 0) {
      setNewLeadsCount(prev => Math.max(prev, realtimeCount));
    }
    if (realtimeLatest) {
      setLatestLead(realtimeLatest);
    }
  }, [realtimeCount, realtimeLatest]);

  // Fetch new leads when count changes
  useEffect(() => {
    if (!campaignId || newLeadsCount === 0) return;
    const fetchLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setFoundLeads(data as unknown as Lead[]);
        setLatestLead(data[0] as unknown as Lead);
      }
    };
    fetchLeads();
  }, [campaignId, newLeadsCount]);

  const goToStep = useCallback((nextStep: WizardStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 200);
  }, []);

  const currentStepIndex = STEPS.indexOf(step);
  const progressPercent = ((currentStepIndex) / (STEPS.length - 1)) * 100;

  // Step 2: Create opening
  const handleCreateOpening = async () => {
    if (!roleTitle.trim()) return;
    setIsCreating(true);

    try {
      await refreshSubscription();
      const result = await createCampaign({
        name: roleTitle.trim(),
        goal: idealCandidate.trim() || undefined,
        search_query: roleTitle.trim(),
      });

      if (result.success && result.campaign?.id) {
        setCampaignId(result.campaign.id);
        trackEvent('opening_created', { name: roleTitle.trim(), source: 'onboarding_wizard' });
        goToStep('search');
        // Auto-start search
        setSearchStarted(true);
        const searchResult = await searchLeadsWithExa({
          query: roleTitle.trim(),
          campaignId: result.campaign.id,
        });
        if (searchResult.success && searchResult.leads) {
          setFoundLeads(searchResult.leads);
          setNewLeadsCount(searchResult.leads.length);
          if (searchResult.leads.length > 0) {
            setLatestLead(searchResult.leads[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to create opening:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Step 3: View candidates → go to email step
  const handleViewCandidates = async () => {
    // Pick top lead (highest match score)
    const sorted = [...foundLeads].sort((a, b) => {
      const scoreA = a.profile_data?.match_score || 0;
      const scoreB = b.profile_data?.match_score || 0;
      return scoreB - scoreA;
    });
    const lead = sorted[0] || foundLeads[0];
    if (lead) {
      setTopLead(lead);
      goToStep('first-email');
      // Auto-generate outreach
      setIsGeneratingEmail(true);
      try {
        const result = await generateOutreach({
          lead,
          campaignGoal: idealCandidate || roleTitle,
          tone: 'professional',
        });
        if (result.success && result.outreach) {
          setEmailSubject(result.outreach.subject);
          setEmailBody(result.outreach.body);
        }
      } catch (err) {
        console.error('Failed to generate outreach:', err);
      } finally {
        setIsGeneratingEmail(false);
      }
    } else {
      goToStep('done');
    }
  };

  // Step 4: Send email
  const handleSendEmail = async () => {
    if (!topLead?.email || !emailSubject || !emailBody) return;
    setIsSending(true);
    try {
      const result = await sendEmail({
        leadId: topLead.id,
        to: topLead.email,
        subject: emailSubject,
        body: emailBody,
        campaignId: campaignId || undefined,
      });
      if (result.success) {
        setEmailSent(true);
        trackEvent('email_sent', { leadId: topLead.id, source: 'onboarding_wizard' });
        setTimeout(() => goToStep('done'), 1500);
      }
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Step 5: Complete
  const handleFinish = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
    }
    onComplete();
  };

  const handleDismiss = async () => {
    // Don't mark as completed, just close
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full max-w-lg mx-auto px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Step 1: Welcome */}
            {step === 'welcome' && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mx-auto">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-3">
                    Welcome to MediLead!
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Let's fill your first role. We'll find qualified candidates in under 2 minutes.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="rounded-xl gap-2 px-8 h-12 text-base"
                  onClick={() => goToStep('create-opening')}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Create Opening */}
            {step === 'create-opening' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    What role are you hiring for?
                  </h2>
                  <p className="text-muted-foreground">
                    Be specific — include specialty, location, and requirements
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    placeholder="ICU Nurse — Los Angeles, CA"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="h-14 text-lg rounded-xl"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && roleTitle.trim() && handleCreateOpening()}
                  />
                  <Textarea
                    placeholder="Describe the ideal candidate (optional)... e.g., 3+ years ICU experience, BLS/ACLS certified, willing to travel"
                    value={idealCandidate}
                    onChange={(e) => setIdealCandidate(e.target.value)}
                    className="min-h-[100px] text-base rounded-xl resize-none"
                  />
                </div>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-2">
                  {['ICU Nurse — Los Angeles', 'ER Nurse — Phoenix, AZ', 'Physical Therapist — Austin, TX'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRoleTitle(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="w-full rounded-xl gap-2 h-12 text-base"
                  onClick={handleCreateOpening}
                  disabled={!roleTitle.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating & Searching...
                    </>
                  ) : (
                    <>
                      Find Candidates
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: AI Search */}
            {step === 'search' && (
              <div className="text-center space-y-6">
                {/* Live counter */}
                <div className="relative mx-auto w-fit">
                  <div className={cn(
                    "w-28 h-28 rounded-3xl flex flex-col items-center justify-center border transition-all duration-500",
                    newLeadsCount > 0
                      ? "bg-gradient-to-br from-success/20 to-success/5 border-success/30"
                      : "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20"
                  )}>
                    {newLeadsCount > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-success">{newLeadsCount}</span>
                        <span className="text-xs text-success/70 font-medium mt-1">found</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-1" />
                        <span className="text-xs text-muted-foreground">Searching...</span>
                      </>
                    )}
                  </div>
                  {newLeadsCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success animate-ping" />
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {newLeadsCount > 0 ? 'Candidates are arriving!' : 'Searching for candidates...'}
                  </h2>
                  <p className="text-muted-foreground">
                    {newLeadsCount > 0
                      ? `Found ${newLeadsCount} matching profiles for "${roleTitle}"`
                      : `AI is searching for "${roleTitle}". This takes 1-2 minutes.`
                    }
                  </p>
                </div>

                {/* Latest lead preview */}
                {latestLead && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                        {latestLead.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{latestLead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {latestLead.title} {latestLead.company && `at ${latestLead.company}`}
                        </p>
                      </div>
                      <Zap className="w-4 h-4 text-success flex-shrink-0" />
                    </div>
                  </div>
                )}

                {/* Status pills */}
                <div className="flex items-center gap-4 justify-center">
                  {[
                    { label: 'Opening', done: true },
                    { label: 'AI Search', done: newLeadsCount > 0, active: newLeadsCount === 0 },
                    { label: 'Results', done: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center",
                        item.done ? "bg-success text-white" :
                        item.active ? "bg-primary/20" : "bg-muted"
                      )}>
                        {item.done ? <CheckCircle2 className="w-3 h-3" /> :
                         item.active ? <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>

                {newLeadsCount > 0 && (
                  <Button
                    size="lg"
                    className="rounded-xl gap-2 h-12 text-base"
                    onClick={handleViewCandidates}
                  >
                    <Users className="w-4 h-4" />
                    View {newLeadsCount} Candidates
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Step 4: First Email */}
            {step === 'first-email' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Send your first outreach
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    We've drafted a personalized email for your top candidate
                  </p>
                </div>

                {/* Candidate card */}
                {topLead && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-medium text-primary">
                        {topLead.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{topLead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {topLead.title} {topLead.email && `· ${topLead.email}`}
                        </p>
                      </div>
                      {topLead.profile_data?.match_score && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                          {topLead.profile_data.match_score}% match
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {!isConnected ? (
                  <div className="text-center space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Gmail to send emails directly from MediLead
                    </p>
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={connect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      Connect Gmail
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted-foreground text-sm"
                      onClick={() => goToStep('done')}
                    >
                      Skip for now
                    </Button>
                  </div>
                ) : isGeneratingEmail ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating personalized email...</p>
                  </div>
                ) : emailSent ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-sm font-medium text-success">Email sent!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subject"
                      className="rounded-xl"
                    />
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Email body..."
                      className="min-h-[120px] rounded-xl resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-xl gap-2"
                        onClick={handleSendEmail}
                        disabled={isSending || !topLead?.email}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Email
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => goToStep('done')}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Done */}
            {step === 'done' && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-3">
                    You're all set!
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Your dashboard is ready. Here's what we accomplished:
                  </p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="text-2xl font-bold text-foreground">{newLeadsCount || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">Candidates found</div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="text-2xl font-bold text-foreground">1</div>
                    <div className="text-xs text-muted-foreground mt-1">Opening created</div>
                  </div>
                  {emailSent && (
                    <>
                      <div className="col-span-2 p-4 rounded-xl bg-success/5 border border-success/20">
                        <div className="flex items-center justify-center gap-2 text-success">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm font-medium">First outreach sent!</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  size="lg"
                  className="rounded-xl gap-2 px-8 h-12 text-base"
                  onClick={handleFinish}
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
