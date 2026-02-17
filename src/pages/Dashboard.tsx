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
import { cn } from '@/lib/utils';
import { Flame, Mail, CalendarDays, Clock, Loader2, Plus } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';
import { SEO } from '@/components/SEO';
import { 
  getLeads, 
  getCampaigns, 
  getStats, 
  getLeadsByCampaign,
  getLeadAssignments,
  assignLeadsToCampaign,
  removeLeadsFromCampaign,
  deleteLeads,
  Lead, 
  Campaign,
  LeadCampaignAssignment,
  updateLeadStatus,
  deleteLead,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionRealtime } from '@/hooks/useSubscriptionRealtime';
import { useBrandConfig } from '@/hooks/useBrandConfig';

export default function Index() {
  const { appName } = useBrandConfig();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilterFromStats, setStatusFilterFromStats] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<LeadCampaignAssignment[]>([]);
  const [stats, setStats] = useState({ totalLeads: 0, contacted: 0, replied: 0, qualified: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [findMoreCampaign, setFindMoreCampaign] = useState<Campaign | null>(null);
  const [jobsTab, setJobsTab] = useState<'active' | 'completed'>('active');
  const [showAddCandidate, setShowAddCandidate] = useState(false);
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
      const [leadsResult, campaignsResult, statsResult, assignResult] = await Promise.all([
        getLeads(),
        getCampaigns(),
        getStats(),
        getLeadAssignments(),
      ]);

      if (leadsResult.success && leadsResult.leads) {
        setDbLeads(leadsResult.leads);
      }
      if (campaignsResult.success && campaignsResult.campaigns) {
        setCampaigns(campaignsResult.campaigns);
      }
      if (assignResult.success && assignResult.assignments) {
        setAssignments(assignResult.assignments);
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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Pass dbLeads directly — no conversion needed with unified Lead type

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
    const leadsResult = await getLeads();
    if (leadsResult.success && leadsResult.leads) {
      setDbLeads(leadsResult.leads);
      
      if (selectedLead) {
        const freshLead = leadsResult.leads.find(l => l.id === selectedLead.id);
        if (freshLead) {
          setSelectedLead(freshLead);
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

  const handleBulkDelete = async (leadIds: string[]) => {
    const result = await deleteLeads(leadIds);
    if (result.success) {
      loadData();
      toast({ title: `${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} deleted` });
    } else {
      toast({ title: 'Failed to delete candidates', variant: 'destructive' });
    }
  };

  const handleBulkAssign = async (leadIds: string[], campaignId: string) => {
    const result = await assignLeadsToCampaign(leadIds, campaignId);
    if (result.success) {
      loadData();
      const campaign = campaigns.find(c => c.id === campaignId);
      toast({ title: `Added ${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} to ${campaign?.name || 'job opening'}` });
    } else {
      toast({ title: 'Failed to assign candidates', variant: 'destructive' });
    }
  };

  const handleBulkRemove = async (leadIds: string[], campaignId: string) => {
    const result = await removeLeadsFromCampaign(leadIds, campaignId);
    if (result.success) {
      loadData();
      toast({ title: `Removed ${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} from job opening` });
    } else {
      toast({ title: 'Failed to remove candidates', variant: 'destructive' });
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
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
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
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Open navigation menu">
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-foreground">{appName}</span>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 h-full w-72">
            <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      <main id="main-content" className="lg:ml-72 p-6 pt-18 lg:pt-6">
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="page-header flex items-start justify-between">
              <div>
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Track your candidate pipeline and placement performance</p>
              </div>
              <NotificationBell />
            </div>

            {/* Onboarding Checklist */}
            <OnboardingChecklist
              onCreateCampaign={() => setShowCreateCampaign(true)}
              onNavigateToFinder={() => setActiveTab('finder')}
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToCompanyProfile={() => setActiveTab('settings')}
              onNavigateToLeads={() => setActiveTab('leads')}
            />

            {/* Today's Priorities */}
            {(() => {
              const now = new Date();
              const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const needResponse = dbLeads.filter(l => l.status === 'replied' && new Date(l.updated_at) < oneDayAgo).length;
              const followUpsDue = dbLeads.filter(l => l.status === 'contacted' && new Date(l.updated_at) < threeDaysAgo).length;
              const interviewsThisWeek = dbLeads.filter(l => l.status === 'interview_scheduled').length;
              const staleLeads = dbLeads.filter(l => new Date(l.updated_at) < sevenDaysAgo && !['hired', 'lost'].includes(l.status || '')).length;
              const hasAny = needResponse + followUpsDue + interviewsThisWeek + staleLeads > 0;

              if (!hasAny) return null;

              const cards = [
                { count: needResponse, label: 'Need Response', action: 'Replied but no follow-up yet', status: 'replied', icon: <Flame className="w-5 h-5 text-destructive" />, border: 'border-destructive/20' },
                { count: followUpsDue, label: 'Follow-ups Due', action: 'No activity in 3+ days', status: 'contacted', icon: <Mail className="w-5 h-5 text-warning" />, border: 'border-warning/20' },
                { count: interviewsThisWeek, label: 'Interviews', action: 'Scheduled interviews', status: 'interview_scheduled', icon: <CalendarDays className="w-5 h-5 text-primary" />, border: 'border-primary/20' },
                { count: staleLeads, label: 'Stale Leads', action: 'No updates in 7+ days', status: null as string | null, icon: <Clock className="w-5 h-5 text-muted-foreground" />, border: 'border-border' },
              ];

              return (
                <div className="mb-8 animate-fade-in">
                  <div className="section-header">
                    <h2 className="section-title">Today's Priorities</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {cards.map((card) => (
                      <button
                        key={card.label}
                        onClick={() => { if (card.status) setStatusFilterFromStats(card.status); setActiveTab('leads'); }}
                        className={cn(
                          'bg-card border rounded-lg p-5 text-left transition-colors duration-150 hover:border-muted-foreground/30',
                          card.border
                        )}
                        style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}
                      >
                        <div className="mb-3">
                          {card.icon}
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-semibold text-foreground">{card.count}</span>
                          <span className="text-sm text-muted-foreground">{card.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{card.action}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Candidate Pipeline */}
            {dbLeads.length > 0 && (() => {
              const sourced = dbLeads.length;
              const contactedStatuses = ['contacted','replied','qualified','interview_scheduled','offer_sent','hired'];
              const repliedStatuses = ['replied','qualified','interview_scheduled','offer_sent','hired'];
              const interviewStatuses = ['interview_scheduled','offer_sent','hired'];
              const offerStatuses = ['offer_sent','hired'];

              const contacted = dbLeads.filter(l => contactedStatuses.includes(l.status || '')).length;
              const replied = dbLeads.filter(l => repliedStatuses.includes(l.status || '')).length;
              const interviewing = dbLeads.filter(l => interviewStatuses.includes(l.status || '')).length;
              const offers = dbLeads.filter(l => offerStatuses.includes(l.status || '')).length;
              const hired = dbLeads.filter(l => l.status === 'hired').length;

              const stages = [
                { name: 'Sourced', count: sourced, percentage: 100, rate: 100, status: null as string | null },
                { name: 'Contacted', count: contacted, percentage: sourced ? (contacted / sourced) * 100 : 0, rate: sourced ? Math.round((contacted / sourced) * 100) : 0, status: 'contacted' },
                { name: 'Replied', count: replied, percentage: sourced ? (replied / sourced) * 100 : 0, rate: contacted ? Math.round((replied / contacted) * 100) : 0, status: 'replied' },
                { name: 'Interviewing', count: interviewing, percentage: sourced ? (interviewing / sourced) * 100 : 0, rate: replied ? Math.round((interviewing / replied) * 100) : 0, status: 'interview_scheduled' },
                { name: 'Offers', count: offers, percentage: sourced ? (offers / sourced) * 100 : 0, rate: interviewing ? Math.round((offers / interviewing) * 100) : 0, status: 'offer_sent' },
                { name: 'Hired', count: hired, percentage: sourced ? (hired / sourced) * 100 : 0, rate: offers ? Math.round((hired / offers) * 100) : 0, status: 'hired' },
              ];

              return (
                <div className="mb-8 animate-fade-in">
                  <div className="section-header">
                    <h2 className="section-title">Candidate Pipeline</h2>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6" style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}>
                    {stages.map((stage) => (
                      <div
                        key={stage.name}
                        className="flex items-center gap-4 mb-3 last:mb-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { if (stage.status) setStatusFilterFromStats(stage.status); setActiveTab('leads'); }}
                      >
                        <span className="text-sm font-medium w-24 text-foreground">{stage.name}</span>
                        <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${Math.max(stage.percentage, stage.count > 0 ? 3 : 0)}%`,
                              background: 'hsl(var(--primary))',
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-16 text-right text-foreground">{stage.count}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{stage.rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Total Candidates"
                  value={stats.totalLeads}
                  change={stats.totalLeads > 0 ? 'In database' : 'Start finding candidates'}
                changeType="positive"
                visual="users"
                className="animate-fade-in stagger-1"
                onClick={() => { setStatusFilterFromStats(null); setActiveTab('leads'); }}
              />
              <StatCard
                title="Contacted"
                value={stats.contacted}
                change={stats.contacted > 0 ? 'Outreach sent' : 'Ready to contact'}
                changeType="positive"
                visual="send"
                className="animate-fade-in stagger-2"
                onClick={() => { setStatusFilterFromStats('contacted'); setActiveTab('leads'); }}
              />
              <StatCard
                title="Replied"
                value={stats.replied}
                change={stats.replied > 0 ? 'Got responses' : 'Awaiting replies'}
                changeType="positive"
                visual="chat"
                className="animate-fade-in stagger-3"
                onClick={() => { setStatusFilterFromStats('replied'); setActiveTab('leads'); }}
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



            {/* Active Campaigns */}
            {campaigns.length > 0 && (
              <div className="animate-fade-in stagger-6">
                <div className="section-header">
                  <h2 className="section-title">Job Openings</h2>
                   <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')} className="rounded-md">
                    View All →
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {dbLeads.length === 0 && campaigns.length === 0 && (
              <div className="bg-card border border-border rounded-lg p-12 text-center animate-fade-in-up">
                   <h3 className="text-2xl font-semibold text-foreground mb-3">Welcome to {appName}</h3>
                   <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                     Start by creating a job opening to find qualified healthcare candidates using AI-powered search.
                   </p>
                  <Button onClick={() => setShowCreateCampaign(true)} size="lg" className="rounded-md px-6">
                    Create Your First Job Opening →
                  </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="page-header mb-0">
                <h1 className="page-title">Candidates</h1>
                <p className="page-subtitle">
                  {selectedCampaignId 
                    ? `Viewing candidates from job opening` 
                    : `${dbLeads.length} candidates in your pipeline`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowAddCandidate(true)} className="rounded-md">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Manual
                </Button>
                <Button variant="outline" onClick={() => { setSelectedCampaignId(null); loadData(); }} className="rounded-md">
                  Refresh
                </Button>
                <Button variant="outline" className="rounded-md">
                  Export
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-sm text-muted-foreground">View:</span>
              {[
                { label: 'All', value: null },
                { label: 'New', value: 'new' },
                { label: 'Contacted', value: 'contacted' },
                { label: 'Replied', value: 'replied' },
                { label: 'Qualified', value: 'qualified' },
                { label: 'Interviewing', value: 'interview_scheduled' },
                { label: 'Hired', value: 'hired' },
              ].map((chip) => (
                <Button
                  key={chip.label}
                  variant={statusFilterFromStats === chip.value ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-md"
                  onClick={() => setStatusFilterFromStats(chip.value)}
                >
                  {chip.label}
                </Button>
              ))}
            </div>
            <LeadTable 
              leads={dbLeads}
              campaigns={campaigns}
              assignments={assignments}
              selectedCampaignId={selectedCampaignId}
              onCampaignFilterChange={setSelectedCampaignId}
              onLeadClick={(lead) => setSelectedLead(lead)}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteLead}
              onBulkDelete={handleBulkDelete}
              onBulkAssign={handleBulkAssign}
              onBulkRemove={handleBulkRemove}
              onCreateCampaign={() => setShowCreateCampaign(true)}
              onFindLeads={() => setActiveTab('finder')}
              initialStatusFilter={statusFilterFromStats}
              onClearStatusFilter={() => setStatusFilterFromStats(null)}
              activeCampaign={campaigns?.find(c => c.id === selectedCampaignId) || null}
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
                    className="rounded-md"
                  >
                    ← Back
                  </Button>
                  <div>
                     <p className="text-sm text-muted-foreground">Adding candidates to job opening</p>
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
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8 animate-fade-in">
                  <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">Search for Candidates</h2>
                  <p className="text-muted-foreground text-sm">Select a job opening to add candidates to</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-6 animate-fade-in stagger-2" style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Which job opening is this for?</p>
                  <div className="space-y-2">
                    {campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => setFindMoreCampaign(campaign)}
                        className="w-full text-left p-4 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {campaign.lead_count || 0} candidates • {campaign.status || 'draft'}
                            </p>
                          </div>
                          <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setShowCreateCampaign(true)}
                      className="w-full text-left p-4 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 group"
                    >
                      <p className="font-semibold text-primary">+ Create new job opening</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Set up a new role to search for</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="page-header mb-0">
                <h1 className="page-title">Job Openings</h1>
                <p className="page-subtitle">{campaigns.length} job openings</p>
              </div>
              <Button onClick={() => setShowCreateCampaign(true)} className="rounded-md">
                + New Job Opening
              </Button>
            </div>

            {/* Active/Completed Tabs */}
            <div className="border-b border-border mb-6">
              <nav className="flex gap-6">
                <button
                  onClick={() => setJobsTab('active')}
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    jobsTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Active ({campaigns.filter(c => c.status !== 'completed').length})
                </button>
                <button
                  onClick={() => setJobsTab('completed')}
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    jobsTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed ({campaigns.filter(c => c.status === 'completed').length})
                </button>
              </nav>
            </div>

            {(() => {
              const displayedCampaigns = jobsTab === 'active'
                ? campaigns.filter(c => c.status !== 'completed')
                : campaigns.filter(c => c.status === 'completed');

              return displayedCampaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedCampaigns.map((campaign, index) => (
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
                <div className="bg-card border border-border rounded-lg p-10 text-center">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {jobsTab === 'active' ? 'No active job openings' : 'No completed job openings'}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                    {jobsTab === 'active'
                      ? 'Job openings help you organize candidates by role. Create your first job opening to get started.'
                      : 'Completed job openings will appear here.'}
                  </p>
                  {jobsTab === 'active' && (
                    <Button onClick={() => setShowCreateCampaign(true)} size="lg" className="rounded-md px-6">
                      + Create Job Opening
                    </Button>
                  )}
                </div>
              );
            })()}
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

      <AddCandidateDialog
        open={showAddCandidate}
        onOpenChange={setShowAddCandidate}
        onCreated={loadData}
      />
    </div>
  );
}
