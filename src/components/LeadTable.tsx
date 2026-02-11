import { useState, useMemo, useRef, useCallback } from 'react';
import { Lead } from '@/types/lead';
import { Campaign } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { CheckCircle2, Download, Users, Search, Sparkles, ShieldCheck, X, Trash2, Plus } from 'lucide-react';
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
function getProfileData(lead: Lead): any {
  return lead.profile_data || lead.profileData || {};
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
}: LeadTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('match_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      toast({ title: 'No leads to export', description: 'No leads match current filters.', variant: 'destructive' });
      return;
    }
    const campaignName = selectedCampaign?.name?.replace(/\s+/g, '-').toLowerCase() || 'all-leads';
    exportLeadsToCSV(target, campaignName);
    toast({ title: 'Export complete', description: `Exported ${target.length} leads to CSV.` });
  };

  const filteredLeads = leads
    .filter(lead => {
      // Campaign/job opening filter
      if (campaignLeadIds && !campaignLeadIds.has(lead.id)) return false;

      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase());
      
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
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
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

  return (
    <div className="glass-strong rounded-2xl overflow-hidden card-shadow relative">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-4 flex-wrap">
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
        
        {/* Job Opening Filter */}
        {campaigns && campaigns.length > 0 && onCampaignFilterChange && (
          <Select 
            value={selectedCampaignId || 'all'} 
            onValueChange={(val) => {
              onCampaignFilterChange(val === 'all' ? null : val);
              clearSelection();
            }}
          >
            <SelectTrigger className="w-[220px] rounded-xl">
              <SelectValue placeholder="Filter by Job Opening" />
            </SelectTrigger>
            <SelectContent className="glass-strong">
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
          onClick={() => handleExport()}
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
              Job Opening
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

      {/* Table */}
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
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '20%' }}>
                <button 
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Candidate
                  <span className="text-[10px]">↕</span>
                </button>
              </th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '15%' }}>Employer</th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '10%' }}>Location</th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '10%' }}>License</th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '15%' }}>Certifications</th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '8%' }}>
                <button 
                  onClick={() => handleSort('experience')}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  Experience
                  <span className="text-[10px]">↕</span>
                </button>
              </th>
              <th className="text-left p-3 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ width: '10%' }}>Emp. Status</th>
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
                <td colSpan={12} className="p-0">
                  {leads.length === 0 ? (
                    <EmptyState
                      icon={<Users className="w-8 h-8" />}
                      title="No candidates yet"
                      description="Create a job opening to start discovering qualified candidates using AI-powered search."
                      actionLabel={onCreateCampaign ? "Create Job Opening" : undefined}
                      onAction={onCreateCampaign}
                      secondaryActionLabel={onFindLeads ? "Find Candidates" : undefined}
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
                      actionLabel={onFindLeads ? "Find Candidates" : undefined}
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
                              src={(lead.profile_data || lead.profileData)?.linkedin?.profilePicture} 
                              alt={lead.name} 
                            />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {(lead.profile_data || lead.profileData)?.linkedin && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{lead.name}</p>
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
                      <p className="text-foreground text-sm">{getLocation(lead)}</p>
                    </td>
                    <td className="p-3 align-middle">
                      {(() => {
                        const licenses = parseBadgeList(getProfileField(lead, 'licenses'));
                        return licenses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {licenses.map((lic) => (
                              <Badge key={lic} variant="outline" className="text-xs font-semibold px-2.5 py-1 rounded-full border-primary/30 text-primary bg-primary/10">
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
                    <td className="p-3 align-middle">
                      {(() => {
                        const certs = parseBadgeList(getProfileField(lead, 'certifications'));
                        if (certs.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
                        const visible = certs.slice(0, 3);
                        const remaining = certs.length - 3;
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {visible.map((cert) => (
                              <Badge key={cert} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-full">
                                {cert}
                              </Badge>
                            ))}
                            {remaining > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-1 rounded-full cursor-default"
                                title={certs.join(', ')}
                              >
                                +{remaining} more
                              </Badge>
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
                        const emp = getEmploymentStatus(lead);
                        return emp.status === 'employed' ? (
                          <div>
                            <Badge className="border bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">Currently Employed</Badge>
                            {emp.employer && <p className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">{emp.employer}</p>}
                          </div>
                        ) : (
                          <Badge className="border bg-primary/15 text-primary border-primary/30 text-xs">Available</Badge>
                        );
                      })()}
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
      <div className="p-4 border-t border-border flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          Showing {filteredLeads.length} of {leads.length} candidates
          {selectedCampaign && ` in "${selectedCampaign.name}"`}
        </p>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-2xl shadow-2xl px-6 py-3 animate-fade-in">
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
                  Add to Job Opening
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-strong w-56">
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

          {/* Delete */}
          {onBulkDelete && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-destructive hover:text-destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}

          {/* Export */}
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={handleBulkExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          {/* Cancel */}
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
