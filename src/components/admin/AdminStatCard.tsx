import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  className,
  variant = 'default',
}: AdminStatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary/10 border-primary/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
  };

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-emerald-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all duration-200 hover:shadow-md',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-muted/50 p-2.5">
            {icon}
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {getTrendIcon()}
          <span className={cn('text-sm font-medium', getTrendColor())}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
