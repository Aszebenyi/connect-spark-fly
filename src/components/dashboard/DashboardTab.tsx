import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { CampaignCard } from '@/components/CampaignCard';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils';
import { Flame, Mail, CalendarDays, Clock, Search, MessageSquare, Reply } from 'lucide-react';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Lead, Campaign } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface DashboardTabProps {
  stats: { totalLeads: number; contacted: number; replied: number; qualified: number };
  dbLeads: Lead[];
  campaigns: Campaign[];
  onCreateCampaign: () => void;
  onNavigateToTab: (tab: string) => void;
  onViewCampaignLeads: (campaign: Campaign) => void;
  onFindMoreLeads: (campaign: Campaign) => void;
  loadData: () => void;
  setStatusFilterFromStats: (status: string | null) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardTab({
  stats,
  dbLeads,
  campaigns,
  onCreateCampaign,
  onNavigateToTab,
  onViewCampaignLeads,
  onFindMoreLeads,
  loadData,
  setStatusFilterFromStats,
}: DashboardTabProps) {
  const { appName } = useBrandConfig();
  const { user } = useAuth();
  const replyRate = stats.contacted > 0 ? Math.round((stats.replied / stats.contacted) * 100) : 0;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const awaitingResponse = useMemo(() =>
    dbLeads.filter(l => l.status === 'replied' && l.updated_at && new Date(l.updated_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    [dbLeads]
  );

  // This Week stats
  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString();
  }, []);

  const candidatesFoundThisWeek = useMemo(() =>
    dbLeads.filter(l => l.created_at && l.created_at >= startOfWeek).length,
    [dbLeads, startOfWeek]
  );

  const { data: emailsSentThisWeek = 0 } = useQuery({
    queryKey: ['emails-sent-this-week', startOfWeek],
    queryFn: async () => {
      const { count } = await supabase
        .from('outreach_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek);
      return count || 0;
    },
    staleTime: 60000,
  });

  const repliesThisWeek = useMemo(() =>
    dbLeads.filter(l => l.status === 'replied' && l.updated_at && l.updated_at >= startOfWeek).length,
    [dbLeads, startOfWeek]
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Track your candidate pipeline and placement performance</p>
        </div>
        <NotificationBell />
      </div>

      {/* Welcome bar */}
      <p className="text-sm text-muted-foreground mb-6">
        {getGreeting()}, <span className="font-medium text-foreground">{firstName}</span>.
        {awaitingResponse > 0 && (
          <> You have <span className="font-semibold text-primary">{awaitingResponse}</span> candidate{awaitingResponse !== 1 ? 's' : ''} awaiting response.</>
        )}
      </p>

      <OnboardingChecklist
        onCreateCampaign={onCreateCampaign}
        onNavigateToFinder={() => onNavigateToTab('finder')}
        onNavigateToSettings={() => onNavigateToTab('settings')}
        onNavigateToCompanyProfile={() => onNavigateToTab('settings')}
        onNavigateToLeads={() => onNavigateToTab('leads')}
      />

      {/* Today's Priorities */}
      {(() => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const needResponse = dbLeads.filter(l => l.status === 'replied' && new Date(l.updated_at!) < oneDayAgo).length;
        const followUpsDue = dbLeads.filter(l => l.status === 'contacted' && new Date(l.updated_at!) < threeDaysAgo).length;
        const interviewsThisWeek = dbLeads.filter(l => l.status === 'interview_scheduled').length;
        const staleLeads = dbLeads.filter(l => new Date(l.updated_at!) < sevenDaysAgo && !['hired', 'lost'].includes(l.status || '')).length;
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
                  onClick={() => { if (card.status) setStatusFilterFromStats(card.status); onNavigateToTab('leads'); }}
                  className={cn(
                    'bg-card border rounded-lg p-5 text-left transition-colors duration-150 hover:border-muted-foreground/30',
                    card.border
                  )}
                  style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}
                >
                  <div className="mb-3">{card.icon}</div>
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

      {/* This Week */}
      <div className="mb-8 animate-fade-in">
        <div className="section-header">
          <h2 className="section-title">This Week</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Candidates Found', value: candidatesFoundThisWeek, icon: <Search className="w-4 h-4 text-primary" /> },
            { label: 'Emails Sent', value: emailsSentThisWeek, icon: <MessageSquare className="w-4 h-4 text-primary" /> },
            { label: 'Replies', value: repliesThisWeek, icon: <Reply className="w-4 h-4 text-primary" /> },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card border border-border rounded-lg p-5 flex items-center gap-4"
              style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  onClick={() => { if (stage.status) setStatusFilterFromStats(stage.status); onNavigateToTab('leads'); }}
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
          onClick={() => { setStatusFilterFromStats(null); onNavigateToTab('leads'); }}
        />
        <StatCard
          title="Contacted"
          value={stats.contacted}
          change={stats.contacted > 0 ? 'Outreach sent' : 'Ready to contact'}
          changeType="positive"
          visual="send"
          className="animate-fade-in stagger-2"
          onClick={() => { setStatusFilterFromStats('contacted'); onNavigateToTab('leads'); }}
        />
        <StatCard
          title="Replied"
          value={stats.replied}
          change={stats.replied > 0 ? 'Got responses' : 'Awaiting replies'}
          changeType="positive"
          visual="chat"
          className="animate-fade-in stagger-3"
          onClick={() => { setStatusFilterFromStats('replied'); onNavigateToTab('leads'); }}
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
            <Button variant="outline" size="sm" onClick={() => onNavigateToTab('campaigns')} className="rounded-md">
              View All →
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.slice(0, 4).map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onUpdate={loadData}
                onViewLeads={onViewCampaignLeads}
                onFindMoreLeads={onFindMoreLeads}
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
          <Button onClick={onCreateCampaign} size="lg" className="rounded-md px-6">
            Create Your First Job Opening →
          </Button>
        </div>
      )}
    </div>
  );
}
