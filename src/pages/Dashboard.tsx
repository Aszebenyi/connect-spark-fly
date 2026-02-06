import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OAuthCallback } from '@/components/OAuthCallback';
import { Sidebar } from '@/components/Sidebar';
import { StatCard } from '@/components/StatCard';
import { LeadTable } from '@/components/LeadTable';
import { CampaignCard } from '@/components/CampaignCard';
import { LeadFinder } from '@/components/LeadFinder';
import { LeadDetailSheet } from '@/components/LeadDetailSheet';
import { CreateCampaignDialog } from '@/components/CreateCampaignDialog';
import { SettingsPage } from '@/components/SettingsPage';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { Button } from '@/components/ui/button';
import { RingLoader, AbstractBlob, TargetRings, SparkBurst, DataFlow } from '@/components/ui/visual-elements';
import { SEO } from '@/components/SEO';
import { 
  getLeads, 
  getCampaigns, 
  getStats, 
  getLeadsByCampaign,
  Lead as ApiLead, 
  Campaign,
  updateLeadStatus,
  deleteLead,
} from '@/lib/api';
import { Lead as LegacyLead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionRealtime } from '@/hooks/useSubscriptionRealtime';
import { useBrandConfig } from '@/hooks/useBrandConfig';

export default function Index() {
  const { appName } = useBrandConfig();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLead, setSelectedLead] = useState<LegacyLead | null>(null);
  const [dbLeads, setDbLeads] = useState<ApiLead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ totalLeads: 0, contacted: 0, replied: 0, qualified: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [findMoreCampaign, setFindMoreCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Subscribe to realtime subscription changes for credit updates
  useSubscriptionRealtime();

  // Refresh subscription when tab regains focus (e.g., after checkout in new tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, refreshing subscription');
      refreshSubscription();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSubscription]);

  // Detect if we're in a popup for OAuth callback
  const isOAuthPopup = window.opener && searchParams.get('code');

  // Handle checkout success/cancel
  useEffect(() => {
    // Don't run checkout logic if we're in OAuth popup
    if (isOAuthPopup) return;
    
    const checkout = searchParams.get('checkout');
    
    if (checkout === 'success') {
      toast({
        title: 'Subscription activated!',
        description: 'Your plan has been upgraded successfully.',
      });
      refreshSubscription();
      navigate('/dashboard', { replace: true });
    } else if (checkout === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'You can upgrade anytime from Settings.',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, toast, refreshSubscription, navigate, isOAuthPopup]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // If this is the OAuth popup, render the callback handler
  if (isOAuthPopup) {
    return <OAuthCallback />;
  }

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsResult, campaignsResult, statsResult] = await Promise.all([
        getLeads(),
        getCampaigns(),
        getStats(),
      ]);

      if (leadsResult.success && leadsResult.leads) {
        setDbLeads(leadsResult.leads);
      }
      if (campaignsResult.success && campaignsResult.campaigns) {
        setCampaigns(campaignsResult.campaigns);
      }
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error loading data',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeadsForCampaign = async (campaignId: string) => {
    try {
      const result = await getLeadsByCampaign(campaignId);
      if (result.success && result.leads) {
        setDbLeads(result.leads);
      }
    } catch (error) {
      console.error('Failed to load campaign leads:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadLeadsForCampaign(selectedCampaignId);
    } else if (user) {
      getLeads().then(result => {
        if (result.success && result.leads) {
          setDbLeads(result.leads);
        }
      });
    }
  }, [selectedCampaignId, user]);

  const convertedLeads: LegacyLead[] = dbLeads.map((lead) => ({
    id: lead.id || '',
    name: lead.name,
    email: lead.email || '',
    company: lead.company || '',
    title: lead.title || '',
    status: (lead.status as LegacyLead['status']) || 'new',
    score: lead.profile_data?.exa_score ? Math.round(lead.profile_data.exa_score * 100) : 75,
    lastContact: lead.updated_at || null,
    tags: lead.industry ? [lead.industry] : [],
    phone: lead.phone,
    linkedin: lead.linkedin_url,
    notes: lead.profile_data?.summary,
    location: lead.location,
    industry: lead.industry || '',
    createdAt: lead.created_at || new Date().toISOString(),
    profile_data: lead.profile_data, // Pass the full profile_data for enrichment display
  }));

  const handleLeadsFound = () => {
    loadData();
    setFindMoreCampaign(null);
    toast({
      title: 'Leads updated',
      description: 'Your lead database has been refreshed',
    });
  };

  const handleCampaignCreated = (campaignId?: string, campaignData?: Campaign) => {
    // Immediately add the new campaign to state for instant visibility
    if (campaignData) {
      setCampaigns(prev => [campaignData, ...prev]);
    }
    
    // Also refresh data in background to ensure consistency
    loadData();
    setShowCreateCampaign(false);
    
    // If a campaign ID is provided, navigate to that campaign's leads
    if (campaignId) {
      setSelectedCampaignId(campaignId);
      setActiveTab('leads');
    }
  };

  const handleLeadUpdated = async () => {
    // Refresh all data from the database
    const leadsResult = await getLeads();
    if (leadsResult.success && leadsResult.leads) {
      setDbLeads(leadsResult.leads);
      
      // If a lead is currently selected, update it with fresh data
      if (selectedLead) {
        const freshLead = leadsResult.leads.find(l => l.id === selectedLead.id);
        if (freshLead) {
          // Convert to LegacyLead format and update selectedLead
          const updatedLead: LegacyLead = {
            id: freshLead.id || '',
            name: freshLead.name,
            email: freshLead.email || '',
            company: freshLead.company || '',
            title: freshLead.title || '',
            status: (freshLead.status as LegacyLead['status']) || 'new',
            score: freshLead.profile_data?.exa_score ? Math.round(freshLead.profile_data.exa_score * 100) : 75,
            lastContact: freshLead.updated_at || null,
            tags: freshLead.industry ? [freshLead.industry] : [],
            phone: freshLead.phone,
            linkedin: freshLead.linkedin_url,
            notes: freshLead.profile_data?.summary,
            location: freshLead.location,
            industry: freshLead.industry || '',
            createdAt: freshLead.created_at || new Date().toISOString(),
            profile_data: freshLead.profile_data,
          };
          setSelectedLead(updatedLead);
        }
      }
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const result = await updateLeadStatus(leadId, newStatus);
    if (result.success) {
      loadData();
      toast({ title: 'Status updated' });
    } else {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const result = await deleteLead(leadId);
    if (result.success) {
      loadData();
      toast({ title: 'Lead deleted' });
    } else {
      toast({ title: 'Failed to delete lead', variant: 'destructive' });
    }
  };

  const handleViewCampaignLeads = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id || null);
    setActiveTab('leads');
  };

  const handleFindMoreLeads = (campaign: Campaign) => {
    setFindMoreCampaign(campaign);
    setActiveTab('finder');
  };

  const replyRate = stats.contacted > 0 ? Math.round((stats.replied / stats.contacted) * 100) : 0;

  // Show loading while checking auth
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <RingLoader className="w-16 h-16" />
          <p className="text-muted-foreground font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render main content if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="ml-72 p-10">
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="page-header">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Track your outreach performance and lead pipeline</p>
            </div>

            {/* Onboarding Checklist */}
            <OnboardingChecklist
              onCreateCampaign={() => setShowCreateCampaign(true)}
              onNavigateToFinder={() => setActiveTab('finder')}
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToLeads={() => setActiveTab('leads')}
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard
                title="Total Leads"
                value={stats.totalLeads}
                change={stats.totalLeads > 0 ? 'In database' : 'Start finding leads'}
                changeType="positive"
                visual="users"
                className="animate-fade-in stagger-1"
              />
              <StatCard
                title="Contacted"
                value={stats.contacted}
                change={stats.contacted > 0 ? 'Outreach sent' : 'Ready to contact'}
                changeType="positive"
                visual="send"
                className="animate-fade-in stagger-2"
              />
              <StatCard
                title="Replied"
                value={stats.replied}
                change={stats.replied > 0 ? 'Got responses' : 'Awaiting replies'}
                changeType="positive"
                visual="chat"
                className="animate-fade-in stagger-3"
              />
              <StatCard
                title="Reply Rate"
                value={`${replyRate}%`}
                change={replyRate > 20 ? 'Above average' : 'Keep going'}
                changeType={replyRate > 20 ? 'positive' : 'neutral'}
                visual="trend"
                className="animate-fade-in stagger-4"
              />
            </div>

            {/* Quick Actions */}
            <div className="mb-12">
              <div className="section-header">
                <h2 className="section-title">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => setShowCreateCampaign(true)} className="action-card text-left">
                  <div className="relative z-10">
                    <div className="visual-badge visual-badge-lg mb-5">
                      <SparkBurst className="w-10 h-10" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xl mb-2">New Campaign</h3>
                    <p className="text-muted-foreground">Create campaign with leads</p>
                  </div>
                </button>
                <button onClick={() => setActiveTab('leads')} className="action-card text-left">
                  <div className="relative z-10">
                    <div className="visual-badge visual-badge-lg mb-5">
                      <TargetRings className="w-10 h-10" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xl mb-2">View Leads</h3>
                    <p className="text-muted-foreground">{dbLeads.length} in your database</p>
                  </div>
                </button>
                <button onClick={() => setActiveTab('campaigns')} className="action-card text-left">
                  <div className="relative z-10">
                    <div className="visual-badge visual-badge-lg mb-5">
                      <DataFlow className="w-10 h-10" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xl mb-2">Manage Campaigns</h3>
                    <p className="text-muted-foreground">{campaigns.length} campaigns</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Leads */}
            {convertedLeads.length > 0 && (
              <div className="mb-12 animate-fade-in stagger-5">
                <div className="section-header">
                  <h2 className="section-title">Recent Leads</h2>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('leads')} className="rounded-xl">
                    View All →
                  </Button>
                </div>
                <LeadTable 
                  leads={convertedLeads.slice(0, 5)} 
                  onLeadClick={(lead) => setSelectedLead(lead)}
                />
              </div>
            )}

            {/* Active Campaigns */}
            {campaigns.length > 0 && (
              <div className="animate-fade-in stagger-6">
                <div className="section-header">
                  <h2 className="section-title">Campaigns</h2>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')} className="rounded-xl">
                    View All →
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.slice(0, 4).map((campaign, index) => (
                    <CampaignCard 
                      key={campaign.id} 
                      campaign={campaign}
                      onUpdate={loadData}
                      onViewLeads={handleViewCampaignLeads}
                      onFindMoreLeads={handleFindMoreLeads}
                      className={`animate-fade-in stagger-${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {convertedLeads.length === 0 && campaigns.length === 0 && (
              <div className="empty-state animate-fade-in-up">
                <div className="relative z-10">
                  <div className="visual-badge visual-badge-lg mx-auto mb-8 animate-float">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-foreground mb-4">Welcome to {appName}</h3>
                  <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">
                    Start by creating a campaign to find and organize your leads using AI-powered search.
                  </p>
                  <Button onClick={() => setShowCreateCampaign(true)} size="lg" className="rounded-xl px-8 h-14 text-base">
                    Create Your First Campaign →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-10">
              <div className="page-header mb-0">
                <h1 className="page-title">Leads</h1>
                <p className="page-subtitle">
                  {selectedCampaignId 
                    ? `Viewing leads from campaign` 
                    : `${dbLeads.length} leads in your database`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => { setSelectedCampaignId(null); loadData(); }} className="rounded-xl">
                  Refresh
                </Button>
                <Button variant="outline" className="rounded-xl">
                  Export
                </Button>
                <Button onClick={() => setShowCreateCampaign(true)} className="rounded-xl">
                  + New Campaign
                </Button>
              </div>
            </div>
            <LeadTable 
              leads={convertedLeads}
              campaigns={campaigns}
              selectedCampaignId={selectedCampaignId}
              onCampaignFilterChange={setSelectedCampaignId}
              onLeadClick={(lead) => setSelectedLead(lead)}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteLead}
              onCreateCampaign={() => setShowCreateCampaign(true)}
              onFindLeads={() => setActiveTab('finder')}
            />
          </div>
        )}

        {activeTab === 'finder' && (
          <div className="animate-fade-in py-6">
            {findMoreCampaign ? (
              <>
                <div className="mb-6 flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setFindMoreCampaign(null)}
                    className="rounded-xl"
                  >
                    ← Back
                  </Button>
                  <div>
                    <p className="text-sm text-muted-foreground">Adding leads to campaign</p>
                    <p className="font-semibold text-foreground">{findMoreCampaign.name}</p>
                  </div>
                </div>
                <LeadFinder 
                  onLeadsFound={handleLeadsFound}
                  campaignId={findMoreCampaign.id}
                  campaignName={findMoreCampaign.name}
                />
              </>
            ) : (
              <LeadFinder onLeadsFound={handleLeadsFound} />
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-10">
              <div className="page-header mb-0">
                <h1 className="page-title">Campaigns</h1>
                <p className="page-subtitle">{campaigns.length} campaigns</p>
              </div>
              <Button onClick={() => setShowCreateCampaign(true)} className="rounded-xl">
                + New Campaign
              </Button>
            </div>
            {campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign, index) => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={campaign}
                    onUpdate={loadData}
                    onViewLeads={handleViewCampaignLeads}
                    onFindMoreLeads={handleFindMoreLeads}
                    className={`animate-fade-in stagger-${index + 1}`}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="relative z-10">
                  <div className="visual-badge visual-badge-lg mx-auto mb-8">
                    <DataFlow className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-6">Create a campaign to find and organize leads</p>
                  <Button onClick={() => setShowCreateCampaign(true)} size="lg" className="rounded-xl">
                    + Create Campaign
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && <SettingsPage />}
      </main>

      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={handleLeadUpdated}
      />

      <CreateCampaignDialog
        open={showCreateCampaign}
        onOpenChange={setShowCreateCampaign}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}
