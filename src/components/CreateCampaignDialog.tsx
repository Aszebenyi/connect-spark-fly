import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { createCampaign, searchLeadsWithExa } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLeadSubscription } from '@/hooks/useLeadSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, Sparkles, Target, Search, Check, Users, Zap, Eye, Loader2, Link, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface CampaignData {
  id?: string;
  name: string;
  goal?: string;
  status?: string;
  search_query?: string;
  lead_count?: number;
  sent_count?: number;
  reply_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (campaignId?: string, campaignData?: CampaignData) => void;
}

type Step = 'name' | 'goal' | 'search' | 'saving' | 'processing';

const searchSuggestions = [
  'ICU Nurse — Los Angeles, CA — 3+ years, BLS/ACLS',
  'Travel ER Nurse — Phoenix, AZ — compact license',
  'Physical Therapist — Austin, TX — DPT required',
];

const goalSuggestions = [
  'Fill 3-month ICU travel contract starting next month',
  'Source candidates for permanent OR nurse position',
  'Build pipeline for per diem ER nurses',
];

const stepConfig = {
  name: {
    number: 1,
    title: 'Job Opening Name',
    subtitle: 'Give this job opening a name that describes the role',
    icon: Sparkles,
  },
  goal: {
    number: 2,
    title: 'Define Your Goal',
    subtitle: 'What kind of placement are you working on?',
    icon: Target,
  },
  search: {
    number: 3,
    title: 'Describe the Role',
    subtitle: 'Paste a job description or describe the candidate you need',
    icon: Search,
  },
  saving: {
    number: 4,
    title: 'Creating Job Opening',
    subtitle: 'Setting everything up for you',
    icon: Check,
  },
  processing: {
    number: 4,
    title: 'Finding Candidates',
    subtitle: 'AI is searching for matching healthcare professionals',
    icon: Users,
  },
};

