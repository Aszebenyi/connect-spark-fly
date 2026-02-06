import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="rounded-xl">
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} className="rounded-xl">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
