import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCampaignById, updateCampaign, deleteCampaign, getLeads, getLeadAssignments, updateLeadStatus, deleteLead, deleteLeads, assignLeadsToCampaign, removeLeadsFromCampaign, getCampaigns, Campaign, Lead, LeadCampaignAssignment } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { LeadTable } from '@/components/LeadTable';
import { LeadDetailSheet } from '@/components/LeadDetailSheet';
import { CreateCampaignDialog } from '@/components/CreateCampaignDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Calendar, Clock, Search, CheckCircle2, Loader2, Trash2, 
  Users, MessageSquare, Settings, ArrowRightLeft, Mail, PhoneCall, CalendarCheck, Sparkles, Edit
} from 'lucide-react';
import { createLeadNote } from '@/lib/api';

interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  note_type: string;
  created_at: string;
}

const noteTypeConfig: Record<string, { icon: any; label: string; isSystem: boolean }> = {
  note: { icon: MessageSquare, label: 'Note', isSystem: false },
  call: { icon: PhoneCall, label: 'Call', isSystem: false },
  meeting: { icon: CalendarCheck, label: 'Meeting', isSystem: false },
  status_change: { icon: ArrowRightLeft, label: 'Status Change', isSystem: true },
  email_sent: { icon: Mail, label: 'Email Sent', isSystem: true },
  system: { icon: Sparkles, label: 'System', isSystem: true },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function OpeningDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<LeadCampaignAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState('candidates');

  // Activity tab state
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteFilter, setNoteFilter] = useState<string | null>(null);

  // Settings tab state
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editQuery, setEditQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [campaignResult, leadsResult, assignResult, campaignsResult] = await Promise.all([
      getCampaignById(id),
      getLeads(),
      getLeadAssignments(),
      getCampaigns(),
    ]);
    if (campaignResult.success && campaignResult.campaign) {
      setCampaign(campaignResult.campaign);
      setEditName(campaignResult.campaign.name);
      setEditGoal(campaignResult.campaign.goal || '');
      setEditQuery(campaignResult.campaign.search_query || '');
    }
    if (leadsResult.success && leadsResult.leads) setLeads(leadsResult.leads);
    if (assignResult.success && assignResult.assignments) setAssignments(assignResult.assignments);
    if (campaignsResult.success && campaignsResult.campaigns) setAllCampaigns(campaignsResult.campaigns);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) loadData();
  }, [user, authLoading, id]);

  // Load activity notes
  const loadNotes = useCallback(async () => {
    if (!id) return;
    setNotesLoading(true);
    // Get all lead IDs for this campaign
    const campaignLeadIds = leads
      .filter(l => l.campaign_id === id || assignments.some(a => a.lead_id === l.id && a.campaign_id === id))
      .map(l => l.id);

    if (campaignLeadIds.length === 0) {
      setNotes([]);
      setNotesLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .in('lead_id', campaignLeadIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setNotes(data as unknown as LeadNote[]);
    setNotesLoading(false);
  }, [id, leads, assignments]);

  useEffect(() => {
    if (activeTab === 'activity' && leads.length > 0) loadNotes();
  }, [activeTab, leads.length]);

  // Filter leads for this campaign
  const campaignLeads = leads.filter(
    l => l.campaign_id === id || assignments.some(a => a.lead_id === l.id && a.campaign_id === id)
  );

  const daysOpen = campaign?.created_at
    ? Math.floor((Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-success/10 text-success border border-success/20',
    paused: 'bg-warning/10 text-warning border border-warning/20',
    completed: 'bg-muted text-muted-foreground',
    searching: 'bg-primary/10 text-primary border border-primary/20',
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const result = await updateLeadStatus(leadId, newStatus);
    if (result.success) {
      loadData();
      toast({ title: 'Status updated' });
      createLeadNote(leadId, `Status changed to ${newStatus}`, 'status_change');
    } else {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const result = await deleteLead(leadId);
    if (result.success) { loadData(); toast({ title: 'Candidate deleted' }); }
    else toast({ title: 'Failed to delete', variant: 'destructive' });
  };

  const handleBulkDelete = async (leadIds: string[]) => {
    const result = await deleteLeads(leadIds);
    if (result.success) { loadData(); toast({ title: `${leadIds.length} deleted` }); }
    else toast({ title: 'Failed to delete', variant: 'destructive' });
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    setIsSaving(true);
    const result = await updateCampaign(id, { name: editName, goal: editGoal, search_query: editQuery });
    if (result.success) {
      toast({ title: 'Settings saved' });
      loadData();
    } else {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleDeleteOpening = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this job opening? All associated data will be removed.')) return;
    const result = await deleteCampaign(id);
    if (result.success) {
      toast({ title: 'Opening deleted' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Opening not found</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const filteredNotes = noteFilter
    ? notes.filter(n => n.note_type === noteFilter)
    : notes;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${campaign.name} — MediLead`} description={`Job opening: ${campaign.name}`} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => navigate('/dashboard')} className="hover:text-foreground transition-colors">Dashboard</button>
          <span>/</span>
          <button onClick={() => navigate('/dashboard')} className="hover:text-foreground transition-colors">Job Openings</button>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{campaign.name}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="mt-1 rounded-lg" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{campaign.name}</h1>
                <Badge className={statusColors[campaign.status || 'draft'] + ' capitalize text-xs'}>
                  {campaign.status || 'draft'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {campaign.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {daysOpen} days open
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {campaignLeads.length} candidates
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-lg"
              onClick={() => navigate(`/dashboard?tab=search&campaignId=${id}&campaignName=${encodeURIComponent(campaign.name)}`)}
            >
              <Search className="w-3.5 h-3.5" />
              Find Candidates
            </Button>
            {campaign.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-lg"
                onClick={async () => {
                  const result = await updateCampaign(id!, { status: 'completed' });
                  if (result.success) { toast({ title: 'Marked as complete' }); loadData(); }
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="candidates" className="gap-2">
              <Users className="w-3.5 h-3.5" />
              Candidates
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Candidates Tab */}
          <TabsContent value="candidates">
            <LeadTable
              leads={campaignLeads}
              campaigns={allCampaigns}
              assignments={assignments}
              selectedCampaignId={id}
              onLeadClick={(lead) => setSelectedLead(lead)}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteLead}
              onBulkDelete={handleBulkDelete}
              onBulkAssign={async (ids, cId) => {
                await assignLeadsToCampaign(ids, cId);
                loadData();
              }}
              onBulkRemove={async (ids, cId) => {
                await removeLeadsFromCampaign(ids, cId);
                loadData();
              }}
              onFindLeads={() => navigate(`/dashboard?tab=search&campaignId=${id}&campaignName=${encodeURIComponent(campaign.name)}`)}
              activeCampaign={campaign}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setNoteFilter(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !noteFilter ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All
                </button>
                {Object.entries(noteTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setNoteFilter(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        noteFilter === key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>

              {/* Timeline */}
              {notesLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading activity...
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-1 relative">
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-border/50" />
                  {filteredNotes.map((note) => {
                    const config = noteTypeConfig[note.note_type] || noteTypeConfig.note;
                    const NoteIcon = config.icon;
                    const isSystem = config.isSystem;
                    // Find lead name
                    const lead = leads.find(l => l.id === note.lead_id);
                    return (
                      <div key={note.id} className="relative pl-8 group">
                        <div className={`absolute left-1.5 top-2.5 w-3 h-3 rounded-full z-10 ${
                          isSystem ? 'bg-muted border border-border' : 'bg-primary/20 border-2 border-primary'
                        }`} />
                        <div className={`py-2 px-3 rounded-lg border-l-2 ${
                          isSystem ? 'border-l-muted-foreground/30' : 'border-l-primary/50'
                        }`}>
                          <p className={`text-sm leading-relaxed ${isSystem ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                            {note.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <NoteIcon className="w-2.5 h-2.5" />
                              {config.label}
                            </span>
                            {lead && (
                              <span className="text-[10px] text-muted-foreground">· {lead.name}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{timeAgo(note.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-lg space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Opening Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Goal / Description</Label>
                  <Textarea
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                    placeholder="Describe what you're looking for..."
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Search Query</Label>
                  <Textarea
                    value={editQuery}
                    onChange={(e) => setEditQuery(e.target.value)}
                    className="mt-1.5"
                    rows={2}
                    placeholder="Default search query for finding candidates..."
                  />
                </div>
                <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2 rounded-lg">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">Deleting this opening will remove it permanently. Candidates will remain in your database.</p>
                <Button variant="destructive" onClick={handleDeleteOpening} className="gap-2 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                  Delete Opening
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={loadData}
      />
    </div>
  );
}
