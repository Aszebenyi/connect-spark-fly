import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { getCountryFlag } from '@/lib/countries';
import { Lead, Campaign, getOutreachMessages, OutreachMessage } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CheckCircle2, Download, Users, Search, Sparkles, ShieldCheck, X, Trash2, Plus, Mail, MessageCircle, Calendar, CheckCircle, Eye } from 'lucide-react';
import { exportLeadsToCSV } from '@/lib/csv-export';
import { EmailModal } from '@/components/EmailModal';
import { BulkEmailModal } from '@/components/BulkEmailModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface LeadCampaignAssignment {
  lead_id: string;
  campaign_id: string;
}

interface LeadTableProps {
  leads: Lead[];
  campaigns?: Campaign[];
  assignments?: LeadCampaignAssignment[];
  selectedCampaignId?: string | null;
  onCampaignFilterChange?: (campaignId: string | null) => void;
  onLeadClick: (lead: Lead) => void;
  onStatusChange?: (leadId: string, status: string) => void;
  onDelete?: (leadId: string) => void;
  onBulkDelete?: (leadIds: string[]) => void;
  onBulkAssign?: (leadIds: string[], campaignId: string) => void;
  onBulkRemove?: (leadIds: string[], campaignId: string) => void;
  onCreateCampaign?: () => void;
  onFindLeads?: () => void;
  initialStatusFilter?: string | null;
  onClearStatusFilter?: () => void;
  activeCampaign?: Campaign | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-muted text-muted-foreground border-border' },
  unqualified: { label: 'Unqualified', color: 'bg-muted text-muted-foreground border-border' },
  lost: { label: 'Lost', color: 'bg-muted text-muted-foreground border-border' },
  contacted: { label: 'Contacted', color: 'bg-primary/15 text-primary border-primary/30' },
  interview_scheduled: { label: 'Interview', color: 'bg-primary/15 text-primary border-primary/30' },
  offer_sent: { label: 'Offer Sent', color: 'bg-primary/15 text-primary border-primary/30' },
  replied: { label: 'Replied', color: 'bg-success/15 text-success border-success/30' },
  qualified: { label: 'Qualified', color: 'bg-success/15 text-success border-success/30' },
  hired: { label: 'Hired', color: 'bg-success/15 text-success border-success/30' },
};

// Healthcare data helpers
function getProfileData(lead: Lead): any {
  return lead.profile_data || {};
}

function getProfileField(lead: Lead, field: string): string | null {
  const pd = getProfileData(lead);
  return pd[field] || null;
}

