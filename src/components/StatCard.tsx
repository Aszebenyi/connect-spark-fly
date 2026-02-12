import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  visual: 'users' | 'send' | 'chat' | 'trend';
  className?: string;
  onClick?: () => void;
}

function StatVisual({ type }: { type: string }) {
  switch (type) {
    case 'users':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative w-10 h-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 rounded-t-full bg-gradient-to-br from-primary/80 to-primary/40" />
          </div>
        </div>
      );
    case 'send':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-gradient-to-r from-primary to-primary/40 rounded-full" />
            </div>
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 border-r-[3px] border-t-[3px] border-primary rotate-45 rounded-tr-sm" />
          </div>
        </div>
      );
    case 'chat':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative w-10 h-10">
            <div className="absolute top-1 left-0 w-6 h-4 rounded-xl bg-primary/40 rounded-bl-none" />
            <div className="absolute bottom-1 right-0 w-6 h-4 rounded-xl bg-primary rounded-br-none" />
          </div>
        </div>
      );
    case 'trend':
      return (
        <div className="w-full h-full flex items-end justify-center pb-2 gap-1">
          <div className="w-1.5 h-4 rounded-full bg-primary/40" />
          <div className="w-1.5 h-6 rounded-full bg-primary/60" />
          <div className="w-1.5 h-5 rounded-full bg-primary/80" />
          <div className="w-1.5 h-8 rounded-full bg-primary" />
        </div>
      );
    default:
      return null;
  }
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  visual,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div className={cn('stat-card group', onClick && 'cursor-pointer', className)} onClick={onClick}>
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight leading-none">{value}</p>
          {change && (
            <div className="flex items-center gap-2 mt-4">
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                changeType === 'positive' && 'bg-success',
                changeType === 'negative' && 'bg-destructive',
                changeType === 'neutral' && 'bg-muted-foreground'
              )} />
              <p className={cn(
                'text-sm font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </p>
            </div>
          )}
        </div>
        <div className="visual-badge group-hover:scale-110 transition-transform duration-500">
          <StatVisual type={visual} />
        </div>
      </div>
    </div>
  );
}
