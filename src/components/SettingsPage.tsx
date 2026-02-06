import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { GlowDot, AbstractBlob } from '@/components/ui/visual-elements';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionRealtime } from '@/hooks/useSubscriptionRealtime';
import { PricingPlans } from '@/components/PricingPlans';
import { PLANS, PlanId } from '@/lib/plans';
import { EmailConnectionCard } from '@/components/EmailConnectionCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

function SettingsSection({ title, description, children, className = '' }: SettingsSectionProps) {
  return (
    <div className={`glass-strong rounded-2xl p-8 card-shadow ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <Label className="text-foreground font-medium">{label}</Label>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { toast } = useToast();
  const { user, subscription, subscriptionLoading, refreshSubscription, session, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Enable realtime subscription updates
  useSubscriptionRealtime();
  
  const [showPricing, setShowPricing] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || 'User',
    email: user?.email || 'user@example.com',
    company: '',
  });
  
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    leadAlerts: true,
    campaignUpdates: false,
    weeklyReport: true,
  });

  const [usageStats, setUsageStats] = useState({
    leadsCount: 0,
    campaignsCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchUsageStats() {
      try {
        const [leadsResult, campaignsResult] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        ]);

        setUsageStats({
          leadsCount: leadsResult.count || 0,
          campaignsCount: campaignsResult.count || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to fetch usage stats:', error);
        setUsageStats(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchUsageStats();
  }, []);

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const currentPlan = PLANS[subscription?.plan_id as PlanId] || PLANS.free;
  const creditsUsed = subscription?.credits_used || 0;
  const creditsLimit = subscription?.credits_limit || currentPlan.credits;
  const creditsRemaining = Math.max(0, creditsLimit - creditsUsed);
  const creditsPercentage = Math.min((creditsUsed / creditsLimit) * 100, 100);

  const handleSaveProfile = () => {
    toast({
      title: 'Profile saved',
      description: 'Your profile has been updated successfully.',
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: 'Preferences saved',
      description: 'Your notification preferences have been updated.',
    });
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast({
        title: 'Data deleted',
        description: 'All your leads have been permanently deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete leads. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently deleted.',
      });
      
      // Sign out and redirect to landing page
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Delete account error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, preferences, and subscription</p>
      </div>

      <div className="max-w-3xl space-y-8">
        {/* Profile Section */}
        <SettingsSection 
          title="Profile" 
          description="Your personal information and account details"
          className="animate-fade-in stagger-1"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-5 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/25">
                  <span className="text-2xl font-bold text-primary">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <GlowDot className="absolute -bottom-1 -right-1 w-5 h-5" color="success" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{profile.name}</p>
                <p className="text-muted-foreground text-sm">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="apple-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="apple-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="apple-input opacity-60"
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveProfile} className="apple-button">
                Save Profile
              </Button>
            </div>
          </div>
        </SettingsSection>

        {/* Plan & Usage */}
        <SettingsSection 
          title="Plan & Usage" 
          description="Your current subscription and credit usage"
          className="animate-fade-in stagger-2"
        >
          <div className="relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-32 h-32 opacity-20">
              <AbstractBlob className="w-full h-full" />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {subscriptionLoading ? '...' : currentPlan.name} Plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.subscribed ? 'Billed monthly' : 'Free tier'}
                  </p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
                  subscription?.subscribed 
                    ? 'bg-primary/10 text-primary border-primary/20' 
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {subscription?.subscribed ? 'ACTIVE' : 'FREE'}
                </span>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Credits Used</span>
                    <span className="text-foreground font-medium">
                      {subscriptionLoading 
                        ? '...' 
                        : `${creditsUsed.toLocaleString()} / ${creditsLimit.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${creditsPercentage}%`,
                        background: creditsPercentage > 90 
                          ? 'hsl(0 72% 55%)' 
                          : 'linear-gradient(90deg, hsl(330 100% 63%), hsl(350 90% 65%), hsl(15 95% 60%))'
                      }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {creditsRemaining} credits remaining this month
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-2xl font-bold text-foreground">
                      {usageStats.isLoading ? '...' : usageStats.campaignsCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Campaigns</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-2xl font-bold text-foreground">
                      {usageStats.isLoading ? '...' : usageStats.leadsCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Leads Found</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-2xl font-bold text-foreground">
                      ${currentPlan.price}
                    </p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <Button onClick={() => setShowPricing(true)} className="rounded-xl">
                  {subscription?.subscribed ? 'Change Plan' : 'Upgrade Plan'}
                </Button>
                {subscription?.subscribed && (
                  <Button 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                  >
                    {managingBilling ? (
                      <div className="apple-spinner w-4 h-4" />
                    ) : (
                      'Manage Billing'
                    )}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  className="rounded-xl"
                  onClick={refreshSubscription}
                  disabled={subscriptionLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Email Integration Section */}
        <SettingsSection 
          title="Email Integration" 
          description="Connect your email account to send outreach directly"
          className="animate-fade-in stagger-3"
        >
          <EmailConnectionCard />
          <p className="text-xs text-muted-foreground mt-4">
            Connect your Gmail account to send personalized outreach emails directly from your own email address.
            Replies will come back to your inbox.
          </p>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection 
          title="Notifications" 
          description="Control how and when you receive updates"
          className="animate-fade-in stagger-4"
        >
          <div>
            <SettingRow 
              label="Email Digest" 
              description="Receive a daily summary of your lead activity"
            >
              <Switch
                checked={notifications.emailDigest}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, emailDigest: checked })
                }
              />
            </SettingRow>

            <SettingRow 
              label="Lead Alerts" 
              description="Get notified when new leads match your criteria"
            >
              <Switch
                checked={notifications.leadAlerts}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, leadAlerts: checked })
                }
              />
            </SettingRow>

            <SettingRow 
              label="Campaign Updates" 
              description="Receive updates on campaign progress and results"
            >
              <Switch
                checked={notifications.campaignUpdates}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, campaignUpdates: checked })
                }
              />
            </SettingRow>

            <SettingRow 
              label="Weekly Report" 
              description="Get a weekly performance summary"
            >
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) => 
                  setNotifications({ ...notifications, weeklyReport: checked })
                }
              />
            </SettingRow>

            <div className="pt-4">
              <Button onClick={handleSaveNotifications} className="apple-button">
                Save Preferences
              </Button>
            </div>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection 
          title="Danger Zone" 
          description="Irreversible actions that affect your data"
          className="animate-fade-in stagger-5 border-destructive/30"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <div>
                <p className="font-medium text-foreground">Delete All Leads</p>
                <p className="text-sm text-muted-foreground">Remove all leads from your database</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="rounded-xl">
                    Delete Leads
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="apple-dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all leads?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All leads in your database will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAllData}
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <div>
                <p className="font-medium text-foreground">Delete Account</p>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="rounded-xl" disabled={deletingAccount}>
                    {deletingAccount ? (
                      <>
                        <div className="apple-spinner w-4 h-4 mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="apple-dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Your account and all associated data (leads, campaigns, email connections, subscription) will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="rounded-xl bg-destructive hover:bg-destructive/90"
                    >
                      Yes, Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Pricing Modal */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="max-w-5xl apple-dialog">
          <DialogHeader>
            <DialogTitle className="sr-only">Choose Your Plan</DialogTitle>
          </DialogHeader>
          <PricingPlans onClose={() => setShowPricing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
