import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Mail,
  Search,
  MessageSquare,
  CheckCircle,
  Send,
  Clock,
  User,
  LayoutTemplate,
  Zap,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { PlanDistributionChart } from '@/components/admin/PlanDistributionChart';
import { TimeSeriesChart } from '@/components/admin/TimeSeriesChart';
import { LeadStatusChart } from '@/components/admin/LeadStatusChart';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { EmailTemplateEditor } from '@/components/admin/EmailTemplateEditor';
import { EmailSequenceManager } from '@/components/admin/EmailSequenceManager';
import { EmailHistoryTable } from '@/components/admin/EmailHistoryTable';
import { PlatformSettings } from '@/components/admin/PlatformSettings';
import {
  PulseOrb,
  SparkBurst,
  TargetRings,
  DataFlow,
  StackedBars,
  ChatBubbles,
} from '@/components/ui/visual-elements';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Animated stat card with glassmorphism
function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  visual: Visual,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  visual?: React.ComponentType<{ className?: string }>;
  trend?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="stat-card group"
    >
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 pt-1">
              <TrendingUp className={`h-3.5 w-3.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <div className="visual-badge">
          {Visual ? (
            <Visual className="w-7 h-7" />
          ) : Icon ? (
            <Icon className="w-6 h-6 text-primary" />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// Section wrapper with animation
function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// User row component
function UserRow({ user, index }: { user: any; index: number }) {
  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    starter: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    growth: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    scale: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="lead-row flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/30"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
        {user.fullName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{user.fullName || 'No name'}</p>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>
      <Badge className={`${planColors[user.plan] || planColors.free} capitalize border`}>
        {user.plan}
      </Badge>
      <div className="text-right">
        <p className="text-sm font-medium">{user.creditsUsed}/{user.creditsLimit}</p>
        <p className="text-xs text-muted-foreground">credits</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{user.leadCount}</p>
        <p className="text-xs text-muted-foreground">leads</p>
      </div>
    </motion.div>
  );
}

// Contact submission card
function ContactCard({ contact, index, onMarkRead }: { contact: any; index: number; onMarkRead: (id: string) => void }) {
  const isNew = contact.status === 'new';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`relative p-5 rounded-2xl border ${isNew ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card/30'} transition-all hover:border-primary/40`}
    >
      {isNew && (
        <div className="absolute top-4 right-4">
          <span className="flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {contact.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-foreground">{contact.name}</p>
            {contact.company && (
              <span className="text-sm text-muted-foreground">• {contact.company}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{contact.email}</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{contact.message}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {format(new Date(contact.created_at), 'MMM d, yyyy • h:mm a')}
            </span>
            {isNew && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(contact.id);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Outreach message card
function OutreachCard({ message, index }: { message: any; index: number }) {
  const isSent = message.status === 'sent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="p-5 rounded-2xl border border-border/50 bg-card/30 transition-all hover:border-primary/40"
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSent ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted border border-border'}`}>
          {isSent ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Clock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-foreground truncate">{message.subject || 'No subject'}</p>
            <Badge className={isSent ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>
              {message.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            To: {message.leads?.name || 'Unknown'} ({message.leads?.email || 'No email'})
          </p>
          <p className="text-sm text-foreground/70 line-clamp-2">{message.body}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs text-muted-foreground">
              {message.sent_at 
                ? format(new Date(message.sent_at), 'MMM d, yyyy • h:mm a')
                : format(new Date(message.created_at), 'MMM d, yyyy • h:mm a')}
            </span>
            {message.leads?.company && (
              <span className="text-xs text-primary">{message.leads.company}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, session } = useAuth();
  const { isAdmin, loading, stats, refetch } = useAdminCheck();
  const { appName } = useBrandConfig();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Show loading while auth or admin check is in progress
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="apple-spinner" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in (after loading complete)
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Will redirect via useAdminCheck if not admin
  if (!isAdmin || !stats) {
    return null;
  }

  const handleSendEmail = async () => {
    if (!emailRecipient || !emailSubject || !emailBody) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all email fields.',
        variant: 'destructive',
      });
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-email', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          to: emailRecipient,
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br>'),
        },
      });

      if (error) throw error;

      toast({
        title: 'Email sent!',
        description: `Successfully sent to ${emailRecipient}`,
      });
      setShowComposeEmail(false);
      setEmailRecipient('');
      setEmailSubject('');
      setEmailBody('');
    } catch (error) {
      console.error('Send email error:', error);
      toast({
        title: 'Failed to send',
        description: 'Please try again or check the Resend configuration.',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status: 'read' })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Marked as read",
        description: "Contact submission updated.",
      });
      refetch();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: "Error",
        description: "Failed to update submission.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'emails':
        return (
          <motion.div
            key="emails"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Email Marketing</h2>
                <p className="text-sm text-muted-foreground">
                  Manage templates, sequences, and send emails to users
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowComposeEmail(true)} className="apple-button">
                  <Send className="mr-2 h-4 w-4" />
                  Quick Send
                </Button>
                <Button onClick={refetch} className="apple-button-secondary h-10">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <Tabs defaultValue="history" className="space-y-6">
              <TabsList className="bg-card/50 border border-border/50">
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Email History
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="sequences" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Sequences
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="history">
                <EmailHistoryTable />
              </TabsContent>
              
              <TabsContent value="templates">
                <EmailTemplateEditor />
              </TabsContent>
              
              <TabsContent value="sequences">
                <EmailSequenceManager />
              </TabsContent>
            </Tabs>
          </motion.div>
        );

      case 'contacts':
        return (
          <motion.div
            key="contacts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Contact Submissions</h2>
                <p className="text-sm text-muted-foreground">
                  {stats.contactSubmissions?.new || 0} new • {stats.contactSubmissions?.total || 0} total
                </p>
              </div>
              <Button onClick={refetch} className="apple-button-secondary h-10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.contactSubmissions?.items?.map((contact: any, index: number) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  index={index}
                  onMarkRead={handleMarkRead}
                />
              ))}
              {(!stats.contactSubmissions?.items || stats.contactSubmissions.items.length === 0) && (
                <div className="col-span-2 stat-card p-12 flex flex-col items-center justify-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No contact submissions yet</p>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'users':
        return (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">All Users</h2>
                <p className="text-sm text-muted-foreground">{stats.users.length} registered users</p>
              </div>
              <Button onClick={refetch} className="apple-button-secondary h-10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="stat-card p-6">
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {stats.users.map((userItem: any, index: number) => (
                  <UserRow key={userItem.id} user={userItem} index={index} />
                ))}
                {stats.users.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No users yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'revenue':
        return (
          <motion.div
            key="revenue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Revenue</h2>
                <p className="text-sm text-muted-foreground">Financial overview</p>
              </div>
              <Button onClick={refetch} className="apple-button-secondary h-10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AdminStatCard
                title="Monthly Revenue"
                value={`$${stats.overview.mrr.toLocaleString()}`}
                subtitle={`${stats.subscriptions.paidUsers} paid subscribers`}
                icon={DollarSign}
                delay={0}
              />
              <AdminStatCard
                title="Paid Users"
                value={stats.subscriptions.paidUsers}
                subtitle={`${stats.subscriptions.conversionRate}% conversion`}
                visual={SparkBurst}
                delay={0.1}
              />
              <AdminStatCard
                title="Credits Sold"
                value={stats.credits.totalUsed.toLocaleString()}
                subtitle={`${stats.credits.utilizationRate}% utilization`}
                visual={DataFlow}
                delay={0.2}
              />
            </div>
            <div className="stat-card p-6">
              <AdminSection title="Plan Distribution" description="Breakdown by subscription tier">
                <PlanDistributionChart planCounts={stats.subscriptions.planCounts} />
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">{stats.subscriptions.planCounts.free}</p>
                    <p className="text-xs text-muted-foreground">Free</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{stats.subscriptions.planCounts.starter}</p>
                    <p className="text-xs text-muted-foreground">Starter</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{stats.subscriptions.planCounts.growth}</p>
                    <p className="text-xs text-muted-foreground">Growth</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{stats.subscriptions.planCounts.scale}</p>
                    <p className="text-xs text-muted-foreground">Scale</p>
                  </div>
                </div>
              </AdminSection>
            </div>
          </motion.div>
        );

      case 'analytics':
        return (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
                <p className="text-sm text-muted-foreground">Performance metrics over time</p>
              </div>
              <Button onClick={refetch} className="apple-button-secondary h-10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <Tabs defaultValue="growth" className="space-y-4">
              <TabsList className="bg-card/50 border border-border/50">
                <TabsTrigger value="growth">User Growth</TabsTrigger>
                <TabsTrigger value="leads">Lead Generation</TabsTrigger>
                <TabsTrigger value="credits">Credit Usage</TabsTrigger>
              </TabsList>
              <TabsContent value="growth" className="stat-card p-6">
                <AdminSection title="User Signups" description="New users over the last 30 days">
                  <TimeSeriesChart
                    data={stats.charts.dailySignups}
                    color="hsl(330, 100%, 63%)"
                    gradientId="signupsGradient"
                  />
                </AdminSection>
              </TabsContent>
              <TabsContent value="leads" className="stat-card p-6">
                <AdminSection title="Leads Found" description="Leads generated over the last 30 days">
                  <TimeSeriesChart
                    data={stats.charts.dailyLeads}
                    color="hsl(160, 70%, 42%)"
                    gradientId="leadsGradient"
                  />
                </AdminSection>
              </TabsContent>
              <TabsContent value="credits" className="stat-card p-6">
                <AdminSection title="Credits Consumed" description="Credit usage over the last 30 days">
                  <TimeSeriesChart
                    data={stats.charts.dailyCredits}
                    color="hsl(280, 87%, 65%)"
                    gradientId="creditsGradient"
                  />
                </AdminSection>
              </TabsContent>
            </Tabs>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="stat-card p-6">
                <AdminSection title="Lead Funnel" description="Leads by status">
                  <LeadStatusChart statusCounts={stats.leads.statusCounts} />
                </AdminSection>
              </div>
              {stats.topUsers.byLeads.length > 0 && (
                <div className="stat-card p-6">
                  <AdminSection title="Top Users by Leads" description="Most active lead generators">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {stats.topUsers.byLeads.slice(0, 4).map((topUser: any, index: number) => (
                        <motion.div
                          key={topUser.userId}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 p-4"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-sm font-bold text-primary">
                            #{index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{topUser.fullName || topUser.email}</p>
                            <p className="text-xs text-primary">{topUser.leadCount} leads</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AdminSection>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PlatformSettings />
          </motion.div>
        );

      default: // overview
        return (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Overview</h2>
                <p className="text-sm text-muted-foreground">
                  Updated {format(new Date(stats.generatedAt), 'h:mm a')}
                </p>
              </div>
              <Button onClick={refetch} className="apple-button-secondary h-10">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="Total Users"
                value={stats.overview.totalUsers}
                subtitle={`+${stats.overview.usersLast7Days} this week`}
                trend={stats.overview.userGrowthRate}
                visual={PulseOrb}
                delay={0}
              />
              <AdminStatCard
                title="Monthly Revenue"
                value={`$${stats.overview.mrr.toLocaleString()}`}
                subtitle={`${stats.subscriptions.paidUsers} paid subscribers`}
                icon={DollarSign}
                delay={0.1}
              />
              <AdminStatCard
                title="Total Leads"
                value={stats.overview.totalLeads.toLocaleString()}
                subtitle={`+${stats.overview.leadsLast7Days} this week`}
                visual={TargetRings}
                delay={0.2}
              />
              <AdminStatCard
                title="Conversion Rate"
                value={`${stats.subscriptions.conversionRate}%`}
                subtitle="Free to Paid"
                visual={SparkBurst}
                delay={0.3}
              />
            </div>

            {/* Contact Submissions - Prominent Section */}
            {stats.contactSubmissions && stats.contactSubmissions.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="action-card p-6 cursor-pointer hover:border-primary/40 transition-all"
                onClick={() => setActiveTab('contacts')}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="visual-badge">
                      <ChatBubbles className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Contact Submissions</h3>
                      <p className="text-sm text-muted-foreground">
                        {stats.contactSubmissions.new} new • {stats.contactSubmissions.total} total
                      </p>
                    </div>
                  </div>
                  {stats.contactSubmissions.new > 0 && (
                    <Badge className="bg-primary/20 text-primary border border-primary/30">
                      {stats.contactSubmissions.new} New
                    </Badge>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {stats.contactSubmissions.items.slice(0, 2).map((contact: any, index: number) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      index={index}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Secondary Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStatCard
                title="Active Campaigns"
                value={stats.overview.activeCampaigns}
                subtitle={`${stats.campaigns.total} total`}
                visual={StackedBars}
                delay={0.5}
              />
              <AdminStatCard
                title="Emails Sent"
                value={stats.campaigns.emailsSent.toLocaleString()}
                subtitle={`${stats.campaigns.replyRate}% reply rate`}
                icon={Mail}
                delay={0.6}
              />
              <AdminStatCard
                title="Searches"
                value={stats.searches.completed}
                subtitle={`${stats.searches.processing} processing`}
                icon={Search}
                delay={0.7}
              />
              <AdminStatCard
                title="Credits Used"
                value={stats.credits.totalUsed.toLocaleString()}
                subtitle={`${stats.credits.utilizationRate}% utilization`}
                visual={DataFlow}
                delay={0.8}
              />
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        stats={stats}
      />
      
      {/* Main Content */}
      <div className="flex-1 pl-72">
        {/* Background effects */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)_/_0.05)_0%,_transparent_50%)] pointer-events-none" />
        <div className="fixed top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <main className="relative z-10 p-8 space-y-8">
          {renderContent()}
        </main>
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={showComposeEmail} onOpenChange={setShowComposeEmail}>
        <DialogContent className="sm:max-w-lg apple-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Send Email to Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-recipient">Recipient Email</Label>
              <Input
                id="email-recipient"
                placeholder="user@example.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="apple-input"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address of the user you want to contact
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder={`Welcome to ${appName}!`}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="apple-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your message here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="apple-input min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowComposeEmail(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={sendingEmail}
              className="apple-button"
            >
              {sendingEmail ? (
                <>
                  <div className="apple-spinner w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