export function CreateCampaignDialog({ open, onOpenChange, onCreated }: CreateCampaignDialogProps) {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [createdCampaignData, setCreatedCampaignData] = useState<CampaignData | null>(null);
  const [jobPostingUrl, setJobPostingUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  
  const { toast } = useToast();

  // Real-time lead subscription
  const { newLeadsCount, latestLead, isListening } = useLeadSubscription({
    campaignId: createdCampaignId || undefined,
    enabled: step === 'processing' && !!createdCampaignId,
  });

  const resetState = useCallback(() => {
    setStep('name');
    setName('');
    setGoal('');
    setSearchQuery('');
    setIsSaving(false);
    setIsSearching(false);
    setIsTransitioning(false);
    setCreatedCampaignId(null);
    setCreatedCampaignData(null);
    setJobPostingUrl('');
    setIsExtracting(false);
    setAutoFilledFields(new Set());
  }, []);

  const handleExtractJobPosting = async () => {
    if (!jobPostingUrl) return;
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-job-posting', {
        body: { url: jobPostingUrl },
      });
      if (error) throw error;
      if (data?.success && data?.data) {
        const filled = new Set<string>();
        if (data.data.job_title) { setName(data.data.job_title); filled.add('name'); }
        if (data.data.job_goal) { setGoal(data.data.job_goal); filled.add('goal'); }
        if (data.data.search_query) { setSearchQuery(data.data.search_query); filled.add('search'); }
        setAutoFilledFields(filled);
        toast({
          title: 'Details extracted!',
          description: `Auto-filled ${filled.size} field${filled.size !== 1 ? 's' : ''} from the job posting`,
        });
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast({
        title: 'Extraction failed',
        description: 'Could not extract details from URL. Try entering manually.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClose = () => {
    if (isSaving || isSearching) return;
    // If we created a campaign, notify parent before closing
    if (createdCampaignData) {
      onCreated(createdCampaignId || undefined, createdCampaignData);
    }
    resetState();
    onOpenChange(false);
  };

  const handleViewLeads = () => {
    onCreated(createdCampaignId || undefined, createdCampaignData || undefined);
    resetState();
    onOpenChange(false);
  };

  const transitionTo = (nextStep: Step) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 200);
  };

  const handleNextToGoal = () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a campaign name',
        variant: 'destructive',
      });
      return;
    }
    transitionTo('goal');
  };

  const handleNextToSearch = () => {
    if (!goal.trim()) {
      toast({
        title: 'Goal required',
        description: 'Please describe your outreach goal',
        variant: 'destructive',
      });
      return;
    }
    transitionTo('search');
  };

  const handleCreateAndSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Enter a search query',
        description: 'Describe who you want to find',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setIsSearching(true);
    transitionTo('saving');

    try {
      const campaignResult = await createCampaign({
        name: name.trim(),
        goal: goal.trim(),
        status: 'draft',
        search_query: searchQuery.trim(),
        sent_count: 0,
        reply_count: 0,
      });

      if (!campaignResult.success || !campaignResult.campaign?.id) {
        throw new Error(campaignResult.error || 'Failed to create campaign');
      }

      const campaignId = campaignResult.campaign.id;
      trackEvent('opening_created', { name: name.trim() });
      const campaignData: CampaignData = {
        id: campaignId,
        name: name.trim(),
        goal: goal.trim(),
        status: 'searching', // Will be set to searching after search starts
        search_query: searchQuery.trim(),
        lead_count: 0,
        sent_count: 0,
        reply_count: 0,
        created_at: new Date().toISOString(),
      };
      setCreatedCampaignId(campaignId);
      setCreatedCampaignData(campaignData);

      const searchResult = await searchLeadsWithExa({
        query: searchQuery.trim(),
        campaignId: campaignId,
      });

      if (!searchResult.success) {
        throw new Error(searchResult.error || 'Failed to start lead search');
      }

      // Transition to processing view instead of closing
      setIsSaving(false);
      setIsSearching(false);
      transitionTo('processing');

    } catch (error: any) {
      console.error('Create/search error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create campaign',
        variant: 'destructive',
      });
      setIsSaving(false);
      setIsSearching(false);
      transitionTo('search');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (step === 'name') handleNextToGoal();
    if (step === 'goal') handleNextToSearch();
    if (step === 'search' && !isSaving && !isSearching) handleCreateAndSearch();
  };

  const steps: Step[] = ['name', 'goal', 'search'];
  const currentStepIndex = steps.indexOf(step);
  const config = stepConfig[step];
  const StepIcon = config.icon;

  const progressWidth = step === 'processing' 
    ? 100 
    : ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className={cn(
          "apple-dialog max-w-2xl p-0 gap-0 border-0 overflow-hidden",
          "bg-gradient-to-b from-card to-background"
        )} 
        aria-describedby={undefined}
      >
        {/* Progress bar */}
        <div className="h-1 bg-muted/30">
          <div 
            className={cn(
              "h-full transition-all duration-700 ease-out",
              step === 'processing' 
                ? "bg-gradient-to-r from-primary via-primary/70 to-primary animate-pulse" 
                : "bg-gradient-to-r from-primary to-primary/70"
            )}
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="p-10 pb-8">
          {/* Step indicator */}
          <div className={cn(
            "flex items-center gap-3 mb-8 transition-all duration-300",
            isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}>
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              step === 'processing' 
                ? "bg-gradient-to-br from-success/20 to-success/5 border-success/20" 
                : "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20"
            )}>
              <StepIcon className={cn(
                "w-5 h-5",
                step === 'processing' ? "text-success" : "text-primary"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-medium uppercase tracking-widest",
                  step === 'processing' ? "text-success/70" : "text-primary/70"
                )}>
                  {step === 'processing' ? 'Live' : `Step ${config.number} of 3`}
                </span>
                {step === 'processing' && isListening && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-success/70">Connected</span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-semibold text-foreground tracking-tight mt-0.5">
                {config.title}
              </h2>
              {step === 'name' && autoFilledFields.size > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  {autoFilledFields.has('goal') && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="w-3 h-3" /> Goal
                    </span>
                  )}
                  {autoFilledFields.has('search') && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                      <CheckCircle2 className="w-3 h-3" /> Search
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step content */}
          <div className={cn(
            "transition-all duration-300 min-h-[280px]",
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}>
            {/* Step 1: Campaign Name */}
            {step === 'name' && (
              <div className="space-y-6">
                {/* Quick Start: URL Extraction */}
                <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Quick Start</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paste a job posting URL to auto-fill all steps
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://indeed.com/viewjob?jk=..."
                      value={jobPostingUrl}
                      onChange={(e) => setJobPostingUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleExtractJobPosting}
                      disabled={isExtracting || !jobPostingUrl}
                      className="rounded-xl gap-2"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Extract
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-4">
                  <p className="text-sm text-muted-foreground mb-3">Or enter the job title manually:</p>
                </div>

                {autoFilledFields.has('name') && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-filled from job posting</span>
                  </div>
                )}
                <Input
                  placeholder="ICU Travel Nurse — Los Angeles, Q2 2026"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setAutoFilledFields(prev => { const n = new Set(prev); n.delete('name'); return n; }); }}
                  onKeyDown={handleKeyDown}
                  className={cn("apple-input h-14 text-lg", autoFilledFields.has('name') && "border-success/40 bg-success/5")}
                  autoFocus
                />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider mb-3">
                    Quick tips
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Be specific', 'Include location', 'Specialty type'].map((tip) => (
                      <span 
                        key={tip}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted/40 text-muted-foreground"
                      >
                        {tip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Goal */}
            {step === 'goal' && (
              <div className="space-y-6">
                {autoFilledFields.has('goal') && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-filled from job posting</span>
                  </div>
                )}
                <p className="text-muted-foreground text-base leading-relaxed">
                  {config.subtitle}
                </p>
                <Textarea
                  placeholder="Fill ICU travel nurse contract, 3-month assignment starting next month..."
                  value={goal}
                  onChange={(e) => { setGoal(e.target.value); setAutoFilledFields(prev => { const n = new Set(prev); n.delete('goal'); return n; }); }}
                  onKeyDown={handleKeyDown}
                  className={cn("apple-input min-h-[120px] text-base resize-none", autoFilledFields.has('goal') && "border-success/40 bg-success/5")}
                  autoFocus
                />

                <div className="pt-2">
                  <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider mb-3">
                    Suggestions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {goalSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setGoal(suggestion)}
                        className={cn(
                          "text-sm px-4 py-2 rounded-full transition-all duration-200",
                          "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground",
                          "border border-transparent hover:border-border/50"
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Search */}
            {step === 'search' && (
              <div className="space-y-6">
                {autoFilledFields.has('search') && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-filled from job posting</span>
                  </div>
                )}
                <Input
                  placeholder="ICU Nurse — Los Angeles, CA — 3+ years experience, BLS/ACLS, CA RN license..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setAutoFilledFields(prev => { const n = new Set(prev); n.delete('search'); return n; }); }}
                  onKeyDown={handleKeyDown}
                  className={cn("apple-input h-14 text-lg", autoFilledFields.has('search') && "border-success/40 bg-success/5")}
                />
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider mb-3">
                    Popular searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setSearchQuery(suggestion)}
                        className={cn(
                          "text-sm px-4 py-2 rounded-full transition-all duration-200",
                          "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground",
                          "border border-transparent hover:border-border/50"
                        )}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-3 text-sm text-muted-foreground/70">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span>AI will find matching healthcare professionals in real-time</span>
                </div>
              </div>
            )}

            {/* Saving state */}
            {step === 'saving' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <div className="apple-spinner" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Creating your job opening</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Setting up "{name}" and starting your candidate search...
                </p>
                <div className="flex items-center gap-6 mt-8">
                  {['Job Opening', 'Search', 'AI'].map((item, i) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                      )}>
                        {i === 0 ? <Check className="w-3 h-3" /> : <span className="text-xs">{i + 1}</span>}
                      </div>
                      <span className={cn(
                        "text-sm",
                        i === 0 ? "text-foreground" : "text-muted-foreground"
                      )}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing state - Live lead counter */}
            {step === 'processing' && (
              <div className="flex flex-col items-center justify-center py-4">
                {/* Live counter */}
                <div className="relative mb-6">
                  <div className={cn(
                    "w-28 h-28 rounded-3xl flex flex-col items-center justify-center border transition-all duration-500",
                    newLeadsCount > 0 
                      ? "bg-gradient-to-br from-success/20 to-success/5 border-success/30" 
                      : "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20"
                  )}>
                    {newLeadsCount > 0 ? (
                      <>
                        <span className="text-4xl font-bold text-success">{newLeadsCount}</span>
                        <span className="text-xs text-success/70 font-medium mt-1">leads found</span>
                      </>
                    ) : (
                      <>
                        <div className="apple-spinner mb-2" />
                        <span className="text-xs text-muted-foreground">Searching...</span>
                      </>
                    )}
                  </div>
                  {newLeadsCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success animate-ping" />
                  )}
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {newLeadsCount > 0 ? 'Leads are arriving!' : 'AI is searching...'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {newLeadsCount > 0 
                    ? `Found ${newLeadsCount} matching profiles so far. More leads may arrive in the next minute.`
                    : `Searching for "${searchQuery}". This usually takes 1-2 minutes.`
                  }
                </p>

                {/* Latest lead preview */}
                {latestLead && (
                  <div className="w-full max-w-md p-4 rounded-2xl bg-muted/30 border border-border/50 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-medium text-primary">
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

                {/* Status indicators */}
                <div className="flex items-center gap-6">
                  {[
                    { label: 'Campaign', done: true },
                    { label: 'Search', done: true },
                    { label: 'AI Processing', done: false, active: true },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500",
                        item.done ? "bg-success text-success-foreground" : 
                        item.active ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                      )}>
                        {item.done ? (
                          <Check className="w-3 h-3" />
                        ) : item.active ? (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <span className="text-xs">{i + 1}</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-sm",
                        item.done || item.active ? "text-foreground" : "text-muted-foreground"
                      )}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {step !== 'saving' && (
          <div className="px-10 py-6 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            <div>
              {step !== 'name' && step !== 'processing' && (
                <Button 
                  variant="ghost" 
                  onClick={() => transitionTo(step === 'goal' ? 'name' : 'goal')}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              {step === 'processing' && (
                <p className="text-xs text-muted-foreground">
                  You can close this and leads will keep arriving
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step !== 'processing' && (
                <Button 
                  variant="ghost" 
                  onClick={handleClose}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              )}
              {step === 'name' && (
                <Button onClick={handleNextToGoal} className="apple-button gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {step === 'goal' && (
                <Button onClick={handleNextToSearch} className="apple-button gap-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {step === 'search' && (
                <Button 
                  onClick={handleCreateAndSearch} 
                  disabled={isSaving || isSearching}
                  className="apple-button gap-2"
                >
                  Create Campaign
                  <Sparkles className="w-4 h-4" />
                </Button>
              )}
              {step === 'processing' && (
                <Button 
                  onClick={handleViewLeads}
                  className="apple-button gap-2"
                  disabled={newLeadsCount === 0}
                >
                  <Eye className="w-4 h-4" />
                  View {newLeadsCount > 0 ? `${newLeadsCount} Leads` : 'Leads'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
