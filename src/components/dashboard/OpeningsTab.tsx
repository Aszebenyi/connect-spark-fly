import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/CampaignCard';
import { Campaign } from '@/lib/api';

interface OpeningsTabProps {
  campaigns: Campaign[];
  onCreateCampaign: () => void;
  onViewCampaignLeads: (campaign: Campaign) => void;
  onFindMoreLeads: (campaign: Campaign) => void;
  loadData: () => void;
}

export function OpeningsTab({
  campaigns,
  onCreateCampaign,
  onViewCampaignLeads,
  onFindMoreLeads,
  loadData,
}: OpeningsTabProps) {
  const [jobsTab, setJobsTab] = useState<'active' | 'completed'>('active');

  const displayedCampaigns = jobsTab === 'active'
    ? campaigns.filter(c => c.status !== 'completed')
    : campaigns.filter(c => c.status === 'completed');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Job Openings</h1>
          <p className="page-subtitle">{campaigns.length} job openings</p>
        </div>
        <Button onClick={onCreateCampaign} className="rounded-md">
          + New Job Opening
        </Button>
      </div>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setJobsTab('active')}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
              jobsTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({campaigns.filter(c => c.status !== 'completed').length})
          </button>
          <button
            onClick={() => setJobsTab('completed')}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
              jobsTab === 'completed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed ({campaigns.filter(c => c.status === 'completed').length})
          </button>
        </nav>
      </div>

      {displayedCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCampaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onUpdate={loadData}
              onViewLeads={onViewCampaignLeads}
              onFindMoreLeads={onFindMoreLeads}
              className={`animate-fade-in stagger-${index + 1}`}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {jobsTab === 'active' ? 'No active job openings' : 'No completed job openings'}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            {jobsTab === 'active'
              ? 'Job openings help you organize candidates by role. Create your first job opening to get started.'
              : 'Completed job openings will appear here.'}
          </p>
          {jobsTab === 'active' && (
            <Button onClick={onCreateCampaign} size="lg" className="rounded-md px-6">
              + Create Job Opening
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
