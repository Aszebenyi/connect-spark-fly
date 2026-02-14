import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  visual?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div 
      className={cn(
        'bg-card border border-border rounded-lg p-6 transition-colors duration-200',
        onClick && 'cursor-pointer hover:border-muted-foreground/30',
        className
      )} 
      onClick={onClick}
      style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      <p className="text-3xl font-semibold text-foreground tracking-tight leading-none mb-1">{value}</p>
      {change && (
        <p className={cn(
          'text-xs mt-2',
          changeType === 'positive' && 'text-success',
          changeType === 'negative' && 'text-destructive',
          changeType === 'neutral' && 'text-muted-foreground'
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
