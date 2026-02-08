import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SparkBurst, RingLoader, AbstractBlob } from '@/components/ui/visual-elements';
import { searchLeadsWithExa, saveLeads, Lead } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LeadResultCard } from './LeadResultCard';
import { useAuth } from '@/contexts/AuthContext';

interface LeadFinderProps {
  onLeadsFound?: (leads: Lead[]) => void;
  campaignId?: string;
  campaignName?: string;
}

const suggestions = [
  'Marketing directors at fintech startups in NYC',
  'CTOs at Series A healthcare companies',
  'Sales VPs at B2B SaaS with 50-200 employees',
];

export function LeadFinder({ onLeadsFound, campaignId, campaignName }: LeadFinderProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [foundLeads, setFoundLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const { toast } = useToast();
  const { subscription, subscriptionLoading } = useAuth();

  const creditsRemaining = (subscription?.credits_limit || 0) - (subscription?.credits_used || 0);
  const hasCredits = creditsRemaining > 0;

  const { user } = useAuth();

  const handleSearch = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to search for leads.',
        variant: 'destructive',
      });
      return;
    }

    if (!query.trim()) {
      toast({
        title: 'Enter a search query',
        description: 'Describe who you want to find in plain English',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setFoundLeads([]);
    setSelectedLeads(new Set());

    try {
      const result = await searchLeadsWithExa({ 
        query: query.trim(),
        campaignId: campaignId 
      });

      console.log('Search result:', result);

      if (result.success) {
        // Async mode - leads are being saved in background
        if (result.status === 'processing' || result.websetId) {
          toast({
            title: 'Search started!',
            description: campaignId 
              ? 'Leads will be added to your campaign automatically. This may take 1-2 minutes.'
              : 'Leads will be saved to your database automatically. This may take 1-2 minutes.',
          });
          onLeadsFound?.([]);
          setQuery('');
        } 
        // Legacy sync mode - leads returned directly
        else if (result.leads && result.leads.length > 0) {
          setFoundLeads(result.leads);
          setSelectedLeads(new Set(result.leads.map((_, i) => i)));
          toast({
            title: 'Search complete!',
            description: `Found ${result.leads.length} potential leads`,
          });
        } else {
          toast({
            title: 'Search initiated',
            description: 'Processing your request...',
          });
        }
      } else {
        // Handle NO_CREDITS error specifically
        if (result.error === 'NO_CREDITS') {
          toast({
            title: 'No credits remaining',
            description: 'You have used all your credits. Please upgrade your plan to continue.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Search failed',
            description: result.error || 'Unable to start search. Please try again.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search error',
        description: 'Failed to search for leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const toggleLeadSelection = (index: number) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleSaveLeads = async () => {
    const leadsToSave = foundLeads.filter((_, i) => selectedLeads.has(i));
    if (leadsToSave.length === 0) {
      toast({
        title: 'No leads selected',
        description: 'Please select at least one lead to save',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveLeads(leadsToSave, campaignId);
      if (result.success) {
        toast({
          title: 'Leads saved!',
          description: campaignId 
            ? `${leadsToSave.length} leads added to campaign "${campaignName}"`
            : `${leadsToSave.length} leads added to your database`,
        });
        onLeadsFound?.(leadsToSave);
        setFoundLeads([]);
        setSelectedLeads(new Set());
        setQuery('');
      } else {
        toast({
          title: 'Save failed',
          description: result.error || 'Failed to save leads',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save error',
        description: 'Failed to save leads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="relative inline-block mb-8">
          <div className="absolute -inset-8 opacity-30">
            <AbstractBlob className="w-full h-full animate-morph" />
          </div>
          <div className="relative visual-badge visual-badge-lg animate-pulse-glow">
            <SparkBurst className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
          {campaignId ? `Find Leads for "${campaignName}"` : 'Find Your Ideal Leads'}
        </h2>
        <p className="text-muted-foreground text-xl max-w-md mx-auto">
          {campaignId 
            ? 'Add more leads to your campaign'
            : 'Describe who you\'re looking for and let AI find them'}
        </p>
      </div>

      {/* Search Box */}
      <div className="glass-strong rounded-3xl p-10 card-shadow mb-10 animate-fade-in stagger-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20 -translate-y-1/2 translate-x-1/2">
          <AbstractBlob className="w-full h-full" />
        </div>
        
        <div className="relative">
          <div className="search-input flex items-center gap-4 px-6 py-5">
            <div className="w-5 h-5 relative flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground" />
              </div>
              <div className="absolute bottom-0 right-0 w-1.5 h-2 bg-muted-foreground rounded-full rotate-45 origin-top" />
            </div>
            <Input
              placeholder="VPs of Engineering at SaaS companies in San Francisco..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 bg-transparent text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 px-0"
            />
          </div>

          {/* Suggestions */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-4">Try these</p>
            <div className="flex flex-wrap gap-3">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="text-sm px-5 py-2.5 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300 border border-transparent hover:border-border"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Credits remaining indicator */}
          {!subscriptionLoading && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              {hasCredits ? (
                <>You have <span className="font-semibold text-foreground">{creditsRemaining}</span> credits remaining. Each search uses up to 10 credits.</>
              ) : (
                <span className="text-destructive font-medium">You have no credits remaining. Upgrade to continue searching.</span>
              )}
            </p>
          )}

          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !hasCredits}
            className="w-full mt-6 h-16 text-base font-semibold rounded-2xl"
            size="lg"
          >
            {isSearching ? (
              <span className="flex items-center gap-3">
                <RingLoader className="w-5 h-5" />
                Searching with AI...
              </span>
            ) : !hasCredits ? (
              'No Credits - Upgrade Plan'
            ) : (
              'Find Leads →'
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {foundLeads.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                Found {foundLeads.length} leads
              </h3>
              <p className="text-muted-foreground mt-1">
                {selectedLeads.size} selected for import
              </p>
            </div>
            <Button
              onClick={handleSaveLeads}
              disabled={isSaving || selectedLeads.size === 0}
              className="rounded-xl"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <RingLoader className="w-4 h-4" />
                  Saving...
                </span>
              ) : (
                `Save ${selectedLeads.size} Leads`
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {foundLeads.map((lead, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <LeadResultCard
                  lead={lead}
                  isSelected={selectedLeads.has(index)}
                  onToggleSelect={() => toggleLeadSelection(index)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
