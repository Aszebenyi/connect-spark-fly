import { format } from 'date-fns';
import { User, Target, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  type: 'signup' | 'lead' | 'search';
  title: string;
  subtitle?: string;
  timestamp: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
}

const activityIcons = {
  signup: User,
  lead: Target,
  search: Search,
};

const activityColors = {
  signup: 'bg-blue-500/10 text-blue-500',
  lead: 'bg-emerald-500/10 text-emerald-500',
  search: 'bg-purple-500/10 text-purple-500',
};

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type];
        return (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border bg-card/50 p-3 transition-colors hover:bg-card"
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                activityColors[activity.type]
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-sm">{activity.title}</p>
              {activity.subtitle && (
                <p className="truncate text-xs text-muted-foreground">
                  {activity.subtitle}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
