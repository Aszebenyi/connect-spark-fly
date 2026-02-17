import { useState, useEffect } from 'react';
import { Lead, getLeadNotes, createLeadNote, deleteLeadNote, LeadNote, Campaign } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail, Phone, Linkedin, Building2, MapPin, Send, X, Sparkles,
  Briefcase, GraduationCap, Award, Loader2, CheckCircle2,
  Languages, ExternalLink, ShieldCheck, Eye, MousePointerClick,
  MessageSquare, PhoneCall, CalendarCheck, ArrowRightLeft, Trash2, Plus,
  ChevronDown, AlertCircle,
} from 'lucide-react';
import { enrichLeadWithLinkedIn, LinkedInProfile, getOutreachMessages, OutreachMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { generateOutreach, GeneratedOutreach } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
  campaigns?: Campaign[];
  onAssignToCampaign?: (leadId: string, campaignId: string) => Promise<void>;
  onStatusChange?: (leadId: string, newStatus: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string }> = {
  new: { label: 'New' },
  contacted: { label: 'Contacted' },
  replied: { label: 'Replied' },
  qualified: { label: 'Qualified' },
  interview_scheduled: { label: 'Interviewing' },
  hired: { label: 'Hired' },
  lost: { label: 'Lost' },
  archived: { label: 'Archived' },
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

const noteTypeConfig: Record<string, { icon: any; label: string; isSystem: boolean }> = {
  note: { icon: MessageSquare, label: 'Note', isSystem: false },
  call: { icon: PhoneCall, label: 'Call', isSystem: false },
  meeting: { icon: CalendarCheck, label: 'Meeting', isSystem: false },
  status_change: { icon: ArrowRightLeft, label: 'Status Change', isSystem: true },
  email_sent: { icon: Mail, label: 'Email Sent', isSystem: true },
  system: { icon: Sparkles, label: 'System', isSystem: true },
};

// ─── NOTES TAB ──────────────────────────────────────────────
function NotesTab({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();

  const loadNotes = async () => {
    const result = await getLeadNotes(leadId);
    if (result.success && result.notes) setNotes(result.notes);
    setIsLoading(false);
  };

  useEffect(() => { loadNotes(); }, [leadId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAdding(true);
    const result = await createLeadNote(leadId, newNote.trim(), noteType);
    if (result.success) { setNewNote(''); loadNotes(); }
    else toast.error(result.error || 'Failed to add note');
    setIsAdding(false);
  };

  const handleDelete = async (noteId: string) => {
    const result = await deleteLeadNote(noteId);
    if (result.success) loadNotes();
    else toast.error('Failed to delete note');
  };

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['note', 'call', 'meeting'] as const).map((type) => {
              const config = noteTypeConfig[type];
              const TypeIcon = config.icon;
              return (
                <button key={type} onClick={() => setNoteType(type)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    noteType === type ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50'
                  }`}>
                  <TypeIcon className="w-3 h-3" />{config.label}
                </button>
              );
            })}
          </div>
          <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || isAdding} className="rounded-xl gap-1.5 h-7 text-xs">
            {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet</p>
      ) : (
        <div className="space-y-1 relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border/50" />
          {notes.map((note) => {
            const config = noteTypeConfig[note.note_type] || noteTypeConfig.note;
            const NoteIcon = config.icon;
            const isSystem = config.isSystem;
            return (
              <div key={note.id} className="relative pl-8 group">
                <div className={`absolute left-1.5 top-2.5 w-3 h-3 rounded-full z-10 ${isSystem ? 'bg-muted border border-border' : 'bg-primary/20 border-2 border-primary'}`} />
                <div className={`py-2 px-3 rounded-lg border-l-2 ${isSystem ? 'border-l-muted-foreground/30' : 'border-l-primary/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-relaxed ${isSystem ? 'text-muted-foreground italic' : 'text-foreground'}`}>{note.content}</p>
                    {note.user_id === user?.id && !isSystem && (
                      <button onClick={() => handleDelete(note.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><NoteIcon className="w-2.5 h-2.5" />{config.label}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(note.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export function LeadDetailSheet({ lead, open, onClose, onLeadUpdated, campaigns, onAssignToCampaign, onStatusChange }: LeadDetailSheetProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [localProfileData, setLocalProfileData] = useState<any>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState<GeneratedOutreach | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const { isConnected, sendEmail } = useEmailConnection();
  const [emailHistory, setEmailHistory] = useState<OutreachMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [emailLogMap, setEmailLogMap] = useState<Record<string, { opened_at: string | null; clicked_at: string | null }>>({});
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (lead && open) {
      trackEvent('candidate_viewed', { leadId: lead.id });
      setLocalProfileData(lead.profile_data || null);
      setActiveTab('profile');
      setIsLoadingHistory(true);

      Promise.all([
        getOutreachMessages(lead.id),
        supabase.from('email_log').select('subject, sent_at, opened_at, clicked_at, metadata').filter('metadata->>lead_id', 'eq', lead.id),
      ]).then(([outreachResult, logResult]) => {
        if (outreachResult.success && outreachResult.messages) setEmailHistory(outreachResult.messages.slice(0, 10));
        if (logResult.data) {
          const map: Record<string, { opened_at: string | null; clicked_at: string | null }> = {};
          for (const log of logResult.data) {
            const key = `${log.subject}|${log.sent_at?.substring(0, 16)}`;
            map[key] = { opened_at: log.opened_at, clicked_at: log.clicked_at };
          }
          setEmailLogMap(map);
        }
      }).finally(() => setIsLoadingHistory(false));
    } else {
      setEmailHistory([]);
      setExpandedEmailId(null);
      setEmailLogMap({});
    }
  }, [lead?.id, open]);

  useEffect(() => {
    if (generatedOutreach) {
      setEditedSubject(generatedOutreach.subject);
      setEditedBody(generatedOutreach.body);
    }
  }, [generatedOutreach]);

  if (!lead) return null;

  const profileData = localProfileData;
  const linkedinData: LinkedInProfile | null = profileData?.linkedin || null;
  const isEnriched = !!linkedinData;
  const linkedinUrl = lead.linkedin_url || profileData?.linkedin?.linkedinUrl;

  const matchScore = profileData?.match_score;
  const scoreColor = matchScore != null ? (matchScore >= 75 ? 'text-emerald-500' : matchScore >= 50 ? 'text-amber-500' : 'text-red-500') : 'text-muted-foreground';
  const scoreBorderColor = matchScore != null ? (matchScore >= 75 ? 'border-emerald-500' : matchScore >= 50 ? 'border-amber-500' : 'border-red-500') : 'border-border';
  const scoreBg = matchScore != null ? (matchScore >= 75 ? 'bg-emerald-500/10' : matchScore >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10') : 'bg-muted/30';

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleEnrich = async () => {
    if (!linkedinUrl) { toast.error('No LinkedIn URL available'); return; }
    setIsEnriching(true);
    try {
      const result = await enrichLeadWithLinkedIn(lead.id, linkedinUrl);
      if (result.success && result.profile) {
        setLocalProfileData({ ...localProfileData, linkedin: result.profile, linkedin_enriched_at: new Date().toISOString() });
        toast.success('LinkedIn profile enriched successfully');
        onLeadUpdated?.();
      } else toast.error(result.error || 'Failed to enrich profile');
    } catch { toast.error('Failed to enrich LinkedIn profile'); }
    finally { setIsEnriching(false); }
  };

  const handleGenerateOutreach = async () => {
    setIsGeneratingOutreach(true);
    try {
      const outreachResult = await generateOutreach({ lead });
      if (!outreachResult.success || !outreachResult.outreach) {
        toast.error(outreachResult.error || 'Failed to generate outreach');
        return;
      }
      setGeneratedOutreach(outreachResult.outreach);
    } catch { toast.error('Failed to generate outreach'); }
    finally { setIsGeneratingOutreach(false); }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const recipientEmail = lead.email || linkedinData?.email;
      if (!recipientEmail) { toast.error('No email address available'); return; }
      const result = await sendEmail({ leadId: lead.id, to: recipientEmail, subject: editedSubject, body: editedBody });
      if (result.success) {
        toast.success(`Email sent to ${lead.name}`);
        setGeneratedOutreach(null);
        onLeadUpdated?.();
      }
    } catch { toast.error('Failed to send email'); }
    finally { setIsSendingEmail(false); }
  };

  // Parse credentials
  const licenses = profileData?.licenses ? (typeof profileData.licenses === 'string' ? profileData.licenses.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean) : Array.isArray(profileData.licenses) ? profileData.licenses : []) : [];
  const certifications = profileData?.certifications ? (typeof profileData.certifications === 'string' ? profileData.certifications.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean) : Array.isArray(profileData.certifications) ? profileData.certifications : []) : [];

  // Summary text
  const summaryText = profileData?.summary || linkedinData?.summary || profileData?.enrichments?.[0]?.text?.substring(0, 300) || null;

  // Campaign name
  const assignedCampaign = campaigns?.find(c => c.id === lead.campaign_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[580px] bg-background border-l border-border/50 p-0 flex flex-col overflow-hidden">
        {/* ─── HEADER ─── */}
        <div className="flex-shrink-0 border-b border-border/50">
          <div className="relative">
            <div className="absolute inset-0 h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
            {linkedinData?.backgroundPicture && (
              <div className="absolute inset-0 h-20 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${linkedinData.backgroundPicture})` }} />
            )}
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="relative px-5 pt-5 pb-4">
            <div className="flex items-start gap-4">
              {/* Avatar + Match Score */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-16 h-16 ring-2 ring-background shadow-lg">
                  <AvatarImage src={linkedinData?.profilePicture} alt={lead.name} className="object-cover" />
                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                {isEnriched && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
                )}
              </div>

              {/* Name + Title + Location */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-lg font-bold text-foreground truncate leading-tight">
                  {linkedinData?.fullName || lead.name}
                </h2>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {linkedinData?.headline || [lead.title, lead.company].filter(Boolean).join(' at ')}
                </p>
                {(lead.location || linkedinData?.jobLocation) && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{lead.location || linkedinData?.jobLocation}</span>
                  </div>
                )}
                {!isEnriched && linkedinUrl && (
                  <button onClick={handleEnrich} disabled={isEnriching}
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline">
                    {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {isEnriching ? 'Enriching...' : 'Enrich with LinkedIn'}
                  </button>
                )}
              </div>

              {/* Match Score Circle */}
              <div className={`flex-shrink-0 w-14 h-14 rounded-full border-2 ${scoreBorderColor} ${scoreBg} flex flex-col items-center justify-center`}>
                <span className={`text-lg font-bold leading-none ${scoreColor}`}>
                  {matchScore != null ? matchScore : '—'}
                </span>
                {matchScore != null && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">match</span>}
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center gap-2 mt-4">
              {/* Status Select */}
              <Select value={lead.status || 'new'} onValueChange={(val) => onStatusChange?.(lead.id, val)}>
                <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[100px] border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assign to Job */}
              {campaigns && campaigns.length > 0 && (
                <Select value={lead.campaign_id || ''} onValueChange={(val) => onAssignToCampaign?.(lead.id, val)}>
                  <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[120px] border-border/50">
                    <SelectValue placeholder="Assign to Job" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(c => (
                      <SelectItem key={c.id} value={c.id!} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Generate Outreach */}
              <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs ml-auto" disabled={!isConnected || isGeneratingOutreach}
                onClick={() => { handleGenerateOutreach(); setActiveTab('outreach'); }}>
                {isGeneratingOutreach ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Outreach
              </Button>
            </div>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-10 px-5">
            <TabsTrigger value="profile" className="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Profile</TabsTrigger>
            <TabsTrigger value="match" className="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Match Analysis</TabsTrigger>
            <TabsTrigger value="outreach" className="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Outreach</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Notes</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* ═══ TAB 1: PROFILE ═══ */}
            <TabsContent value="profile" className="mt-0 px-5 py-4 space-y-5">
              {/* A — Summary */}
              {summaryText && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h4>
                  <p className="text-sm text-foreground leading-relaxed">{summaryText}</p>
                </div>
              )}

              {/* B — Credentials */}
              {(licenses.length > 0 || certifications.length > 0 || profileData?.specialty || profileData?.years_experience) && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credentials</h4>
                  <div className="space-y-3">
                    {licenses.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Licenses</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {licenses.map((lic: string, i: number) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                              profileData?.license_match ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                            }`}>
                              <ShieldCheck className="w-3 h-3" />{lic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {certifications.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Certifications</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {certifications.map((cert: string, i: number) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                              profileData?.cert_match ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' : 'border-border bg-muted/50 text-muted-foreground'
                            }`}>
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {profileData?.specialty && (
                        <span><span className="text-muted-foreground">Specialty:</span> <strong>{profileData.specialty}</strong></span>
                      )}
                      {(profileData?.years_experience || linkedinData?.totalExperienceYears) && (
                        <span><span className="text-muted-foreground">Experience:</span> <strong>{profileData?.years_experience || Math.round(linkedinData?.totalExperienceYears || 0)} years</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* C — Work Experience */}
              {(() => {
                const experiences = linkedinData?.experiences;
                if (experiences && experiences.length > 0) {
                  return (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Work Experience</h4>
                      <div className="space-y-3">
                        {experiences.map((exp: any, idx: number) => (
                          <div key={idx} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                            {exp.companyLogo ? (
                              <img src={exp.companyLogo} alt="" className="w-9 h-9 rounded-lg object-cover bg-muted flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground leading-tight">{exp.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{exp.companyName}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {exp.startDate} – {exp.stillWorking ? 'Present' : exp.endDate}
                                </span>
                                {exp.employmentType && (
                                  <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">{exp.employmentType}</Badge>
                                )}
                              </div>
                              {exp.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                // Not enriched fallback
                if (lead.title || lead.company) {
                  return (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Work Experience</h4>
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-sm font-medium text-foreground">{lead.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{lead.company}</p>
                      </div>
                      {linkedinUrl && !isEnriched && (
                        <button onClick={handleEnrich} disabled={isEnriching}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
                          🔗 Enrich with LinkedIn for full work history
                        </button>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* D — Education */}
              {linkedinData?.educations && linkedinData.educations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Education</h4>
                  <div className="space-y-2">
                    {linkedinData.educations.map((edu: any, idx: number) => (
                      <div key={idx} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                        {edu.logo ? (
                          <img src={edu.logo} alt="" className="w-9 h-9 rounded-lg object-cover bg-muted flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{edu.schoolName}</p>
                          {(edu.degree || edu.fieldOfStudy) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}</p>
                          )}
                          {(edu.startDate || edu.endDate) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* E — Skills */}
              {(() => {
                const skills = linkedinData?.skills?.map((s: any) => s.title || s) || [];
                if (skills.length === 0) return null;
                return (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground border border-border/50">{skill}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* F — Languages */}
              {linkedinData?.languages && linkedinData.languages.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedinData.languages.map((lang: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full bg-muted/50 text-xs text-foreground border border-border/50">{lang.name || lang}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* G — Contact */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
                <div className="space-y-1.5">
                  {(lead.email || linkedinData?.email) && (
                    <a href={`mailto:${lead.email || linkedinData?.email}`} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground">
                      <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                      {lead.email || linkedinData?.email}
                    </a>
                  )}
                  {(lead.phone || linkedinData?.mobileNumber) && (
                    <a href={`tel:${lead.phone || linkedinData?.mobileNumber}`} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      {lead.phone || linkedinData?.mobileNumber}
                    </a>
                  )}
                  {linkedinUrl && (
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground">
                      <Linkedin className="w-4 h-4 text-[#0077B5] flex-shrink-0" />
                      <span className="flex-1">LinkedIn Profile</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ═══ TAB 2: MATCH ANALYSIS ═══ */}
            <TabsContent value="match" className="mt-0 px-5 py-4 space-y-5">
              {/* Overall Score */}
              <div className="flex flex-col items-center py-6">
                <div className={`w-24 h-24 rounded-full border-4 ${scoreBorderColor} ${scoreBg} flex flex-col items-center justify-center`}>
                  <span className={`text-3xl font-bold leading-none ${scoreColor}`}>
                    {matchScore != null ? matchScore : '—'}
                  </span>
                  {matchScore != null && <span className="text-xs text-muted-foreground mt-0.5">% Match</span>}
                </div>
                {assignedCampaign && (
                  <p className="text-xs text-muted-foreground mt-3">for {assignedCampaign.name}</p>
                )}
                {!assignedCampaign && profileData?.search_query && (
                  <p className="text-xs text-muted-foreground mt-3">for "{profileData.search_query}"</p>
                )}
              </div>

              {/* Scoring Breakdown 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: ShieldCheck, title: 'License Verification',
                    match: profileData?.license_match,
                    detail: licenses.length > 0 ? `Has: ${licenses.join(', ')}` : 'No license data',
                  },
                  {
                    icon: Award, title: 'Certifications',
                    match: profileData?.cert_match,
                    detail: certifications.length > 0 ? `Has: ${certifications.join(', ')}` : 'No certification data',
                  },
                  {
                    icon: Briefcase, title: 'Experience',
                    match: profileData?.experience_match,
                    detail: `${profileData?.years_experience || linkedinData?.totalExperienceYears || '?'} years total${profileData?.specialty ? ` · ${profileData.specialty}` : ''}`,
                  },
                  {
                    icon: MapPin, title: 'Location',
                    match: profileData?.location_match,
                    detail: `Based in ${lead.location || linkedinData?.jobLocation || 'Unknown'}`,
                  },
                ].map(({ icon: Icon, title, match, detail }) => (
                  <div key={title} className="rounded-xl bg-muted/30 border border-border/50 p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{title}</span>
                    </div>
                    <div className="mb-1.5">
                      {match === true ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                          <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                        </span>
                      ) : match === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">✗ NO MATCH</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>

              {/* AI Reasoning */}
              {profileData?.scoring_notes && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{profileData.scoring_notes}</p>
                </div>
              )}

              {matchScore == null && !profileData?.scoring_notes && (
                <p className="text-sm text-muted-foreground text-center py-4">No match analysis available for this candidate.</p>
              )}
            </TabsContent>

            {/* ═══ TAB 3: OUTREACH ═══ */}
            <TabsContent value="outreach" className="mt-0 px-5 py-4 space-y-5">
              {/* Email connection warning */}
              {!isConnected && (
                <div className="flex items-center gap-2 text-xs text-amber-500 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Connect your Gmail in Settings to send emails</span>
                </div>
              )}

              {/* Compose area */}
              {generatedOutreach ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs">
                    <Send className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Sending to <strong>{lead.email || linkedinData?.email || 'No email'}</strong></span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Subject</label>
                    <input type="text" value={editedSubject} onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Body</label>
                    <textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} rows={8}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">Signature will be appended from your settings</p>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 rounded-lg" disabled={isSendingEmail} onClick={handleSendEmail}>
                      {isSendingEmail ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <><Send className="w-4 h-4" />Send Email</>}
                    </Button>
                    <Button variant="outline" className="rounded-lg" onClick={() => setGeneratedOutreach(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Button className="gap-2 rounded-lg" disabled={!isConnected || isGeneratingOutreach} onClick={handleGenerateOutreach}>
                    {isGeneratingOutreach ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Send className="w-4 h-4" />Generate Outreach</>}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">AI will craft a personalized email based on the candidate's profile</p>
                </div>
              )}

              {/* Email History */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email History</h4>
                {isLoadingHistory ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
                ) : emailHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No emails sent yet</p>
                ) : (
                  <div className="space-y-2 relative">
                    <div className="absolute left-4 top-3 bottom-3 w-px bg-border/50" />
                    {emailHistory.map((msg) => {
                      const logKey = `${msg.subject}|${msg.sent_at?.substring(0, 16)}`;
                      const logData = emailLogMap[logKey];
                      return (
                        <div key={msg.id} className="relative pl-8 cursor-pointer" onClick={() => setExpandedEmailId(expandedEmailId === msg.id ? null : msg.id!)}>
                          <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary z-10" />
                          <div className="rounded-lg bg-muted/30 border border-border/50 p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">
                                {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Draft'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {logData?.opened_at && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500"><Eye className="w-3 h-3" />Opened</span>}
                                {logData?.clicked_at && <span className="inline-flex items-center gap-1 text-[10px] text-blue-500"><MousePointerClick className="w-3 h-3" />Clicked</span>}
                                <Badge variant="outline" className="text-[10px] capitalize">{msg.status || 'sent'}</Badge>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{msg.subject || 'No subject'}</p>
                            {expandedEmailId === msg.id && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{msg.body}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ═══ TAB 4: NOTES ═══ */}
            <TabsContent value="notes" className="mt-0 px-5 py-4">
              <NotesTab leadId={lead.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
