import { Button } from '@/components/ui/button';
import { LeadFinder } from '@/components/LeadFinder';
import { Campaign } from '@/lib/api';

interface FinderTabProps {
  campaigns: Campaign[];
  findMoreCampaign: Campaign | null;
  setFindMoreCampaign: (campaign: Campaign | null) => void;
  onLeadsFound: () => void;
  onCreateCampaign: () => void;
}

export function FinderTab({
  campaigns,
  findMoreCampaign,
  setFindMoreCampaign,
  onLeadsFound,
  onCreateCampaign,
}: FinderTabProps) {
  return (
    <div className="animate-fade-in py-6">
      {findMoreCampaign ? (
        <>
          <div className="mb-6 flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setFindMoreCampaign(null)}
              className="rounded-md"
            >
              ← Back
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Adding candidates to job opening</p>
              <p className="font-semibold text-foreground">{findMoreCampaign.name}</p>
            </div>
          </div>
          <LeadFinder
            onLeadsFound={onLeadsFound}
            campaignId={findMoreCampaign.id}
            campaignName={findMoreCampaign.name}
          />
        </>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">Search for Candidates</h2>
            <p className="text-muted-foreground text-sm">Select a job opening to add candidates to</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 animate-fade-in stagger-2" style={{ boxShadow: '0 1px 2px hsl(220 10% 50% / 0.05)' }}>
            <p className="text-sm font-medium text-muted-foreground mb-3">Which job opening is this for?</p>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => setFindMoreCampaign(campaign)}
                  className="w-full text-left p-4 rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {campaign.lead_count || 0} candidates • {campaign.status || 'draft'}
                      </p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
                  </div>
                </button>
              ))}
              <button
                onClick={onCreateCampaign}
                className="w-full text-left p-4 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors duration-150 group"
              >
                <p className="font-semibold text-primary">+ Create new job opening</p>
                <p className="text-xs text-muted-foreground mt-0.5">Set up a new role to search for</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
