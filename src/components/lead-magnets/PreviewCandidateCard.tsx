import { Lock, MapPin, ShieldCheck, Award, Briefcase, Mail, Phone, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';

export interface PreviewCandidate {
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  specialty: string | null;
  licenses: string | null;
  certifications: string | null;
  match_score?: number;
  scoring_notes?: string;
  years_experience?: number | null;
  summary?: string | null;
}

interface PreviewCandidateCardProps {
  candidate: PreviewCandidate;
  index: number;
  isExample?: boolean;
}

export function PreviewCandidateCard({ candidate, index, isExample }: PreviewCandidateCardProps) {
  const score = candidate.match_score;
  const scoreColor = score != null
    ? score >= 75 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30'
    : score >= 50 ? 'text-amber-600 bg-amber-500/10 border-amber-500/30'
    : 'text-red-500 bg-red-500/10 border-red-500/30'
    : 'text-muted-foreground bg-muted/50 border-border';

  const licenses = candidate.licenses?.split(/[,;]+/).map(s => s.trim()).filter(Boolean) || [];
  const certifications = candidate.certifications?.split(/[,;]+/).map(s => s.trim()).filter(Boolean) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl bg-white border border-border/60 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
    >
      {isExample && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/40 via-cyan-500/40 to-primary/40" />
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <span className="text-base font-bold text-primary">{candidate.name.charAt(0)}</span>
            </div>
          </div>

          {/* Name + Title + Location */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground text-base truncate">{candidate.name}</h4>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {[candidate.title, candidate.company].filter(Boolean).join(' at ')}
                </p>
              </div>
              {/* Match score */}
              {score != null && (
                <div className={`flex-shrink-0 w-11 h-11 rounded-full border flex flex-col items-center justify-center ${scoreColor}`}>
                  <span className="text-sm font-bold leading-none">{score}</span>
                  <span className="text-[8px] leading-none mt-0.5">match</span>
                </div>
              )}
            </div>

            {candidate.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{candidate.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Credentials badges */}
        {(licenses.length > 0 || certifications.length > 0 || candidate.specialty) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {licenses.map((lic, i) => (
              <span key={`l-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />{lic}
              </span>
            ))}
            {certifications.map((cert, i) => (
              <span key={`c-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                {cert}
              </span>
            ))}
            {candidate.specialty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Briefcase className="w-3 h-3" />{candidate.specialty}
              </span>
            )}
            {candidate.years_experience && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50">
                {candidate.years_experience}+ yrs
              </span>
            )}
          </div>
        )}

        {/* Scoring notes */}
        {candidate.scoring_notes && (
          <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">{candidate.scoring_notes}</p>
        )}

        {/* Locked contact details */}
        <div className="mt-4 pt-3 border-t border-border/40">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">Contact Details</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Mail, text: 'j***@***.com' },
              { icon: Phone, text: '+1 (***) ***-****' },
              { icon: Linkedin, text: 'linkedin.com/in/***' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30">
                <Icon className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-xs text-muted-foreground blur-[4px] select-none">{text}</span>
                <Lock className="w-2.5 h-2.5 text-primary/40" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Sign up free to unlock contact info</p>
        </div>
      </div>
    </motion.div>
  );
}
