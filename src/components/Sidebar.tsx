import { cn } from '@/lib/utils';
import { GlowDot, AbstractBlob } from './ui/visual-elements';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { PLANS, PlanId } from '@/lib/plans';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', visual: 'bars' },
  { id: 'leads', label: 'Candidates', visual: 'dots' },
  { id: 'finder', label: 'Find Candidates', visual: 'pulse' },
  { id: 'campaigns', label: 'Job Openings', visual: 'arrow' },
  { id: 'settings', label: 'Settings', visual: 'gear' },
];

function NavVisual({ type, active }: { type: string; active: boolean }) {
  switch (type) {
    case 'bars':
      return (
        <div className="w-5 h-5 flex items-end justify-center gap-0.5">
          <div className={cn('w-1 rounded-full transition-all', active ? 'h-2 bg-primary' : 'h-1.5 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-full transition-all', active ? 'h-4 bg-primary' : 'h-3 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-full transition-all', active ? 'h-3 bg-primary' : 'h-2 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-full transition-all', active ? 'h-5 bg-primary' : 'h-4 bg-muted-foreground/60')} />
        </div>
      );
    case 'dots':
      return (
        <div className="w-5 h-5 grid grid-cols-2 gap-1 p-0.5">
          <div className={cn('rounded-full transition-all', active ? 'bg-primary' : 'bg-muted-foreground/60')} />
          <div className={cn('rounded-full transition-all', active ? 'bg-primary/70' : 'bg-muted-foreground/40')} />
          <div className={cn('rounded-full transition-all', active ? 'bg-primary/70' : 'bg-muted-foreground/40')} />
          <div className={cn('rounded-full transition-all', active ? 'bg-primary' : 'bg-muted-foreground/60')} />
        </div>
      );
    case 'pulse':
      return (
        <div className="w-5 h-5 relative flex items-center justify-center">
          <div className={cn('w-2.5 h-2.5 rounded-full transition-all', active ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-muted-foreground/60')} />
          {active && <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />}
        </div>
      );
    case 'arrow':
      return (
        <div className="w-5 h-5 relative">
          <div className={cn('absolute top-1/2 left-0 w-3 h-0.5 rounded-full -translate-y-1/2 transition-all', active ? 'bg-primary' : 'bg-muted-foreground/60')} />
          <div className={cn('absolute top-1/2 right-0.5 w-2 h-2 border-r-2 border-t-2 rotate-45 -translate-y-1/2 transition-all', active ? 'border-primary' : 'border-muted-foreground/60')} />
        </div>
      );
    case 'gear':
      return (
        <div className="w-5 h-5 relative flex items-center justify-center">
          <div className={cn('w-2.5 h-2.5 rounded-full border-2 transition-all', active ? 'border-primary' : 'border-muted-foreground/60')} />
          {[0, 60, 120].map((deg) => (
            <div
              key={deg}
              className={cn('absolute w-full h-0.5 rounded-full transition-all', active ? 'bg-primary' : 'bg-muted-foreground/60')}
              style={{ transform: `rotate(${deg}deg)`, width: '100%' }}
            />
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, subscription, subscriptionLoading, signOut } = useAuth();
  const { appName, tagline } = useBrandConfig();
  const navigate = useNavigate();

  const currentPlan = PLANS[subscription?.plan_id as PlanId] || PLANS.free;
  const creditsUsed = subscription?.credits_used || 0;
  const creditsLimit = subscription?.credits_limit || currentPlan.credits;
  // Clamp percentage to 100% max (even if over limit)
  const creditsPercentage = creditsLimit > 0 ? Math.min((creditsUsed / creditsLimit) * 100, 100) : 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-7 border-b border-sidebar-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/25 animate-pulse-glow">
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-primary to-primary/60 rotate-45" />
            </div>
            <GlowDot className="absolute -top-0.5 -right-0.5 w-3 h-3" color="success" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{appName}</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{tagline}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] px-5 mb-4">Navigation</p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'nav-item group',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <NavVisual type={item.visual} active={isActive} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'finder' && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-5 border-t border-sidebar-border space-y-4">
        {/* Low Credit Warning */}
        {!subscriptionLoading && creditsLimit > 0 && (creditsLimit - creditsUsed) / creditsLimit <= 0.1 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <p className="text-xs text-destructive font-medium">
              {creditsUsed >= creditsLimit ? 'No credits remaining' : 'Low credits remaining'}
            </p>
            <button
              onClick={() => onTabChange('settings')}
              className="ml-auto text-xs text-destructive font-semibold hover:underline"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Plan Card */}
        <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 opacity-30">
            <AbstractBlob className="w-full h-full" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">
                {subscriptionLoading ? '...' : currentPlan.name}
              </p>
              {currentPlan.id !== 'free' && subscription?.subscribed ? (
                <span className="text-xs text-success font-semibold tracking-wide">ACTIVE</span>
              ) : (
                <button 
                  onClick={() => onTabChange('settings')}
                  className="text-xs text-primary font-semibold tracking-wide hover:underline"
                >
                  UPGRADE
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {subscriptionLoading 
                ? '...' 
                : `${creditsUsed.toLocaleString()} / ${creditsLimit.toLocaleString()} credits`}
            </p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700"
                style={{ 
                  width: `${creditsPercentage}%`,
                  background: creditsPercentage > 90 
                    ? 'hsl(0 72% 55%)' 
                    : 'linear-gradient(90deg, hsl(210 80% 50%), hsl(195 75% 45%), hsl(170 70% 42%))'
                }} 
              />
            </div>
          </div>
        </div>

        {/* User Info & Sign Out */}
        {user && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">
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
