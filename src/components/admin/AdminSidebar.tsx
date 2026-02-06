import { cn } from '@/lib/utils';
import { GlowDot, AbstractBlob } from '../ui/visual-elements';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  MessageSquare,
  TrendingUp,
  CreditCard,
  ArrowLeft,
  Settings,
  Target,
  Mail,
  Send,
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats?: {
    contactSubmissions?: { new: number };
    overview?: { totalUsers: number };
  };
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3, visual: 'bars' },
  { id: 'users', label: 'Users', icon: Users, visual: 'dots' },
  { id: 'emails', label: 'Emails', icon: Send, visual: 'mail' },
  { id: 'contacts', label: 'Contacts', icon: MessageSquare, visual: 'pulse', hasNotification: true },
  { id: 'revenue', label: 'Revenue', icon: CreditCard, visual: 'arrow' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, visual: 'chart' },
  { id: 'settings', label: 'Settings', icon: Settings, visual: 'gear' },
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
    case 'chart':
      return (
        <div className="w-5 h-5 relative flex items-end justify-center gap-0.5">
          <div className={cn('w-1 rounded-t-full transition-all', active ? 'h-3 bg-primary' : 'h-2 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-t-full transition-all', active ? 'h-5 bg-primary' : 'h-4 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-t-full transition-all', active ? 'h-2 bg-primary' : 'h-1.5 bg-muted-foreground/60')} />
          <div className={cn('w-1 rounded-t-full transition-all', active ? 'h-4 bg-primary' : 'h-3 bg-muted-foreground/60')} />
        </div>
      );
    case 'mail':
      return (
        <div className="w-5 h-5 relative flex items-center justify-center">
          <div className={cn('w-4 h-3 rounded-sm border-2 transition-all', active ? 'border-primary' : 'border-muted-foreground/60')} />
          <div className={cn('absolute w-2 h-1.5 top-1 border-l-2 border-r-2 rotate-0 transition-all', active ? 'border-primary' : 'border-muted-foreground/60')} style={{ borderBottom: 'none', borderTop: 'none', transform: 'rotate(0deg) translateY(-1px)' }} />
        </div>
      );
    case 'gear':
      return (
        <div className="w-5 h-5 relative flex items-center justify-center">
          <div className={cn('w-3 h-3 rounded-full border-2 transition-all', active ? 'border-primary' : 'border-muted-foreground/60')} />
          <div className={cn('absolute w-1 h-1 rounded-full transition-all', active ? 'bg-primary' : 'bg-muted-foreground/60')} />
        </div>
      );
    default:
      return null;
  }
}

export function AdminSidebar({ activeTab, onTabChange, stats }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const newContacts = stats?.contactSubmissions?.new || 0;

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-7 border-b border-sidebar-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/25 animate-pulse-glow">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <GlowDot className="absolute -top-0.5 -right-0.5 w-3 h-3" color="success" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Admin</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] px-5 mb-4">Management</p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.id === 'contacts' && newContacts > 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'nav-item group relative',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <NavVisual type={item.visual} active={isActive} />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="absolute right-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {newContacts}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] px-5 mb-4">Quick Actions</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="nav-item nav-item-inactive group"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
            <span className="flex-1 text-left">Back to App</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-5 border-t border-sidebar-border space-y-4">
        {/* Stats Card */}
        <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 opacity-30">
            <AbstractBlob className="w-full h-full" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Admin Panel</p>
              <span className="text-xs text-emerald-400 font-semibold tracking-wide">ACTIVE</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overview?.totalUsers || 0} total users
            </p>
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
