import { Lock, Mail, Phone, Linkedin, MapPin, Briefcase, Building, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface BlurredLead {
  name: string;
  title: string;
  company: string;
  location: string;
  email_available: boolean;
  linkedin_available: boolean;
  phone_available: boolean;
}

interface BlurredLeadCardProps {
  lead: BlurredLead;
  index: number;
}

export function BlurredLeadCard({ lead, index }: BlurredLeadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.08, 
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        scale: 1.02, 
        transition: { duration: 0.2 } 
      }}
      className="relative p-4 rounded-2xl bg-gradient-to-br from-card/80 via-card/60 to-card/40 border border-border/40 backdrop-blur-xl group overflow-hidden"
    >
      {/* Ambient glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top shine line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start gap-4 min-w-0">
        {/* Avatar with gradient ring */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">
              {lead.name.charAt(0)}
            </span>
          </div>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border-2 border-background flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
          {/* Name */}
          <h4 className="font-semibold text-foreground truncate text-base">{lead.name}</h4>

          {/* Title */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Briefcase className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span className="truncate min-w-0">{lead.title}</span>
          </div>

          {/* Company - blurred */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Building className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span className="text-muted-foreground blur-[5px] select-none truncate min-w-0 flex-1">{lead.company}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <Lock className="w-2.5 h-2.5 text-primary" />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span className="truncate min-w-0">{lead.location}</span>
          </div>
        </div>
      </div>

      {/* Contact info - locked with premium styling */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/30 max-w-full overflow-hidden">
        {lead.email_available && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 min-w-0 max-w-full"
          >
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground blur-[4px] select-none truncate max-w-[9rem]">email@***</span>
            <Lock className="w-3 h-3 text-primary/60" />
          </motion.div>
        )}

        {lead.linkedin_available && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 min-w-0 max-w-full"
          >
            <Linkedin className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground blur-[4px] select-none truncate max-w-[9rem]">linkedin/***</span>
            <Lock className="w-3 h-3 text-primary/60" />
          </motion.div>
        )}

        {lead.phone_available && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 min-w-0 max-w-full"
          >
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground blur-[4px] select-none truncate max-w-[9rem]">+1 ***</span>
            <Lock className="w-3 h-3 text-primary/60" />
          </motion.div>
        )}
      </div>

      {/* Hover overlay with unlock prompt */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/20 via-primary/10 to-transparent flex items-end justify-center pb-4 pointer-events-none"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm border border-primary/30 shadow-lg shadow-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Sign up to unlock</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
