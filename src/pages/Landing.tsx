import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { ContactDialog } from '@/components/ContactDialog';
import { FreeLeadSampleModal } from '@/components/lead-magnets/FreeLeadSampleModal';
import { Users, Sparkles } from 'lucide-react';
import {
  PulseOrb, 
  SparkBurst, 
  TargetRings, 
  DataFlow, 
  CircuitLines,
  MagnetPull,
  StackedBars,
  ChatBubbles,
  GlowDot,
  DiamondShape,
} from '@/components/ui/visual-elements';

// Animated section component
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating orb component
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{
        y: [0, -30, 0],
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Feature card with custom visual
function FeatureCard({ visual: Visual, title, description, index }: { visual: React.ComponentType<{ className?: string }>; title: string; description: string; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative p-8 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-background border border-border/80 flex items-center justify-center mb-6 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
          <Visual className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// Stats item
function StatItem({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <div className="text-5xl md:text-6xl font-bold gradient-text mb-2">{value}</div>
      <div className="text-muted-foreground text-lg">{label}</div>
    </motion.div>
  );
}

// Pricing card with custom check visual
function PricingCard({ name, price, leads, features, popular, index }: { name: string; price: string; leads: string; features: string[]; popular?: boolean; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const navigate = useNavigate();
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative flex flex-col p-8 rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
        popular 
          ? 'border-primary/60 bg-gradient-to-b from-primary/15 via-card to-card shadow-2xl shadow-primary/20 ring-1 ring-primary/20' 
          : 'border-white/10 bg-card/80 hover:border-white/20 hover:shadow-xl ring-1 ring-white/5'
      }`}
    >
      {/* Glow effect for popular */}
      {popular && (
        <>
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-primary/30 via-transparent to-transparent opacity-50 blur-sm pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        </>
      )}
      
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="px-5 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground whitespace-nowrap shadow-lg shadow-primary/40 border border-primary-foreground/10">
            Most Popular
          </span>
        </div>
      )}
      
      {/* Content wrapper with flex-grow to push button down */}
      <div className={`flex flex-col flex-1 ${popular ? 'pt-2' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-3">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-foreground tracking-tight">{price}</span>
            <span className="text-muted-foreground text-sm font-medium">/month</span>
          </div>
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-semibold ${
            popular 
              ? 'bg-primary/20 text-primary border border-primary/30' 
              : 'bg-muted text-muted-foreground border border-border'
          }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {leads}
          </div>
        </div>
        
        {/* Features list - flex-1 to fill available space */}
        <ul className="space-y-4 mb-8 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-foreground/80 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                popular 
                  ? 'bg-primary/20 border border-primary/40' 
                  : 'bg-muted border border-border'
              }`}>
                <svg className={`w-3 h-3 ${popular ? 'text-primary' : 'text-foreground/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="leading-tight">{feature}</span>
            </li>
          ))}
        </ul>
        
        {/* Button - always at bottom due to flex layout */}
        <button 
          onClick={() => navigate('/auth')}
          className={`w-full h-14 rounded-2xl font-semibold text-base transition-all duration-300 ${
            popular 
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02]' 
              : 'bg-foreground text-background hover:opacity-90 hover:scale-[1.02]'
          }`}
        >
          Get Started
        </button>
      </div>
    </motion.div>
  );
}

