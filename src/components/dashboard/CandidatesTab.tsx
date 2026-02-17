import { Button } from '@/components/ui/button';
import { LeadTable } from '@/components/LeadTable';
import { Plus } from 'lucide-react';
import { Lead, Campaign, LeadCampaignAssignment } from '@/lib/api';

interface CandidatesTabProps {
  dbLeads: Lead[];
  campaigns: Campaign[];
  assignments: LeadCampaignAssignment[];
  selectedCampaignId: string | null;
  statusFilterFromStats: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  setStatusFilterFromStats: (status: string | null) => void;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
  onDelete: (leadId: string) => Promise<void>;
  onBulkDelete: (leadIds: string[]) => Promise<void>;
  onBulkAssign: (leadIds: string[], campaignId: string) => Promise<void>;
  onBulkRemove: (leadIds: string[], campaignId: string) => Promise<void>;
  onCreateCampaign: () => void;
  onFindLeads: () => void;
  onShowAddCandidate: () => void;
  loadData: () => void;
}

export function CandidatesTab({
  dbLeads,
  campaigns,
  assignments,
  selectedCampaignId,
  statusFilterFromStats,
  setSelectedCampaignId,
  setStatusFilterFromStats,
  onLeadClick,
  onStatusChange,
  onDelete,
  onBulkDelete,
  onBulkAssign,
  onBulkRemove,
  onCreateCampaign,
  onFindLeads,
  onShowAddCandidate,
  loadData,
}: CandidatesTabProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">
            {selectedCampaignId
              ? `Viewing candidates from job opening`
              : `${dbLeads.length} candidates in your pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onShowAddCandidate} className="rounded-md">
            <Plus className="w-4 h-4 mr-1" />
            Add Manual
          </Button>
          <Button variant="outline" onClick={() => { setSelectedCampaignId(null); loadData(); }} className="rounded-md">
            Refresh
          </Button>
          <Button variant="outline" className="rounded-md">
            Export
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-sm text-muted-foreground">View:</span>
        {[
          { label: 'All', value: null },
          { label: 'New', value: 'new' },
          { label: 'Contacted', value: 'contacted' },
          { label: 'Replied', value: 'replied' },
          { label: 'Qualified', value: 'qualified' },
          { label: 'Interviewing', value: 'interview_scheduled' },
          { label: 'Hired', value: 'hired' },
        ].map((chip) => (
          <Button
            key={chip.label}
            variant={statusFilterFromStats === chip.value ? 'default' : 'outline'}
            size="sm"
            className="rounded-md"
            onClick={() => setStatusFilterFromStats(chip.value)}
          >
            {chip.label}
          </Button>
        ))}
      </div>
      <LeadTable
        leads={dbLeads}
        campaigns={campaigns}
        assignments={assignments}
        selectedCampaignId={selectedCampaignId}
        onCampaignFilterChange={setSelectedCampaignId}
        onLeadClick={onLeadClick}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onBulkAssign={onBulkAssign}
        onBulkRemove={onBulkRemove}
        onCreateCampaign={onCreateCampaign}
        onFindLeads={onFindLeads}
        initialStatusFilter={statusFilterFromStats}
        onClearStatusFilter={() => setStatusFilterFromStats(null)}
        activeCampaign={campaigns?.find(c => c.id === selectedCampaignId) || null}
      />
    </div>
  );
}
