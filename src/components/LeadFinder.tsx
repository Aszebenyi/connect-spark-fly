import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RingLoader, AbstractBlob } from '@/components/ui/visual-elements';
import medileadLogo from '@/assets/medilead-logo.png';
import { searchLeadsWithExa, saveLeads, Lead, Campaign } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LeadResultCard } from './LeadResultCard';
import { useAuth } from '@/contexts/AuthContext';

interface LeadFinderProps {
  onLeadsFound?: (leads: Lead[]) => void;
  campaigns?: Campaign[];
  initialCampaignId?: string;
  initialCampaignName?: string;
  onCreateCampaign?: () => void;
  /** @deprecated Use initialCampaignId instead */
  campaignId?: string;
  /** @deprecated Use initialCampaignName instead */
  campaignName?: string;
}

const suggestions = [
  'ICU Nurse - Los Angeles, CA - 3+ years, BLS/ACLS required',
  'Travel ER Nurse - Phoenix, AZ',
  'Physical Therapist - Austin, TX',
  'Nurse - Miami, FL - 2+ years, BLS/ACLS/PALS certified',
];

export function LeadFinder({ onLeadsFound, campaigns = [], initialCampaignId, initialCampaignName, onCreateCampaign, campaignId: legacyCampaignId, campaignName: legacyCampaignName }: LeadFinderProps) {
  const effectiveCampaignId = initialCampaignId || legacyCampaignId;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(effectiveCampaignId || '__none__');
  const activeCampaignId = selectedCampaignId === '__none__' ? undefined : selectedCampaignId;
  const activeCampaignName = campaigns.find(c => c.id === activeCampaignId)?.name || initialCampaignName || legacyCampaignName;
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [foundLeads, setFoundLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const { toast } = useToast();
  const { subscription, subscriptionLoading } = useAuth();

  const creditsRemaining = (subscription?.credits_limit || 0) - (subscription?.credits_used || 0);
  const hasCredits = creditsRemaining > 0;

  const { user, refreshSubscription } = useAuth();

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

    // Refresh subscription to get fresh credit data
    await refreshSubscription();

    try {
      const result = await searchLeadsWithExa({ 
        query: query.trim(),
        campaignId: activeCampaignId 
      });

      console.log('Search result:', result);

      if (result.success) {
        // Async mode - leads are being saved in background
        if (result.status === 'processing' || result.websetId) {
          toast({
            title: 'Search started!',
            description: activeCampaignId 
              ? 'Leads will be added to your job opening automatically. This may take 1-2 minutes.'
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
    } catch (error: any) {
      console.error('Search error:', error);
      const msg = error?.message || '';
      if (msg.includes('402') || msg.toLowerCase().includes('credit')) {
        toast({
          title: 'No credits remaining',
          description: 'You have used all your credits. Please upgrade your plan to continue.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Search error',
          description: 'Failed to search for leads. Please try again.',
          variant: 'destructive',
        });
      }
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
      const result = await saveLeads(leadsToSave, activeCampaignId);
      if (result.success) {
        toast({
          title: 'Leads saved!',
          description: activeCampaignId 
            ? `${leadsToSave.length} leads added to "${activeCampaignName}"`
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
      <div className="text-center mb-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          Find Your Next Placement
        </h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Paste a full job description or describe the role, location, and requirements. Be as specific as possible.
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm mb-6 animate-fade-in stagger-2 relative overflow-hidden">
        <img src={medileadLogo} alt="MediLead" className="absolute top-4 right-4 w-10 h-10 object-contain z-10" />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20 -translate-y-1/2 translate-x-1/2">
          <AbstractBlob className="w-full h-full" />
        </div>
        
        <div className="relative">
          <div className="search-input flex items-center gap-4 px-4 py-3">
            <div className="w-5 h-5 relative flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground" />
              </div>
              <div className="absolute bottom-0 right-0 w-1.5 h-2 bg-muted-foreground rounded-full rotate-45 origin-top" />
            </div>
            <Input
              placeholder="ICU Nurse — Los Angeles, CA — 3+ years ICU experience, BLS/ACLS certified, CA RN license required"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 px-0"
            />
          </div>

          <p className="text-sm text-muted-foreground mt-2 mb-2">Paste a full job description or describe the role, location, and requirements. Be as specific as possible.</p>

          {/* Examples */}
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300 border border-transparent hover:border-border text-left"
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
                <>You have <span className="font-semibold text-foreground">{creditsRemaining}</span> searches remaining. Each search finds 10-15 qualified candidates.</>
              ) : (
                <span className="text-destructive font-medium">You have no searches remaining. Upgrade to continue finding candidates.</span>
              )}
            </p>
          )}

          {/* Campaign selector */}
          {campaigns.length > 0 && (
            <div className="mt-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Add to Job Opening (optional)</label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Unassigned (search only)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="__none__">Unassigned (search only)</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !hasCredits}
            className="w-full mt-4 h-12 text-base font-semibold rounded-2xl"
            size="lg"
          >
            {isSearching ? (
              <span className="flex items-center gap-3">
                <RingLoader className="w-5 h-5" />
                Finding candidates...
              </span>
            ) : !hasCredits ? (
              'No Searches Left — Upgrade Plan'
            ) : (
              'Search →'
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
                Found {foundLeads.length} candidates
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
                `Save ${selectedLeads.size} Candidates`
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
