import { useState } from 'react';
import { Campaign, updateCampaign, deleteCampaign } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLeadSubscription } from '@/hooks/useLeadSubscription';
import { Search, Users, MoreVertical, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate?: () => void;
  onViewLeads?: (campaign: Campaign) => void;
  onFindMoreLeads?: (campaign: Campaign) => void;
  className?: string;
}

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-success/10 text-success border border-success/20' },
  paused: { label: 'Paused', className: 'bg-warning/10 text-warning border border-warning/20' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground' },
  searching: { label: 'Searching...', className: 'bg-primary/10 text-primary border border-primary/20' },
};

export function CampaignCard({ campaign, onUpdate, onViewLeads, onFindMoreLeads, className }: CampaignCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const { newLeadsCount, latestLead } = useLeadSubscription({
    campaignId: campaign.id,
    enabled: campaign.status === 'searching',
    onLeadArrived: () => onUpdate?.(),
  });

  const isSearching = campaign.status === 'searching';
  const hasNewLeads = newLeadsCount > 0;
  
  const displayStatus = campaign.status as keyof typeof statusConfig;
  const status = statusConfig[displayStatus] || statusConfig.draft;

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign.id) return;
    setIsUpdating(true);
    try {
      const result = await updateCampaign(campaign.id, { status: newStatus });
      if (result.success) {
        toast({ title: `Campaign ${newStatus}` });
        onUpdate?.();
      } else {
        toast({ title: 'Failed to update', variant: 'destructive' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign.id) return;
    setIsUpdating(true);
    try {
      const result = await deleteCampaign(campaign.id);
      if (result.success) {
        toast({ title: 'Campaign deleted' });
        onUpdate?.();
      } else {
        toast({ title: 'Failed to delete', variant: 'destructive' });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const displayedLeadCount = (campaign.lead_count || 0) + newLeadsCount;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) return;
    onViewLeads?.(campaign);
  };

  return (
    <div 
      className={cn(
        'bg-card border border-border rounded-lg p-5 transition-colors duration-150 cursor-pointer hover:border-muted-foreground/30',
        className
      )}
      style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-foreground truncate flex-1 mr-2">{campaign.name}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className={cn('text-xs font-medium', status.className)}>
            {status.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreVertical className="w-3.5 h-3.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {campaign.status !== 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>Activate</DropdownMenuItem>
              )}
              {campaign.status === 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('paused')}>Pause</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleStatusChange('completed')}>Mark Complete</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {campaign.created_at && (
        <p className="text-xs text-muted-foreground mb-4">
          Created {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Live Search Banner */}
      {(isSearching || hasNewLeads) && (
        <div className={cn(
          "mb-4 p-3 rounded-md border text-sm",
          hasNewLeads ? "bg-success/5 border-success/20 text-success" : "bg-primary/5 border-primary/20 text-primary"
        )}>
          {hasNewLeads ? (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-medium">{newLeadsCount} new lead{newLeadsCount !== 1 ? 's' : ''} found</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching for candidates...</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-4">
        <p className="text-lg font-semibold text-foreground">{displayedLeadCount} candidates</p>
      </div>

      {/* Actions */}
      {onFindMoreLeads && !isSearching && (
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-md gap-2 w-full text-sm"
          onClick={() => onFindMoreLeads(campaign)}
        >
          <Search className="w-3.5 h-3.5" />
          Find More Candidates
        </Button>
      )}
    </div>
  );
}
