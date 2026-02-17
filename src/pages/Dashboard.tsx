import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OAuthCallback } from '@/components/OAuthCallback';
import { Sidebar } from '@/components/Sidebar';
import { LeadDetailSheet } from '@/components/LeadDetailSheet';
import { CreateCampaignDialog } from '@/components/CreateCampaignDialog';
import { SettingsPage } from '@/components/SettingsPage';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';
import { SEO } from '@/components/SEO';
import { Loader2 } from 'lucide-react';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { CandidatesTab } from '@/components/dashboard/CandidatesTab';
import { OpeningsTab } from '@/components/dashboard/OpeningsTab';
import { FinderTab } from '@/components/dashboard/FinderTab';
import {
  getLeads,
  getCampaigns,
  getStats,
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
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useSubscriptionRealtime();

  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, refreshing subscription');
      refreshSubscription();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshSubscription]);

  const isOAuthPopup = window.opener && searchParams.get('code');

  useEffect(() => {
    if (isOAuthPopup) return;
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast({ title: 'Subscription activated!', description: 'Your plan has been upgraded successfully.' });
      refreshSubscription();
      navigate('/dashboard', { replace: true });
    } else if (checkout === 'canceled') {
      toast({ title: 'Checkout canceled', description: 'You can upgrade anytime from Settings.' });
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, toast, refreshSubscription, navigate, isOAuthPopup]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsResult, campaignsResult, statsResult, assignResult] = await Promise.all([
        getLeads(), getCampaigns(), getStats(), getLeadAssignments(),
      ]);
      if (leadsResult.success && leadsResult.leads) setDbLeads(leadsResult.leads);
      if (campaignsResult.success && campaignsResult.campaigns) setCampaigns(campaignsResult.campaigns);
      if (assignResult.success && assignResult.assignments) setAssignments(assignResult.assignments);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: 'Error loading data', description: 'Please try refreshing the page', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (user) loadData(); }, [user]);

  if (isOAuthPopup) return <OAuthCallback />;

  const handleLeadsFound = () => {
    loadData();
    setFindMoreCampaign(null);
    toast({ title: 'Leads updated', description: 'Your lead database has been refreshed' });
  };

  const handleCampaignCreated = (campaignId?: string, campaignData?: Campaign) => {
    if (campaignData) setCampaigns(prev => [campaignData, ...prev]);
    loadData();
    setShowCreateCampaign(false);
    if (campaignId) { setSelectedCampaignId(campaignId); setActiveTab('leads'); }
  };

  const handleLeadUpdated = async () => {
    const leadsResult = await getLeads();
    if (leadsResult.success && leadsResult.leads) {
      setDbLeads(leadsResult.leads);
      if (selectedLead) {
        const freshLead = leadsResult.leads.find(l => l.id === selectedLead.id);
        if (freshLead) setSelectedLead(freshLead);
      }
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const result = await updateLeadStatus(leadId, newStatus);
    if (result.success) {
      loadData();
      toast({ title: 'Status updated' });
      // Auto-log status change as a note
      const { createLeadNote } = await import('@/lib/api');
      createLeadNote(leadId, `Status changed to ${newStatus}`, 'status_change');
    }
    else toast({ title: 'Failed to update status', variant: 'destructive' });
  };

  const handleDeleteLead = async (leadId: string) => {
    const result = await deleteLead(leadId);
    if (result.success) { loadData(); toast({ title: 'Lead deleted' }); }
    else toast({ title: 'Failed to delete lead', variant: 'destructive' });
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    const result = await deleteLeads(leadIds);
    if (result.success) { loadData(); toast({ title: `${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} deleted` }); }
    else toast({ title: 'Failed to delete candidates', variant: 'destructive' });
  };

  const handleBulkAssign = async (leadIds: string[], campaignId: string) => {
    const result = await assignLeadsToCampaign(leadIds, campaignId);
    if (result.success) { loadData(); const c = campaigns.find(c => c.id === campaignId); toast({ title: `Added ${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} to ${c?.name || 'job opening'}` }); }
    else toast({ title: 'Failed to assign candidates', variant: 'destructive' });
  };

  const handleBulkRemove = async (leadIds: string[], campaignId: string) => {
    const result = await removeLeadsFromCampaign(leadIds, campaignId);
    if (result.success) { loadData(); toast({ title: `Removed ${leadIds.length} candidate${leadIds.length > 1 ? 's' : ''} from job opening` }); }
    else toast({ title: 'Failed to remove candidates', variant: 'destructive' });
  };

  const handleViewCampaignLeads = (campaign: Campaign) => { setSelectedCampaignId(campaign.id || null); setActiveTab('leads'); };
  const handleFindMoreLeads = (campaign: Campaign) => { setFindMoreCampaign(campaign); setActiveTab('finder'); };

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-3">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Open navigation menu">
          <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-foreground">{appName}</span>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 h-full w-72">
            <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }} />
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <main id="main-content" className="lg:ml-72 p-6 pt-18 lg:pt-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            dbLeads={dbLeads}
            campaigns={campaigns}
            onCreateCampaign={() => setShowCreateCampaign(true)}
            onNavigateToTab={setActiveTab}
            onViewCampaignLeads={handleViewCampaignLeads}
            onFindMoreLeads={handleFindMoreLeads}
            loadData={loadData}
            setStatusFilterFromStats={setStatusFilterFromStats}
          />
        )}

        {activeTab === 'leads' && (
          <CandidatesTab
            dbLeads={dbLeads}
            campaigns={campaigns}
            assignments={assignments}
            selectedCampaignId={selectedCampaignId}
            statusFilterFromStats={statusFilterFromStats}
            setSelectedCampaignId={setSelectedCampaignId}
            setStatusFilterFromStats={setStatusFilterFromStats}
            onLeadClick={(lead) => setSelectedLead(lead)}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteLead}
            onBulkDelete={handleBulkDelete}
            onBulkAssign={handleBulkAssign}
            onBulkRemove={handleBulkRemove}
            onCreateCampaign={() => setShowCreateCampaign(true)}
            onFindLeads={() => setActiveTab('finder')}
            onShowAddCandidate={() => setShowAddCandidate(true)}
            loadData={loadData}
          />
        )}

        {activeTab === 'finder' && (
          <FinderTab
            campaigns={campaigns}
            findMoreCampaign={findMoreCampaign}
            setFindMoreCampaign={setFindMoreCampaign}
            onLeadsFound={handleLeadsFound}
            onCreateCampaign={() => setShowCreateCampaign(true)}
          />
        )}

        {activeTab === 'campaigns' && (
          <OpeningsTab
            campaigns={campaigns}
            onCreateCampaign={() => setShowCreateCampaign(true)}
            onViewCampaignLeads={handleViewCampaignLeads}
            onFindMoreLeads={handleFindMoreLeads}
            loadData={loadData}
          />
        )}

        {activeTab === 'settings' && <SettingsPage />}
      </main>

      <LeadDetailSheet lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} onLeadUpdated={handleLeadUpdated} />
      <CreateCampaignDialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign} onCreated={handleCampaignCreated} />
      <AddCandidateDialog open={showAddCandidate} onOpenChange={setShowAddCandidate} onCreated={loadData} />
    </div>
  );
}
