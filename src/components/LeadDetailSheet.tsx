import { useState, useEffect } from 'react';
import { Lead } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { 
  Mail, 
  Phone, 
  Linkedin, 
  Building2, 
  MapPin,
  Calendar,
  Send,
  X,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  Loader2,
  CheckCircle2,
  Globe,
  Users,
  Clock,
  Languages,
  ExternalLink,
  BadgeCheck,
  Crown,
  Heart,
  ChevronRight,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { enrichLeadWithLinkedIn, LinkedInProfile, getOutreachMessages, OutreachMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useEmailConnection } from '@/hooks/useEmailConnection';
import { generateOutreach, GeneratedOutreach } from '@/lib/api';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

// Section wrapper for consistent styling
const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`space-y-3 ${className}`}>{children}</div>
);

// Section header with icon
const SectionHeader = ({ icon: Icon, children, count }: { icon: any; children: React.ReactNode; count?: number }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
    <h3 className="text-sm font-medium text-foreground tracking-tight">{children}</h3>
    {count !== undefined && (
      <span className="text-xs text-muted-foreground ml-auto">{count}</span>
    )}
  </div>
);

// Card wrapper for items
const ItemCard = ({ children, className = "", hover = false, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }) => (
  <div onClick={onClick} className={`rounded-xl bg-muted/30 border border-border/50 p-3.5 ${hover ? 'hover:bg-muted/50 transition-colors cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
);

// Stat pill component
const StatPill = ({ icon: Icon, children, color = "muted" }: { icon: any; children: React.ReactNode; color?: string }) => {
  const colorClasses: Record<string, string> = {
    muted: "bg-muted/50 text-muted-foreground",
    blue: "bg-blue-500/10 text-blue-500",
    amber: "bg-amber-500/10 text-amber-500",
    purple: "bg-purple-500/10 text-purple-500",
    green: "bg-green-500/10 text-green-500",
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      <Icon className="w-3 h-3" />
      {children}
    </span>
  );
};

export function LeadDetailSheet({ lead, open, onClose, onLeadUpdated }: LeadDetailSheetProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [localProfileData, setLocalProfileData] = useState<any>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState<GeneratedOutreach | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const { isConnected, sendEmail } = useEmailConnection();
  const [emailHistory, setEmailHistory] = useState<OutreachMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Sync local state when lead changes or when sheet opens
  useEffect(() => {
    if (lead && open) {
      setLocalProfileData(lead.profile_data || null);
      // Load email history
      setIsLoadingHistory(true);
      getOutreachMessages(lead.id).then(result => {
        if (result.success && result.messages) {
          setEmailHistory(result.messages.slice(0, 10));
        }
      }).finally(() => setIsLoadingHistory(false));
    } else {
      setEmailHistory([]);
      setExpandedEmailId(null);
    }
  }, [lead?.id, open]);

  // Sync edited values when outreach is generated
  useEffect(() => {
    if (generatedOutreach) {
      setEditedSubject(generatedOutreach.subject);
      setEditedBody(generatedOutreach.body);
    }
  }, [generatedOutreach]);

  if (!lead) return null;

  // Use local enriched data (updates immediately after enrichment)
  const profileData = localProfileData;
  const linkedinData: LinkedInProfile | null = profileData?.linkedin || null;
  const isEnriched = !!linkedinData;
  const linkedinUrl = lead.linkedin_url || profileData?.linkedin?.linkedinUrl;
  const enrichedAt = profileData?.linkedin_enriched_at;
  const exaEnrichments = profileData?.enrichments || [];

  const handleEnrich = async () => {
    if (!linkedinUrl) {
      toast.error('No LinkedIn URL available for this lead');
      return;
    }

    setIsEnriching(true);
    try {
      const result = await enrichLeadWithLinkedIn(lead.id, linkedinUrl);
      if (result.success && result.profile) {
        // Update local state immediately with enriched data
        setLocalProfileData({
          ...localProfileData,
          linkedin: result.profile,
          linkedin_enriched_at: new Date().toISOString(),
        });
        toast.success('LinkedIn profile enriched successfully');
        onLeadUpdated?.();
      } else {
        toast.error(result.error || 'Failed to enrich profile');
      }
    } catch (error) {
      toast.error('Failed to enrich LinkedIn profile');
    } finally {
      setIsEnriching(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return null;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[480px] bg-background border-l border-border/50 p-0 flex flex-col overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative flex-shrink-0">
          {/* Background gradient or image */}
          <div className="absolute inset-0 h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          {linkedinData?.backgroundPicture && (
            <div 
              className="absolute inset-0 h-32 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${linkedinData.backgroundPicture})` }}
            />
          )}
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Profile section */}
          <div className="relative pt-6 px-6 pb-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="w-16 h-16 ring-4 ring-background shadow-xl flex-shrink-0">
                <AvatarImage src={linkedinData?.profilePicture} alt={lead.name} className="object-cover" />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-lg font-semibold text-foreground truncate tracking-tight">
                  {linkedinData?.fullName || lead.name}
                </h2>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {linkedinData?.headline || lead.title}
                </p>
              </div>
            </div>

            {/* Stats pills */}
            {isEnriched && (
              <div className="flex flex-wrap gap-2 mt-4">
                {linkedinData?.isVerified && (
                  <StatPill icon={BadgeCheck} color="blue">Verified</StatPill>
                )}
                {linkedinData?.isPremium && (
                  <StatPill icon={Crown} color="amber">Premium</StatPill>
                )}
                {linkedinData?.connections && (
                  <StatPill icon={Users} color="muted">{formatNumber(linkedinData.connections)}+</StatPill>
                )}
                {linkedinData?.totalExperienceYears && linkedinData.totalExperienceYears > 0 && (
                  <StatPill icon={Briefcase} color="muted">{Math.round(linkedinData.totalExperienceYears)} yrs</StatPill>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            
            {/* Enrichment CTA */}
            {linkedinUrl && !isEnriched && (
              <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Enrich with LinkedIn</p>
                      <p className="text-xs text-muted-foreground">Get full profile details</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleEnrich}
                    disabled={isEnriching}
                    className="rounded-xl gap-2 px-4"
                  >
                    {isEnriching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Enriched badge */}
            {isEnriched && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-green-500 font-medium">LinkedIn Enriched</span>
                {enrichedAt && (
                  <span className="text-muted-foreground">· {new Date(enrichedAt).toLocaleDateString()}</span>
                )}
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/30 border border-border/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Score</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {lead.profile_data?.match_score ?? (lead.profile_data?.exa_score ? Math.round(lead.profile_data.exa_score * 100) : '—')}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/30 border border-border/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant="outline" className="mt-2 capitalize font-medium">
                  {lead.status}
                </Badge>
              </div>
            </div>

            {/* About */}
            {linkedinData?.summary && (
              <Section>
                <SectionHeader icon={Linkedin}>About</SectionHeader>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {linkedinData.summary}
                </p>
              </Section>
            )}

            {/* Contact */}
            <Section>
              <SectionHeader icon={Mail}>Contact</SectionHeader>
              <div className="space-y-2">
                {(lead.email || linkedinData?.email) && (
                  <ItemCard>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">{lead.email || linkedinData?.email}</span>
                    </div>
                  </ItemCard>
                )}
                {(lead.phone || linkedinData?.mobileNumber) && (
                  <ItemCard>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-foreground">{lead.phone || linkedinData?.mobileNumber}</span>
                    </div>
                  </ItemCard>
                )}
                {linkedinUrl && (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <ItemCard hover>
                      <div className="flex items-center gap-3">
                        <Linkedin className="w-4 h-4 text-[#0077B5] flex-shrink-0" />
                        <span className="text-sm text-foreground flex-1">LinkedIn Profile</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </ItemCard>
                  </a>
                )}
              </div>
            </Section>

            {/* Company */}
            <Section>
              <SectionHeader icon={Building2}>Company</SectionHeader>
              <ItemCard>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.company || linkedinData?.companyName}</p>
                    {(lead.industry || linkedinData?.companyIndustry) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.industry || linkedinData?.companyIndustry}
                        {linkedinData?.companySize && ` · ${linkedinData.companySize}`}
                      </p>
                    )}
                  </div>
                  
                  {(lead.location || linkedinData?.jobLocation) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {lead.location || linkedinData?.jobLocation}
                    </div>
                  )}
                  
                  {linkedinData?.currentJobDuration && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {linkedinData.currentJobDuration} in role
                    </div>
                  )}

                  {/* Links row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {linkedinData?.companyWebsite && (
                      <a 
                        href={linkedinData.companyWebsite.startsWith('http') ? linkedinData.companyWebsite : `https://${linkedinData.companyWebsite}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    {linkedinData?.companyLinkedin && (
                      <a 
                        href={linkedinData.companyLinkedin}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#0077B5] hover:underline"
                      >
                        <Linkedin className="w-3 h-3" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </ItemCard>
            </Section>

            {/* Experience */}
            {linkedinData?.experiences && linkedinData.experiences.length > 0 && (
              <Section>
                <SectionHeader icon={Briefcase} count={linkedinData.experiences.length}>Experience</SectionHeader>
                <div className="space-y-2">
                  {linkedinData.experiences.slice(0, 4).map((exp, idx) => (
                    <ItemCard key={idx}>
                      <div className="flex gap-3">
                        {exp.companyLogo ? (
                          <img 
                            src={exp.companyLogo} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover bg-muted flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{exp.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{exp.companyName}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {exp.startDate} – {exp.stillWorking ? 'Present' : exp.endDate}
                            </span>
                            {exp.employmentType && (
                              <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">{exp.employmentType}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </ItemCard>
                  ))}
                  {linkedinData.experiences.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{linkedinData.experiences.length - 4} more
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Education */}
            {linkedinData?.educations && linkedinData.educations.length > 0 && (
              <Section>
                <SectionHeader icon={GraduationCap} count={linkedinData.educations.length}>Education</SectionHeader>
                <div className="space-y-2">
                  {linkedinData.educations.slice(0, 3).map((edu, idx) => (
                    <ItemCard key={idx}>
                      <div className="flex gap-3">
                        {edu.logo ? (
                          <img 
                            src={edu.logo} 
                            alt="" 
                            className="w-10 h-10 rounded-lg object-cover bg-muted flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{edu.schoolName}</p>
                          {(edu.degree || edu.fieldOfStudy) && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </ItemCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Skills */}
            {linkedinData?.skills && linkedinData.skills.length > 0 && (
              <Section>
                <SectionHeader icon={Sparkles} count={linkedinData.skills.length}>Skills</SectionHeader>
                <div className="flex flex-wrap gap-1.5">
                  {linkedinData.skills.slice(0, 10).map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground border border-border/50"
                    >
                      {skill.title}
                    </span>
                  ))}
                  {linkedinData.skills.length > 10 && (
                    <span className="px-2.5 py-1 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      +{linkedinData.skills.length - 10}
                    </span>
                  )}
                </div>
              </Section>
            )}

            {/* Certifications */}
            {linkedinData?.certifications && linkedinData.certifications.length > 0 && (
              <Section>
                <SectionHeader icon={Award} count={linkedinData.certifications.length}>Certifications</SectionHeader>
                <div className="space-y-2">
                  {linkedinData.certifications.slice(0, 3).map((cert, idx) => (
                    <ItemCard key={idx}>
                      <p className="text-sm font-medium text-foreground">{cert.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[cert.authority, cert.issueDate].filter(Boolean).join(' · ')}
                      </p>
                    </ItemCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Languages */}
            {linkedinData?.languages && linkedinData.languages.length > 0 && (
              <Section>
                <SectionHeader icon={Languages}>Languages</SectionHeader>
                <div className="flex flex-wrap gap-2">
                  {linkedinData.languages.map((lang, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1.5 rounded-xl bg-muted/50 text-xs text-foreground border border-border/50"
                    >
                      {lang.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Volunteer */}
            {linkedinData?.volunteerExperience && linkedinData.volunteerExperience.length > 0 && (
              <Section>
                <SectionHeader icon={Heart}>Volunteer</SectionHeader>
                <div className="space-y-2">
                  {linkedinData.volunteerExperience.slice(0, 2).map((vol, idx) => (
                    <ItemCard key={idx}>
                      <p className="text-sm font-medium text-foreground">{vol.role}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{vol.organization}</p>
                    </ItemCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Related profiles */}
            {linkedinData?.relatedProfiles && linkedinData.relatedProfiles.length > 0 && (
              <Section>
                <SectionHeader icon={Users}>Similar Profiles</SectionHeader>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {linkedinData.relatedProfiles.slice(0, 5).map((person, idx) => (
                    <a
                      key={idx}
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-24 text-center group"
                    >
                      <Avatar className="w-12 h-12 mx-auto ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                        <AvatarImage src={person.profilePicture} alt={person.name} />
                        <AvatarFallback className="text-xs bg-muted">
                          {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium text-foreground mt-2 truncate">{person.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{person.headline?.split(' ')[0]}</p>
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* AI Insights */}
            {exaEnrichments.filter((e: any) => e.reasoning).length > 0 && (
              <Section>
                <SectionHeader icon={Sparkles}>AI Insights</SectionHeader>
                <div className="space-y-2">
                  {exaEnrichments.filter((e: any) => e.reasoning).slice(0, 2).map((enrichment: any, idx: number) => (
                    <ItemCard key={idx}>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {enrichment.reasoning}
                      </p>
                    </ItemCard>
                  ))}
                </div>
              </Section>
            )}

            {/* Email History */}
            <Section>
              <SectionHeader icon={Mail} count={emailHistory.length}>Email History</SectionHeader>
              {isLoadingHistory ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : emailHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emails sent yet</p>
              ) : (
                <div className="space-y-2 relative">
                  <div className="absolute left-5 top-4 bottom-4 w-px bg-border/50" />
                  {emailHistory.map((msg) => (
                    <div key={msg.id} className="relative pl-8">
                      <div className="absolute left-3.5 top-3 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary z-10" />
                      <ItemCard hover className="cursor-pointer" onClick={() => setExpandedEmailId(expandedEmailId === msg.id ? null : msg.id!)}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            ✉️ {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Draft'}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize">{msg.status || 'sent'}</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{msg.subject || 'No subject'}</p>
                        {expandedEmailId === msg.id && (
                          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{msg.body}</p>
                        )}
                      </ItemCard>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section>
              <SectionHeader icon={Calendar}>Activity</SectionHeader>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Added {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</span>
                {lead.updated_at && (
                  <span>Last updated {new Date(lead.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </Section>

            {/* Notes */}
            {lead.profile_data?.summary && (
              <Section>
                <SectionHeader icon={Calendar}>Notes</SectionHeader>
                <p className="text-sm text-muted-foreground">{lead.profile_data.summary}</p>
              </Section>
            )}
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          {!isConnected && (
            <div className="flex items-center gap-2 text-xs text-amber-500 mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Connect your Gmail in Settings to send emails</span>
            </div>
          )}
          <div className="flex gap-3">
            <Button 
              className="flex-1 gap-2 rounded-xl h-11"
              disabled={!isConnected || isGeneratingOutreach}
              onClick={async () => {
                setIsGeneratingOutreach(true);
                try {
                  // Generate outreach first
                  const outreachResult = await generateOutreach({ lead });
                  if (!outreachResult.success || !outreachResult.outreach) {
                    toast.error(outreachResult.error || 'Failed to generate outreach');
                    return;
                  }
                  
                  // Show editable dialog instead of sending immediately
                  setGeneratedOutreach(outreachResult.outreach);
                  setShowOutreachDialog(true);
                } catch (error) {
                  toast.error('Failed to generate outreach');
                } finally {
                  setIsGeneratingOutreach(false);
                }
              }}
            >
              {isGeneratingOutreach ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Outreach
                </>
              )}
            </Button>
            {(lead.email || linkedinData?.email) && (
              <Button 
                variant="outline" 
                size="icon"
                className="rounded-xl h-11 w-11"
                onClick={() => window.location.href = `mailto:${lead.email || linkedinData?.email}`}
              >
                <Mail className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Outreach Edit Dialog */}
        {showOutreachDialog && generatedOutreach && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold text-foreground">Edit & Send Outreach</h3>
              <button 
                onClick={() => setShowOutreachDialog(false)}
                className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Send className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">Sending to <strong>{lead.email || linkedinData?.email || 'No email'}</strong></p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Body</label>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border/50">
              <Button
                className="w-full gap-2 rounded-xl h-11"
                disabled={isSendingEmail}
                onClick={async () => {
                  setIsSendingEmail(true);
                  try {
                    const recipientEmail = lead.email || linkedinData?.email;
                    if (!recipientEmail) {
                      toast.error('No email address available');
                      return;
                    }
                    const result = await sendEmail({
                      leadId: lead.id,
                      to: recipientEmail,
                      subject: editedSubject,
                      body: editedBody,
                    });

                    if (result.success) {
                      toast.success(`Email sent to ${lead.name}`);
                      setShowOutreachDialog(false);
                      onLeadUpdated?.();
                    }
                  } catch (error) {
                    toast.error('Failed to send email');
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