function getMatchScore(lead: Lead): number | null {
  return getProfileData(lead)?.match_score ?? null;
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

function getEmployer(lead: Lead): string {
  const pd = getProfileData(lead);
  return lead.company || pd.company || pd.linkedin?.company || pd.linkedin?.latestCompany || '-';
}

function getEmploymentStatus(lead: Lead): { status: 'employed' | 'available'; employer: string | null } {
  const pd = getProfileData(lead);
  const employer = lead.company || pd.company || pd.linkedin?.company || pd.linkedin?.latestCompany || null;
  const isCurrentlyEmployed = employer && employer !== '-';
  return {
    status: isCurrentlyEmployed ? 'employed' : 'available',
    employer: isCurrentlyEmployed ? employer : null,
  };
}

function getLocation(lead: Lead): string {
  const pd = getProfileData(lead);
  return lead.location || pd.location || pd.linkedin?.location || '-';
}

function getExperienceYears(lead: Lead): number | null {
  const pd = getProfileData(lead);
  if (pd.years_experience) return Number(pd.years_experience);
  if (pd.linkedin?.totalExperienceYears) return Number(pd.linkedin.totalExperienceYears);
  const notes = pd.scoring_notes || '';
  const match = notes.match(/(\d+)\+?\s*years?/i);
  return match ? Number(match[1]) : null;
}

function getExperienceLabel(lead: Lead): string {
  const yrs = getExperienceYears(lead);
  if (yrs == null) return '-';
  const specialty = getProfileField(lead, 'specialty');
  const shortSpec = specialty?.split(',')[0]?.trim();
  return shortSpec ? `${yrs} yrs ${shortSpec}` : `${yrs} yrs`;
}

function getSpecialtySubtitle(lead: Lead): string | null {
  const specialty = getProfileField(lead, 'specialty');
  if (!specialty) return null;
  const title = (lead.title || '').toLowerCase();
  if (title.includes(specialty.toLowerCase())) return null;
  return `${specialty} Specialty`;
}

// Email open tracking data type
interface EmailOpenData {
  opened_at: string | null;
  clicked_at: string | null;
}

export function LeadTable({ 
  leads, 
  campaigns,
  assignments = [],
  selectedCampaignId,
  onCampaignFilterChange,
  onLeadClick, 
  onStatusChange, 
  onDelete,
  onBulkDelete,
  onBulkAssign,
  onBulkRemove,
  onCreateCampaign,
  onFindLeads,
  initialStatusFilter,
  onClearStatusFilter,
  activeCampaign,
}: LeadTableProps) {
  
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'all');
  const [sortField, setSortField] = useState<string>('match_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [outreachCounts, setOutreachCounts] = useState<Record<string, { count: number; lastSent: string | null }>>({});
  const [emailOpens, setEmailOpens] = useState<Record<string, EmailOpenData>>({});

  // Sync initial status filter from parent
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Fetch outreach message counts for all leads (batch)
  useEffect(() => {
    if (leads.length === 0) return;
    getOutreachMessages().then(result => {
      if (result.success && result.messages) {
        const counts: Record<string, { count: number; lastSent: string | null }> = {};
        for (const msg of result.messages) {
          if (!msg.lead_id) continue;
          if (!counts[msg.lead_id]) {
            counts[msg.lead_id] = { count: 0, lastSent: null };
          }
          counts[msg.lead_id].count++;
          if (msg.sent_at && (!counts[msg.lead_id].lastSent || msg.sent_at > counts[msg.lead_id].lastSent!)) {
            counts[msg.lead_id].lastSent = msg.sent_at;
          }
        }
        setOutreachCounts(counts);
      }
    });
  }, [leads]);

  // Fetch email open tracking data from email_log
  useEffect(() => {
    if (leads.length === 0) return;
    supabase
      .from('email_log')
      .select('metadata, opened_at, clicked_at')
      .not('opened_at', 'is', null)
      .then(({ data }) => {
        if (!data) return;
        const opens: Record<string, EmailOpenData> = {};
        for (const log of data) {
          const meta = log.metadata as any;
          const leadId = meta?.lead_id;
          if (leadId) {
            // Keep the most recent open data per lead
            if (!opens[leadId] || (log.opened_at && (!opens[leadId].opened_at || log.opened_at > opens[leadId].opened_at!))) {
              opens[leadId] = { opened_at: log.opened_at, clicked_at: log.clicked_at };
            }
          }
        }
        setEmailOpens(opens);
      });
  }, [leads]);

  // Build a map: leadId -> campaign names
  const leadCampaignMap = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {};
    if (!campaigns || !assignments) return map;
    for (const a of assignments) {
      const c = campaigns.find(c => c.id === a.campaign_id);
      if (c) {
        if (!map[a.lead_id]) map[a.lead_id] = [];
        map[a.lead_id].push({ id: c.id!, name: c.name });
      }
    }
    return map;
  }, [campaigns, assignments]);

  // Build set of lead IDs for the selected campaign filter
  const campaignLeadIds = useMemo(() => {
    if (!selectedCampaignId) return null;
    if (selectedCampaignId === 'unassigned') {
      const assignedIds = new Set(assignments.map(a => a.lead_id));
      return new Set(leads.filter(l => !assignedIds.has(l.id)).map(l => l.id));
    }
    return new Set(assignments.filter(a => a.campaign_id === selectedCampaignId).map(a => a.lead_id));
  }, [selectedCampaignId, assignments, leads]);

  const handleExport = (leadsToExport?: Lead[]) => {
    const target = leadsToExport || filteredLeads;
    if (target.length === 0) {
      toast.error('No leads match current filters.');
      return;
    }
    const campaignName = selectedCampaign?.name?.replace(/\s+/g, '-').toLowerCase() || 'all-leads';
    exportLeadsToCSV(target, campaignName);
    toast.success(`Exported ${target.length} leads to CSV.`);
  };

  const filteredLeads = useMemo(() => leads
    .filter(lead => {
      if (campaignLeadIds && !campaignLeadIds.has(lead.id)) return false;

      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === 'match_score') {
        const aScore = getMatchScore(a) ?? -1;
        const bScore = getMatchScore(b) ?? -1;
        return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
      }
      if (sortField === 'experience') {
        const aYrs = getExperienceYears(a) ?? -1;
        const bYrs = getExperienceYears(b) ?? -1;
        return sortDirection === 'asc' ? aYrs - bYrs : bYrs - aYrs;
      }
      if (sortField === 'createdAt') {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc' 
        ? String(aVal || '').localeCompare(String(bVal || ''))
        : String(bVal || '').localeCompare(String(aVal || ''));
    }), [leads, campaignLeadIds, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const selectedCampaign = campaigns?.find(c => c.id === selectedCampaignId);

  // Selection helpers
  const allSelected = filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const lastClickedIndex = useRef<number | null>(null);

  const toggleOne = useCallback((id: string, index: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      const rangeIds = filteredLeads.slice(start, end + 1).map(l => l.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        rangeIds.forEach(rid => next.add(rid));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    lastClickedIndex.current = index;
  }, [filteredLeads]);

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkExport = () => {
    const selected = filteredLeads.filter(l => selectedIds.has(l.id));
    handleExport(selected);
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleBulkAssign = (campaignId: string) => {
    if (onBulkAssign) {
      onBulkAssign(Array.from(selectedIds), campaignId);
      clearSelection();
    }
  };

  const handleBulkRemove = () => {
    if (onBulkRemove && selectedCampaignId && selectedCampaignId !== 'unassigned') {
      onBulkRemove(Array.from(selectedIds), selectedCampaignId);
      clearSelection();
    }
  };

  // Email indicator with open tracking
  const renderEmailIndicator = (lead: Lead) => {
    const outreach = outreachCounts[lead.id];
    const openData = emailOpens[lead.id];
    
    if (!outreach && !openData) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5">
              {outreach && <Mail className="w-3.5 h-3.5 text-blue-400" />}
              {openData?.opened_at && <Eye className="w-3.5 h-3.5 text-emerald-500" />}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-0.5">
              {outreach && (
                <p>{outreach.count} email{outreach.count > 1 ? 's' : ''} sent
                {outreach.lastSent && `, last on ${new Date(outreach.lastSent).toLocaleDateString()}`}</p>
              )}
              {openData?.opened_at && (
                <p className="text-emerald-500">Opened {new Date(openData.opened_at).toLocaleDateString()}</p>
              )}
              {openData?.clicked_at && (
                <p className="text-blue-500">Clicked {new Date(openData.clicked_at).toLocaleDateString()}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Mobile card component
  const renderMobileCard = (lead: Lead, index: number) => {
    const status = statusConfig[lead.status] || statusConfig.new;
    const score = getMatchScore(lead);
    const leadJobs = leadCampaignMap[lead.id] || [];

    return (
      <div
        key={lead.id}
        className={cn(
          'bg-card border border-border rounded-xl p-4 animate-fade-in',
          selectedIds.has(lead.id) && 'ring-2 ring-primary/30 bg-primary/5'
        )}
        style={{ animationDelay: `${index * 0.03}s` }}
      >
        {/* Row 1: Checkbox + Avatar + Name + Score */}
        <div className="flex items-center gap-3 mb-3">
          <div onClick={(e) => { e.stopPropagation(); toggleOne(lead.id, index); }}>
            <Checkbox
              checked={selectedIds.has(lead.id)}
              onCheckedChange={() => toggleOne(lead.id, index)}
              aria-label={`Select ${lead.name}`}
            />
          </div>
          <div className="relative" onClick={() => onLeadClick(lead)}>
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={lead.profile_data?.linkedin?.profilePicture} alt={lead.name} />
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {lead.profile_data?.linkedin && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0" onClick={() => onLeadClick(lead)}>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground truncate">{lead.name}</p>
              {renderEmailIndicator(lead)}
            </div>
          </div>
          {score != null && (
            <Badge className={cn('border font-semibold text-xs flex-shrink-0', getMatchScoreBadgeClass(score))}>
              {score}%
            </Badge>
          )}
        </div>

        {/* Row 2: Title | Employer */}
        <div className="text-sm text-muted-foreground mb-2 truncate" onClick={() => onLeadClick(lead)}>
          {lead.title || 'No title'}
          {getEmployer(lead) !== '-' && ` · ${getEmployer(lead)}`}
        </div>

        {/* Row 3: Location | Status */}
        <div className="flex items-center justify-between mb-3" onClick={() => onLeadClick(lead)}>
          <span className="text-sm text-muted-foreground truncate">{getLocation(lead)}</span>
          <Badge className={cn('border font-medium text-xs', status.color)}>
            {status.label}
          </Badge>
        </div>

        {/* Row 4: Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          {lead.email && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={() => setEmailModalLead(lead)}>
              <Mail className="w-3.5 h-3.5" />
              Email
            </Button>
          )}
          {onStatusChange && (
            <Select onValueChange={(val) => onStatusChange(lead.id, val)}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] rounded-lg text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key} className="text-xs">{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                    <div className="w-1 h-1 rounded-full bg-current" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {lead.linkedin_url && (
                  <DropdownMenuItem onClick={() => window.open(lead.linkedin_url, '_blank')}>
                    View LinkedIn
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(lead.id)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm relative">
      {/* Header */}
      <div className={cn("p-4 border-b border-border flex items-center gap-4", isMobile ? "flex-col items-stretch" : "flex-wrap")}>
        <div className="search-input flex items-center gap-4 px-5 py-3 flex-1 max-w-md">
          <div className="w-4 h-4 relative flex-shrink-0">
            <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
            <div className="absolute bottom-0 right-0 w-1 h-1.5 bg-muted-foreground rounded-full rotate-45 origin-top" />
          </div>
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 px-0 h-auto"
          />
        </div>
        
        <div className={cn("flex items-center gap-2", isMobile && "flex-wrap")}>
          {/* Job Opening Filter */}
          {campaigns && campaigns.length > 0 && onCampaignFilterChange && (
            <Select 
              value={selectedCampaignId || 'all'} 
              onValueChange={(val) => {
                onCampaignFilterChange(val === 'all' ? null : val);
                clearSelection();
              }}
            >
              <SelectTrigger className={cn("rounded-xl", isMobile ? "w-full" : "w-[220px]")}>
                <SelectValue placeholder="Filter by Job Opening" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Openings</SelectItem>
                <SelectItem value="unassigned">Unassigned Candidates</SelectItem>
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
            <SelectTrigger className={cn("rounded-xl", isMobile ? "flex-1" : "w-[150px]")}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Button */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport()}
              className="gap-2 rounded-xl"
              disabled={filteredLeads.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Info Banner */}
      {selectedCampaign && (
        <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
              Job Opening
            </Badge>
            <span className="font-medium text-foreground">{selectedCampaign.name}</span>
            {!isMobile && selectedCampaign.search_query && (
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

      {selectedCampaignId === 'unassigned' && (
        <div className="px-6 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-muted border-border text-muted-foreground">
              Unassigned
            </Badge>
            <span className="font-medium text-foreground">Candidates not in any job opening</span>
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

      {/* Content: Mobile cards or Desktop table */}
      {isMobile ? (
        <div className="p-3 space-y-2">
          {filteredLeads.length === 0 ? (
            leads.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No candidates yet"
                description="Create a job opening to start discovering qualified candidates."
                actionLabel={onCreateCampaign ? "Create Job Opening" : undefined}
                onAction={onCreateCampaign}
              />
            ) : (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No matching candidates"
                description="Try adjusting your search or filters."
                actionLabel="Clear Filters"
                onAction={() => { setSearchQuery(''); setStatusFilter('all'); }}
              />
            )
          ) : (
            filteredLeads.map((lead, index) => renderMobileCard(lead, index))
          )}
        </div>
      ) : (
        /* Desktop Table */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="p-3 w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '22%' }}>
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Candidate
                    <span className="text-[10px]">↕</span>
                  </button>
                </th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '14%' }}>Employer</th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '10%' }}>Location</th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '16%' }}>Credentials</th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '9%' }}>
                  <button 
                    onClick={() => handleSort('experience')}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Experience
                    <span className="text-[10px]">↕</span>
                  </button>
                </th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '7%' }}>
                  <button 
                    onClick={() => handleSort('match_score')}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Match
                    <span className="text-[10px]">↕</span>
                  </button>
                </th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '10%' }}>Job Opening</th>
                <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '6%' }}>Status</th>
                <th className="text-right p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '4%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-0">
                    {leads.length === 0 ? (
                      <EmptyState
                        icon={<Users className="w-8 h-8" />}
                        title="No candidates yet"
                        description="Create a job opening to start discovering qualified candidates using AI-powered search."
                        actionLabel={onCreateCampaign ? "Create Job Opening" : undefined}
                        onAction={onCreateCampaign}
                        secondaryActionLabel={onFindLeads ? "Search" : undefined}
                        onSecondaryAction={onFindLeads}
                      />
                    ) : searchQuery || statusFilter !== 'all' ? (
                      <EmptyState
                        icon={<Search className="w-8 h-8" />}
                        title="No matching candidates"
                        description="Try adjusting your search query or filters to find what you're looking for."
                        actionLabel="Clear Filters"
                        onAction={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                      />
                    ) : selectedCampaignId ? (
                      <EmptyState
                        icon={<Sparkles className="w-8 h-8" />}
                        title="No candidates in this job opening"
                        description="This job opening doesn't have any candidates yet. Find candidates to add."
                        actionLabel={onFindLeads ? "Search" : undefined}
                        onAction={onFindLeads}
                        secondaryActionLabel="View All Candidates"
                        onSecondaryAction={() => onCampaignFilterChange?.(null)}
                      />
                    ) : (
                      <EmptyState
                        icon={<Users className="w-8 h-8" />}
                        title="No candidates found"
                        description="Start by creating a job opening to find candidates."
                        actionLabel={onCreateCampaign ? "Create Job Opening" : undefined}
                        onAction={onCreateCampaign}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => {
                  const status = statusConfig[lead.status] || statusConfig.new;
                  const leadJobs = leadCampaignMap[lead.id] || [];
                  return (
                    <tr 
                      key={lead.id} 
                      className={cn(
                        'lead-row border-b border-border/50 cursor-pointer',
                        'animate-fade-in opacity-0',
                        selectedIds.has(lead.id) && 'bg-primary/5'
                      )}
                      style={{ animationDelay: `${index * 0.03}s` }}
                      onClick={() => onLeadClick(lead)}
                    >
                      <td className="p-3 w-12 align-middle" onClick={(e) => { e.stopPropagation(); toggleOne(lead.id, index, e as unknown as React.MouseEvent); }}>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleOne(lead.id, index)}
                          aria-label={`Select ${lead.name}`}
                        />
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10 border border-border">
                              <AvatarImage 
                                src={lead.profile_data?.linkedin?.profilePicture} 
                                alt={lead.name} 
                              />
                              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {lead.profile_data?.linkedin && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground">{lead.name}</p>
                              {renderEmailIndicator(lead)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {lead.title || 'No title'}
                              {(() => {
                                const spec = getSpecialtySubtitle(lead);
                                return spec ? <span> · {spec}</span> : null;
                              })()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <p className="text-foreground">{getEmployer(lead)}</p>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-1">
                          <p className="text-foreground text-sm">{getLocation(lead)}</p>
                          {(lead as any).nationality && (
                            <span className="text-sm">{getCountryFlag((lead as any).nationality)}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        {(() => {
                          const licenses = parseBadgeList(getProfileField(lead, 'licenses'));
                          const certs = parseBadgeList(getProfileField(lead, 'certifications'));
                          if (licenses.length === 0 && certs.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
                          return (
                            <div className="space-y-1.5">
                              {licenses.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {licenses.map((lic) => (
                                    <Badge key={lic} variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border-primary/30 text-primary bg-primary/10">
                                      <ShieldCheck className="w-3 h-3 mr-1" />
                                      {lic}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {certs.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {certs.slice(0, 3).map((cert) => (
                                    <Badge key={cert} variant="secondary" className="text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                      {cert}
                                    </Badge>
                                  ))}
                                  {certs.length > 3 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 rounded-full" title={certs.join(', ')}>
                                      +{certs.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 align-middle">
                        <span className="text-sm text-foreground">{getExperienceLabel(lead)}</span>
                      </td>
                      <td className="p-3 align-middle">
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
                      <td className="p-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        {leadJobs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {leadJobs.map(j => (
                              <button
                                key={j.id}
                                onClick={() => onCampaignFilterChange?.(j.id)}
                                className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                              >
                                {j.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 align-middle">
                        <Badge className={cn('border font-medium', status.color)}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label={`Actions for ${lead.name}`}>
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 rounded-full bg-current" />
                                <div className="w-1 h-1 rounded-full bg-current" />
                                <div className="w-1 h-1 rounded-full bg-current" />
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-border/80 w-48">
                            {lead.email && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setEmailModalLead(lead);
                              }}>
                                <Mail className="w-4 h-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                            )}
                            {lead.linkedin_url && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                window.open(lead.linkedin_url, '_blank');
                              }}>
                                View LinkedIn
                              </DropdownMenuItem>
                            )}
                            {onStatusChange && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'contacted'); }}>
                                  <Mail className="w-4 h-4 mr-2 text-primary" />
                                  Mark as Contacted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'replied'); }}>
                                  <MessageCircle className="w-4 h-4 mr-2 text-success" />
                                  Mark as Replied
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'qualified'); }}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-success" />
                                  Mark as Qualified
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'interview_scheduled'); }}>
                                  <Calendar className="w-4 h-4 mr-2 text-accent-foreground" />
                                  Interview Scheduled
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'offer_sent'); }}>
                                  <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                                  Offer Sent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'hired'); }}>
                                  <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
                                  Hired
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
      )}

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          Showing {filteredLeads.length} of {leads.length} candidates
          {selectedCampaign && ` in "${selectedCampaign.name}"`}
        </p>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className={cn(
          "fixed bottom-6 z-50 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-2xl px-6 py-3 animate-fade-in",
          isMobile ? "left-3 right-3 flex-wrap justify-center" : "left-1/2 -translate-x-1/2"
        )}>
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
            {selectedIds.size} candidate{selectedIds.size > 1 ? 's' : ''} selected
          </span>

          <div className="w-px h-6 bg-border" />

          {/* Add to Job Opening */}
          {onBulkAssign && campaigns && campaigns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" />
                  {isMobile ? 'Assign' : 'Add to Job Opening'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {campaigns.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => handleBulkAssign(c.id!)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
                {onCreateCampaign && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onCreateCampaign}>
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Create New Job Opening
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Remove from Job Opening (only when filtered to specific job) */}
          {onBulkRemove && selectedCampaignId && selectedCampaignId !== 'unassigned' && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleBulkRemove}>
              Remove from Job
            </Button>
          )}

          {/* Send Emails */}
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setShowBulkEmail(true)}>
            <Mail className="w-3.5 h-3.5" />
            {isMobile ? `Email (${selectedIds.size})` : `Send Emails (${selectedIds.size})`}
          </Button>

          {/* Delete */}
          {onBulkDelete && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}

          {/* Export */}
          {!isMobile && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleBulkExport}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}

          {/* Cancel */}
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        lead={emailModalLead}
        campaign={activeCampaign}
        isOpen={!!emailModalLead}
        onClose={() => setEmailModalLead(null)}
        onSent={() => {
          setOutreachCounts(prev => {
            const id = emailModalLead?.id;
            if (!id) return prev;
            return { ...prev, [id]: { count: (prev[id]?.count || 0) + 1, lastSent: new Date().toISOString() } };
          });
        }}
      />

      {/* Bulk Email Modal */}
      <BulkEmailModal
        leads={filteredLeads.filter(l => selectedIds.has(l.id))}
        campaign={activeCampaign}
        isOpen={showBulkEmail}
        onClose={() => setShowBulkEmail(false)}
        onSent={() => {
          clearSelection();
          getOutreachMessages().then(result => {
            if (result.success && result.messages) {
              const counts: Record<string, { count: number; lastSent: string | null }> = {};
              for (const msg of result.messages) {
                if (!msg.lead_id) continue;
                if (!counts[msg.lead_id]) counts[msg.lead_id] = { count: 0, lastSent: null };
                counts[msg.lead_id].count++;
                if (msg.sent_at && (!counts[msg.lead_id].lastSent || msg.sent_at > counts[msg.lead_id].lastSent!)) {
                  counts[msg.lead_id].lastSent = msg.sent_at;
                }
              }
              setOutreachCounts(counts);
            }
          });
        }}
      />
    </div>
  );
}
