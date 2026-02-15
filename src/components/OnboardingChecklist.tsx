import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Mail, Building2, Briefcase, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useBrandConfig } from '@/hooks/useBrandConfig';

interface OnboardingChecklistProps {
  onCreateCampaign: () => void;
  onNavigateToFinder: () => void;
  onNavigateToSettings: () => void;
  onNavigateToCompanyProfile: () => void;
  onNavigateToLeads: () => void;
}

const DISMISSED_KEY = 'onboarding-checklist-dismissed';

export function OnboardingChecklist({
  onCreateCampaign,
  onNavigateToFinder,
  onNavigateToSettings,
  onNavigateToCompanyProfile,
  onNavigateToLeads,
}: OnboardingChecklistProps) {
  const progress = useOnboardingProgress();
  const { appName } = useBrandConfig();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  // Don't show if dismissed or fully complete
  if (isDismissed || progress.isComplete || progress.isLoading) {
    return null;
  }

  const steps = [
    {
      id: 'email',
      title: 'Connect your Gmail',
      description: 'Link Gmail to send personalized outreach emails',
      completed: progress.hasEmailConnection,
      icon: Mail,
      action: onNavigateToSettings,
      actionLabel: 'Connect Gmail',
    },
    {
      id: 'company',
      title: 'Set up company profile',
      description: 'Tell us about your agency for personalized emails',
      completed: progress.hasCompanyProfile,
      icon: Building2,
      action: onNavigateToCompanyProfile,
      actionLabel: 'Set Up Profile',
    },
    {
      id: 'campaign',
      title: 'Create your first job opening',
      description: 'Set up a role you\'re trying to fill',
      completed: progress.hasCampaign,
      icon: Briefcase,
      action: onCreateCampaign,
      actionLabel: 'Create Job',
    },
    {
      id: 'leads',
      title: 'Find your first candidates',
      description: 'Use AI search to discover qualified professionals',
      completed: progress.hasLeads,
      icon: Search,
      action: onNavigateToFinder,
      actionLabel: 'Search',
    },
    {
      id: 'outreach',
      title: 'Send your first outreach',
      description: 'Reach out to candidates and start conversations',
      completed: progress.hasSentOutreach,
      icon: Send,
      action: onNavigateToLeads,
      actionLabel: 'View Candidates',
    },
  ];

  const progressPercent = (progress.completedCount / progress.totalSteps) * 100;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Get Started with {appName}</h3>
            <p className="text-sm text-muted-foreground">
              {progress.completedCount} of {progress.totalSteps} steps completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32">
            <Progress value={progressPercent} className="h-2" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl transition-all',
                  step.completed
                    ? 'bg-success/5 border border-success/20'
                    : 'bg-muted/5 border border-border hover:border-primary/30 hover:bg-primary/5'
                )}
              >
                {/* Status Icon */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    step.completed
                      ? 'bg-success/20 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-medium',
                      step.completed ? 'text-success' : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                {!step.completed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl flex-shrink-0 gap-2"
                    onClick={step.action}
                  >
                    <Icon className="w-4 h-4" />
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