// Step item with visual number
function StepItem({ number, title, description, index }: { number: number; title: string; description: string; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-6 items-start"
    >
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-background border border-border/80 flex items-center justify-center text-lg font-bold text-primary">
          {number}
        </div>
      </div>
      <div className="pt-1">
        <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appName } = useBrandConfig();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isFreeLeadSampleOpen, setIsFreeLeadSampleOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  const features = [
    { visual: MagnetPull, title: "AI-Powered Candidate Search", description: "Paste a job description and AI finds nurses with the exact certifications, experience, and location you need." },
    { visual: CircuitLines, title: "Verified Qualifications", description: "AI checks licenses, certifications, and experience so you only see qualified candidates." },
    { visual: TargetRings, title: "Contact Info Included", description: "Get email and phone numbers for every candidate — ready to reach out from within the app." },
    { visual: StackedBars, title: "Built-in Gmail Outreach", description: "Connect Gmail and send personalized recruitment emails directly from MediLead. Track opens, replies, and response rates." },
    { visual: DataFlow, title: "Job Opening Management", description: "Organize candidates by role, track pipeline progress, and see real-time stats for every open req." },
    { visual: SparkBurst, title: "AI-Written Outreach", description: "Generate personalized, role-specific recruitment messages that get responses — powered by AI." },
  ];
  
  const steps = [
    { title: "Paste the Job Description", description: "Copy your req or just type the key details — role, location, requirements. MediLead handles the rest." },
    { title: "AI Finds & Qualifies Candidates", description: "MediLead searches LinkedIn, verifies licenses and experience, and ranks the best matches for your role." },
    { title: "Reach Out From Within the App", description: "Connect your Gmail and send AI-generated, personalized recruitment emails directly — no copy-pasting needed." },
    { title: "Track Results & Fill Roles", description: "Monitor opens, replies, and response rates for every job opening. Fill roles in days, not weeks." },
  ];
  
  const pricing = [
    { name: "Starter", price: "$299", leads: "100 searches/mo", features: ["~1,000-1,500 qualified candidates", "AI-powered candidate search", "LinkedIn enrichment", "Personalized outreach emails", "Perfect for: Solo recruiters"], description: "Perfect for solo recruiters and new agencies" },
    { name: "Growth", price: "$599", leads: "300 searches/mo", popular: true, features: ["~3,000-4,500 qualified candidates", "Everything in Starter", "Advanced filtering", "Job opening management", "Analytics dashboard", "Perfect for: Teams of 2-5"], description: "For growing recruiting teams" },
    { name: "Agency", price: "$999", leads: "600 searches/mo", features: ["~6,000-9,000 qualified candidates", "Everything in Growth", "Unlimited job openings", "Team collaboration", "Custom integrations", "Perfect for: 5-20 recruiters"], description: "For established agencies" },
  ];
  
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation - Ultra Premium */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 inset-x-0 z-50 px-4"
      >
        <div className="mx-auto max-w-5xl">
          <div className="relative px-2 py-2 rounded-2xl bg-background/60 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]">
            {/* Subtle top shine */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-t-2xl" />
            
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              {/* Left: Logo */}
              <div className="flex items-center gap-3 pl-2 justify-start min-w-0">
                <div className="relative group flex-shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-primary/40 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                    <div className="w-4 h-4 rounded-full bg-white/90 shadow-inner" />
                  </div>
                </div>
                <span className="text-lg font-semibold text-foreground tracking-tight truncate">{appName}</span>
              </div>
              
              {/* Center: Nav Links (always centered) */}
              <div className="hidden md:flex items-center justify-center">
                <div className="flex items-center bg-white/[0.03] rounded-xl p-1">
                  {[
                    { label: 'Features', href: '#features' },
                    { label: 'How it Works', href: '#how-it-works' },
                    { label: 'Pricing', href: '#pricing' },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
                    >
                      {link.label}
                    </a>
                  ))}
                  <button
                    onClick={() => setIsContactOpen(true)}
                    className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.04]"
                  >
                    Contact
                  </button>
                </div>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center justify-end gap-2 pr-1">
                {user ? (
                  <button 
                    onClick={() => navigate('/dashboard')} 
                  className="h-9 px-5 rounded-xl text-sm font-medium bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_2px_8px_rgba(41,121,209,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_4px_16px_rgba(41,121,209,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                    Dashboard
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => navigate('/auth')} 
                      className="hidden sm:flex h-9 px-4 items-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => navigate('/auth')} 
                    className="h-9 px-5 rounded-xl text-sm font-medium bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_2px_8px_rgba(41,121,209,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_4px_16px_rgba(41,121,209,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 hover:-translate-y-0.5"
                  >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)_/_0.08)_0%,_transparent_60%)]" />
        <FloatingOrb className="w-96 h-96 bg-primary/30 -top-48 -right-48" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-primary/20 -bottom-40 -left-40" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-primary/25 top-1/3 right-1/4" delay={4} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-card/80 border border-border/50 text-sm font-medium mb-8 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Healthcare Candidate Sourcing</span>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-tight leading-[0.95] mb-8"
          >
            Fill healthcare roles
            <br />
            <span className="gradient-text">3x faster</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Stop wasting 4 hours per candidate. MediLead finds verified nurses, lets you reach out via Gmail, and tracks every response — all in one place.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button onClick={() => navigate('/auth')} size="lg" className="apple-button h-14 px-8 text-lg gap-2">
              Start Free Trial
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button 
              onClick={() => setIsFreeLeadSampleOpen(true)} 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-lg gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
            >
              <Users className="w-5 h-5 text-primary" />
              👥 Get 5 Free Candidates
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-16 text-sm text-muted-foreground/60"
          >
            Trusted by 100+ healthcare recruiters
          </motion.div>
        </motion.div>
        
      </section>
      
      {/* Smooth transition gradient */}
      <div className="h-32 bg-gradient-to-b from-transparent via-background/50 to-background" />
      
      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16">
            <StatItem value="10-15" label="Candidates per Search" index={0} />
            <StatItem value="2min" label="Per Search" index={1} />
            <StatItem value="3x" label="Faster Than Manual" index={2} />
            <StatItem value="70%+" label="Contact Info Rate" index={3} />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Built for Healthcare Recruiters
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Here's How MediLead Helps
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find nurses with the exact certifications, experience, and location you need — automatically.
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Wave divider - top */}
      <div className="relative h-24 bg-background">
        <svg className="absolute bottom-0 w-full h-24" viewBox="0 0 1440 96" preserveAspectRatio="none" fill="none">
          <path d="M0,96 L0,40 Q360,0 720,40 T1440,40 L1440,96 Z" fill="white" />
        </svg>
      </div>
      
      {/* How it Works Section - Light theme */}
      <section id="how-it-works" className="py-24 px-6 relative bg-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/3 to-transparent rounded-full" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-6">
              From Job Req to Contact Info in 3 Steps
            </h2>
            <p className="text-xl text-neutral-500 max-w-2xl mx-auto">
              Paste a job description, get qualified candidates with contact info in minutes.
            </p>
          </AnimatedSection>
          
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-6 items-start p-6 rounded-2xl bg-neutral-50/80 border border-neutral-100 hover:bg-white hover:shadow-xl hover:shadow-neutral-200/50 transition-all duration-300"
              >
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary/25">
                    {i + 1}
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">{step.title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Wave divider - bottom */}
      <div className="relative h-24 bg-background">
        <svg className="absolute top-0 w-full h-24" viewBox="0 0 1440 96" preserveAspectRatio="none" fill="none">
          <path d="M0,0 L0,56 Q360,96 720,56 T1440,56 L1440,0 Z" fill="white" />
        </svg>
      </div>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every search gives you 10-15 qualified candidates with contact info. That's ~$1-2 per candidate vs. $3-5 from lead providers.
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {pricing.map((plan, i) => (
              <PricingCard key={plan.name} {...plan} index={i} />
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsl(var(--primary)_/_0.1)_0%,_transparent_60%)]" />
        
        <AnimatedSection className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border/50 mb-8">
            <div className="w-8 h-8 rounded-full bg-primary shadow-lg shadow-primary/30" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to fill roles
            <br />
            <span className="gradient-text">3x faster?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Start your 7-day free trial. No credit card required. Find your first batch of qualified candidates in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('/auth')} size="lg" className="apple-button h-14 px-10 text-lg gap-2">
              Start Finding Candidates
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button 
              onClick={() => setIsFreeLeadSampleOpen(true)} 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-lg gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
            >
              👥 Get 5 Free Candidates
            </Button>
          </div>
        </AnimatedSection>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary-foreground/90" />
            </div>
            <span className="font-medium text-foreground">{appName}</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
            <button 
              onClick={() => setIsContactOpen(true)} 
              className="hover:text-foreground transition-colors"
            >
              Contact
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © 2025 {appName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Contact Dialog */}
      <ContactDialog isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      
      {/* Free Lead Sample Modal */}
      <FreeLeadSampleModal open={isFreeLeadSampleOpen} onOpenChange={setIsFreeLeadSampleOpen} />
    </div>
  );
}
