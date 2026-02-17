import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { GlowDot, AbstractBlob } from '@/components/ui/visual-elements';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionRealtime } from '@/hooks/useSubscriptionRealtime';
import { PricingPlans } from '@/components/PricingPlans';
import { PLANS, PlanId } from '@/lib/plans';
import { EmailConnectionCard } from '@/components/EmailConnectionCard';
import { CompanyProfileTab } from '@/components/CompanyProfileTab';
import { COUNTRIES, CountryCode, getCurrencySymbol } from '@/lib/countries';

import { useEmailStats } from '@/hooks/useEmailStats';
import { AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

function SettingsSection({ title, description, children, className = '' }: SettingsSectionProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-8 shadow-sm ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

const settingsTabs = [
  { key: 'account' as const, label: 'Account' },
  { key: 'billing' as const, label: 'Billing' },
  { key: 'integrations' as const, label: 'Integrations' },
  { key: 'company' as const, label: 'Company Profile' },
];

type SettingsTab = 'account' | 'billing' | 'integrations' | 'company';

export function SettingsPage() {
  const { user, subscription, subscriptionLoading, refreshSubscription, session, signOut } = useAuth();
  const navigate = useNavigate();
  
  useSubscriptionRealtime();
  
  const { stats: emailStats, isLoading: emailStatsLoading } = useEmailStats();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [showPricing, setShowPricing] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || 'User',
    email: user?.email || 'user@example.com',
    company: '',
  });

  // Regional preferences
  const [country, setCountry] = useState<string>('US');
  
  // Email signature
  const [emailSignature, setEmailSignature] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureLoaded, setSignatureLoaded] = useState(false);
  
  const [usageStats, setUsageStats] = useState({
    leadsCount: 0,
    campaignsCount: 0,
    totalEmails: 0,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchUsageStats() {
      try {
        const [leadsResult, campaignsResult, messagesResult] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }),
          supabase.from('outreach_messages').select('id', { count: 'exact', head: true }),
        ]);

        setUsageStats({
          leadsCount: leadsResult.count || 0,
          campaignsCount: campaignsResult.count || 0,
          totalEmails: messagesResult.count || 0,
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

  // Load profile, regional prefs, and signature
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, company, base_country, currency, date_format, email_signature, include_signature')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setProfile(prev => ({
          ...prev,
          name: data.full_name || prev.name,
          company: data.company || '',
        }));
        if (data.base_country) setCountry(data.base_country);
        
        // Email signature
        if (data.email_signature != null) {
          setEmailSignature(data.email_signature);
        } else {
          // Auto-generate default
          const defaultSig = [
            data.full_name || user.user_metadata?.full_name || '',
            data.company || '',
            user.email || '',
          ].filter(Boolean).join('\n');
          setEmailSignature(defaultSig);
        }
        setIncludeSignature(data.include_signature ?? true);
        setSignatureLoaded(true);
      } else {
        setSignatureLoaded(true);
      }
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await supabase.auth.updateUser({
        data: { full_name: profile.name },
      });
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.name,
          company: profile.company,
          email: user.email,
        }, { onConflict: 'user_id' });
      toast.success('Your profile has been updated successfully.');
    } catch {
      toast.error('Error saving profile');
    }
  };

  const handleCountryChange = async (newCountry: string) => {
    setCountry(newCountry);
    if (!user) return;
    const countryData = COUNTRIES[newCountry as CountryCode];
    if (!countryData) return;
    try {
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          base_country: newCountry,
          currency: countryData.currency,
          date_format: countryData.dateFormat,
        }, { onConflict: 'user_id' });
      toast.success('Regional preferences updated');
    } catch {
      toast.error('Failed to save regional preferences');
    }
  };

  const handleSaveSignature = async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email_signature: emailSignature,
          include_signature: includeSignature,
        }, { onConflict: 'user_id' });
      toast.success('Email signature saved');
    } catch {
      toast.error('Failed to save signature');
    }
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
      toast.error('Failed to open billing portal');
    } finally {
      setManagingBilling(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast.success('All your leads have been permanently deleted.');
    } catch (error) {
      toast.error('Failed to delete leads. Please try again.');
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
      
      toast.success('Your account and all data have been permanently deleted.');
      
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const selectedCountryData = COUNTRIES[country as CountryCode];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, preferences, and subscription</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border mb-8">
        <nav className="flex gap-8">
          {settingsTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="max-w-3xl space-y-8">
          <SettingsSection 
            title="Profile" 
            description="Your personal information and account details"
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

          {/* Regional Preferences */}
          <SettingsSection
            title="Regional Preferences"
            description="Set your country for currency and date formatting"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={handleCountryChange}>
                  <SelectTrigger className="rounded-xl w-full max-w-xs">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRIES).map(([code, data]) => (
                      <SelectItem key={code} value={code}>
                        {data.flag} {data.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCountryData && (
                <p className="text-sm text-muted-foreground">
                  Currency: {selectedCountryData.currencySymbol} ({selectedCountryData.currency}) · Date format: {selectedCountryData.dateFormat}
                </p>
              )}
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection 
            title="Danger Zone" 
            description="Irreversible actions that affect your data"
            className="border-destructive/30"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="font-medium text-foreground">Delete All Leads</p>
                  <p className="text-sm text-muted-foreground">Remove all leads from your database</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="rounded-xl">Delete Leads</Button>
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
                      <AlertDialogAction onClick={handleDeleteAllData} className="rounded-xl bg-destructive hover:bg-destructive/90">
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
                        This will permanently delete your account, all leads, campaigns, and data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="rounded-xl bg-destructive hover:bg-destructive/90">
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="max-w-3xl space-y-8">
          <SettingsSection
            title="Current Plan"
            description="Your subscription and usage details"
          >
            {subscriptionLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subscription...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-semibold text-foreground">{currentPlan.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {subscription?.plan_id === 'free' ? 'Free' : 'Active'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{currentPlan.features[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${currentPlan.price}</p>
                    {currentPlan.price !== 0 && <p className="text-xs text-muted-foreground">/month</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits Used</span>
                    <span className="font-medium text-foreground">{creditsUsed} / {creditsLimit}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${creditsPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{creditsRemaining} credits remaining this period</p>
                </div>

                <div className="flex gap-3">
                  {subscription?.plan_id === 'free' ? (
                    <Button onClick={() => setShowPricing(true)} className="apple-button">
                      Upgrade Plan
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setShowPricing(true)} variant="outline" className="rounded-xl">
                        Change Plan
                      </Button>
                      <Button
                        onClick={handleManageBilling}
                        variant="outline"
                        className="rounded-xl"
                        disabled={managingBilling}
                      >
                        {managingBilling ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage Billing
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </SettingsSection>

          <SettingsSection
            title="Usage Statistics"
            description="Overview of your platform usage"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Total Candidates</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {usageStats.isLoading ? '...' : usageStats.leadsCount}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Job Openings</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {usageStats.isLoading ? '...' : usageStats.campaignsCount}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Emails Today</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {emailStatsLoading ? '...' : emailStats?.emails_sent_today ?? 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {usageStats.isLoading ? '...' : usageStats.totalEmails}
                </p>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="max-w-3xl space-y-8">
          <SettingsSection
            title="Email Connection"
            description="Connect your email to send outreach messages"
          >
            <EmailConnectionCard />
          </SettingsSection>

          <SettingsSection
            title="Email Signature"
            description="Appended to all outreach emails"
          >
            <div className="space-y-4">
              <Textarea
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                rows={6}
                placeholder={"John Smith | Senior Recruiter\nApex Healthcare Staffing\n(555) 123-4567"}
                className="rounded-xl"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={includeSignature}
                    onCheckedChange={setIncludeSignature}
                    id="include-signature"
                  />
                  <Label htmlFor="include-signature" className="text-sm text-muted-foreground cursor-pointer">
                    Include signature in emails
                  </Label>
                </div>
                <Button onClick={handleSaveSignature} className="apple-button">
                  Save Signature
                </Button>
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* Company Profile Tab */}
      {activeTab === 'company' && (
        <div className="max-w-3xl">
          <CompanyProfileTab />
        </div>
      )}

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
