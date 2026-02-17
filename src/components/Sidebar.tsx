import { cn } from '@/lib/utils';
import medileadLogo from '@/assets/medilead-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { PLANS, PlanId } from '@/lib/plans';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Search, Users, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Job Openings', icon: Briefcase },
  { id: 'finder', label: 'Search', icon: Search },
  { id: 'leads', label: 'Candidates', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, subscription, subscriptionLoading, signOut } = useAuth();
  const { appName, tagline } = useBrandConfig();
  const navigate = useNavigate();

  const currentPlan = PLANS[subscription?.plan_id as PlanId] || PLANS.free;
  const creditsUsed = subscription?.credits_used || 0;
  const creditsLimit = subscription?.credits_limit || currentPlan.credits;
  const creditsPercentage = creditsLimit > 0 ? Math.min((creditsUsed / creditsLimit) * 100, 100) : 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <img src={medileadLogo} alt="MediLead" className="h-8 object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150',
                isActive 
                  ? 'bg-card text-primary border-l-2 border-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">

        {/* Low Credit Warning */}
        {!subscriptionLoading && creditsLimit > 0 && (creditsLimit - creditsUsed) / creditsLimit <= 0.1 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            <p className="text-xs text-destructive font-medium">
              {creditsUsed >= creditsLimit ? 'No credits remaining' : 'Low credits'}
            </p>
            <button
              onClick={() => onTabChange('settings')}
              className="ml-auto text-xs text-destructive font-medium hover:underline"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Plan Card */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {subscriptionLoading ? '...' : currentPlan.name}
            </p>
            {currentPlan.id !== 'free' && subscription?.subscribed ? (
              <span className="text-xs text-success font-medium">Active</span>
            ) : (
              <button 
                onClick={() => onTabChange('settings')}
                className="text-xs text-primary font-medium hover:underline"
              >
                Upgrade
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {subscriptionLoading 
              ? '...' 
              : `${creditsUsed.toLocaleString()} / ${creditsLimit.toLocaleString()} credits`}
          </p>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${creditsPercentage}%`,
                background: creditsPercentage > 90 
                  ? 'hsl(0 72% 55%)' 
                  : 'hsl(var(--primary))'
              }} 
            />
          </div>
        </div>

        {/* User Info & Sign Out */}
        {user && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
