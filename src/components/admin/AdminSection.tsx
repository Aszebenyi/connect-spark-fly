import { cn } from '@/lib/utils';

interface AdminSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function AdminSection({
  title,
  description,
  children,
  className,
  action,
}: AdminSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
