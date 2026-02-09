import { useState } from 'react';
import { Lead } from '@/types/lead';
import { Campaign } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CheckCircle2, Download, Users, Search, Sparkles, ShieldCheck } from 'lucide-react';
import { exportLeadsToCSV } from '@/lib/csv-export';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LeadTableProps {
  leads: Lead[];
  campaigns?: Campaign[];
  selectedCampaignId?: string | null;
  onCampaignFilterChange?: (campaignId: string | null) => void;
  onLeadClick: (lead: Lead) => void;
  onStatusChange?: (leadId: string, status: string) => void;
  onDelete?: (leadId: string) => void;
  onCreateCampaign?: () => void;
  onFindLeads?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-primary/15 text-primary border-primary/30' },
  contacted: { label: 'Contacted', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  responded: { label: 'Responded', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  replied: { label: 'Replied', color: 'bg-success/15 text-success border-success/30' },
  qualified: { label: 'Qualified', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  unqualified: { label: 'Unqualified', color: 'bg-muted text-muted-foreground border-border' },
  lost: { label: 'Lost', color: 'bg-destructive/15 text-destructive border-destructive/30' },
};

// Healthcare data helpers
function getProfileField(lead: Lead, field: string): string | null {
  const pd = lead.profile_data || lead.profileData;
  if (!pd) return null;
  return pd[field] || null;
}

function getMatchScore(lead: Lead): number | null {
  const pd = lead.profile_data || lead.profileData;
  return pd?.match_score ?? null;
}

function parseBadgeList(val: string | null): string[] {
  if (!val) return [];
  return val.split(',').map((s: string) => s.trim()).filter(Boolean);
}

function getMatchScoreBadgeClass(score: number): string {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  if (score >= 50) return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  return 'bg-red-500/15 text-red-500 border-red-500/30';
}

export function LeadTable({ 
  leads, 
  campaigns,
  selectedCampaignId,
  onCampaignFilterChange,
  onLeadClick, 
  onStatusChange, 
  onDelete,
  onCreateCampaign,
  onFindLeads,
}: LeadTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('match_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast({
        title: 'No leads to export',
        description: 'There are no leads matching your current filters.',
        variant: 'destructive',
      });
      return;
    }

    const campaignName = selectedCampaign?.name?.replace(/\s+/g, '-').toLowerCase() || 'all-leads';
    exportLeadsToCSV(filteredLeads, campaignName);
    
    toast({
      title: 'Export complete',
      description: `Exported ${filteredLeads.length} leads to CSV.`,
    });
  };

  const filteredLeads = leads
    .filter(lead => {
      // Search filter
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === 'match_score') {
        const aScore = getMatchScore(a) ?? -1;
        const bScore = getMatchScore(b) ?? -1;
        return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
      }
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc' 
        ? String(aVal || '').localeCompare(String(bVal || ''))
        : String(bVal || '').localeCompare(String(aVal || ''));
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

  return (
    <div className="glass-strong rounded-2xl overflow-hidden card-shadow">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="search-input flex items-center gap-4 px-5 py-3 flex-1 max-w-md">
          <div className="w-4 h-4 relative flex-shrink-0">
            <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
            <div className="absolute bottom-0 right-0 w-1 h-1.5 bg-muted-foreground rounded-full rotate-45 origin-top" />
          </div>
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-auto"
          />
        </div>
        
        {/* Campaign Filter */}
        {campaigns && campaigns.length > 0 && onCampaignFilterChange && (
          <Select 
            value={selectedCampaignId || 'all'} 
            onValueChange={(val) => onCampaignFilterChange(val === 'all' ? null : val)}
          >
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent className="glass-strong">
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id || ''}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[150px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="glass-strong">
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Export Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2 rounded-xl"
          disabled={filteredLeads.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Campaign Info Banner */}
      {selectedCampaign && (
        <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
              Campaign
            </Badge>
            <span className="font-medium text-foreground">{selectedCampaign.name}</span>
            {selectedCampaign.search_query && (
              <span className="text-sm text-muted-foreground">
                · "{selectedCampaign.search_query}"
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onCampaignFilterChange?.(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">
                <button 
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Lead
                  <span className="text-[10px]">↕</span>
                </button>
              </th>
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">Employer</th>
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">License</th>
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">Certifications</th>
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">
                <button 
                  onClick={() => handleSort('match_score')}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Match Score
                  <span className="text-[10px]">↕</span>
                </button>
              </th>
              <th className="text-left p-5 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-right p-5 text-sm font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  {leads.length === 0 ? (
                    // No leads at all - encourage creating a campaign
                    <EmptyState
                      icon={<Users className="w-8 h-8" />}
                      title="No leads yet"
                      description="Create a campaign to start discovering potential customers using AI-powered search."
                      actionLabel={onCreateCampaign ? "Create Campaign" : undefined}
                      onAction={onCreateCampaign}
                      secondaryActionLabel={onFindLeads ? "Find Leads" : undefined}
                      onSecondaryAction={onFindLeads}
                    />
                  ) : searchQuery || statusFilter !== 'all' ? (
                    // Has leads but filters returned no results
                    <EmptyState
                      icon={<Search className="w-8 h-8" />}
                      title="No matching leads"
                      description="Try adjusting your search query or filters to find what you're looking for."
                      actionLabel="Clear Filters"
                      onAction={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    />
                  ) : selectedCampaignId ? (
                    // Viewing a campaign with no leads
                    <EmptyState
                      icon={<Sparkles className="w-8 h-8" />}
                      title="No leads in this campaign"
                      description="This campaign doesn't have any leads yet. Find more leads to add to it."
                      actionLabel={onFindLeads ? "Find Leads" : undefined}
                      onAction={onFindLeads}
                      secondaryActionLabel="View All Leads"
                      onSecondaryAction={() => onCampaignFilterChange?.(null)}
                    />
                  ) : (
                    // Fallback empty state
                    <EmptyState
                      icon={<Users className="w-8 h-8" />}
                      title="No leads found"
                      description="Start by creating a campaign to find leads."
                      actionLabel={onCreateCampaign ? "Create Campaign" : undefined}
                      onAction={onCreateCampaign}
                    />
                  )}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead, index) => {
                const status = statusConfig[lead.status] || statusConfig.new;
                return (
                  <tr 
                    key={lead.id} 
                    className={cn(
                      'lead-row border-b border-border/50 cursor-pointer',
                      'animate-fade-in opacity-0'
                    )}
                    style={{ animationDelay: `${index * 0.03}s` }}
                    onClick={() => onLeadClick(lead)}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        {/* Avatar with enrichment indicator */}
                        <div className="relative">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarImage 
                              src={(lead.profile_data || lead.profileData)?.linkedin?.profilePicture} 
                              alt={lead.name} 
                            />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Enriched indicator */}
                          {(lead.profile_data || lead.profileData)?.linkedin && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{lead.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{lead.title || 'No title'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div>
                        <p className="text-foreground">{lead.company || '-'}</p>
                        {lead.location && (
                          <p className="text-sm text-muted-foreground mt-0.5">{lead.location}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      {(() => {
                        const licenses = parseBadgeList(getProfileField(lead, 'licenses'));
                        return licenses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {licenses.map((lic) => (
                              <Badge key={lic} variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-primary/30 text-primary bg-primary/10">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                {lic}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </td>
                    <td className="p-5">
                      {(() => {
                        const certs = parseBadgeList(getProfileField(lead, 'certifications'));
                        return certs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {certs.map((cert) => (
                              <Badge key={cert} variant="secondary" className="text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </td>
                    <td className="p-5">
                      {(() => {
                        const score = getMatchScore(lead);
                        return score != null ? (
                          <Badge className={cn('border font-semibold', getMatchScoreBadgeClass(score))}>
                            {score}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        );
                      })()}
                    </td>
                    <td className="p-5">
                      <Badge className={cn('border font-medium', status.color)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                            <div className="flex flex-col gap-0.5">
                              <div className="w-1 h-1 rounded-full bg-current" />
                              <div className="w-1 h-1 rounded-full bg-current" />
                              <div className="w-1 h-1 rounded-full bg-current" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-strong border-border/80 w-48">
                          {lead.linkedin && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(lead.linkedin, '_blank');
                            }}>
                              View LinkedIn
                            </DropdownMenuItem>
                          )}
                          {onStatusChange && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(lead.id, 'contacted');
                              }}>
                                Mark Contacted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(lead.id, 'replied');
                              }}>
                                Mark Replied
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                onStatusChange(lead.id, 'qualified');
                              }}>
                                Mark Qualified
                              </DropdownMenuItem>
                            </>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(lead.id);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          Showing {filteredLeads.length} of {leads.length} leads
          {selectedCampaign && ` in "${selectedCampaign.name}"`}
        </p>
      </div>
    </div>
  );
}
