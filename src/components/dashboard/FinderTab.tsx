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
  onLeadsFound,
  onCreateCampaign,
}: FinderTabProps) {
  return (
    <div className="animate-fade-in py-6">
      <LeadFinder
        onLeadsFound={onLeadsFound}
        campaigns={campaigns}
        initialCampaignId={findMoreCampaign?.id}
        initialCampaignName={findMoreCampaign?.name}
        onCreateCampaign={onCreateCampaign}
      />
    </div>
  );
}
