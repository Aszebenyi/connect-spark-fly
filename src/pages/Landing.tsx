import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { ContactDialog } from '@/components/ContactDialog';
import { ShieldCheck, Sparkles, Mail, Search, ArrowRight, Loader2 } from 'lucide-react';
import { PreviewCandidateCard, PreviewCandidate } from '@/components/lead-magnets/PreviewCandidateCard';
import { supabase } from '@/integrations/supabase/client';

import {
  PulseOrb,
  DataFlow,
  MagnetPull,
  StackedBars } from
'@/components/ui/visual-elements';

// ─── Helper components (unchanged) ──────────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: {children: React.ReactNode;className?: string;delay?: number;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 60 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }} transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function FloatingOrb({ className, delay = 0 }: {className?: string;delay?: number;}) {
  return (
    <motion.div className={`absolute rounded-full blur-3xl ${className}`} animate={{ y: [0, -30, 0], scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, delay, repeat: Infinity, ease: "easeInOut" }} />
  );
}

function FeatureCard({ visual: Visual, title, description, index }: {visual: React.ComponentType<{className?: string;}>;title: string;description: string;index: number;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -6, transition: { duration: 0.3 } }} className="group relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/40 shadow-lg hover:shadow-xl overflow-hidden transition-shadow duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-cyan-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:from-primary/20 group-hover:to-cyan-500/20 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
          <Visual className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

function StatItem({ value, label, sub, index }: {value: string;label: string;sub: string;index: number;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.8 }} animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }} className="text-center flex flex-col items-center justify-center min-h-[140px]">
      <div className="h-[2px] w-12 bg-gradient-to-r from-primary to-cyan-600 rounded-full mb-4" />
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent mb-2">{value}</div>
      <div className="text-sm font-medium text-foreground mb-1">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </motion.div>
  );
}

function PricingCard({ name, price, originalPrice, leads, perCandidate, features, popular, index, isAnnual }: {name: string;price: string;originalPrice?: string;leads: string;perCandidate?: string;features: string[];popular?: boolean;index: number;isAnnual?: boolean;}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const navigate = useNavigate();
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }} transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }} whileHover={{ y: -6, transition: { duration: 0.3 } }} className={`relative flex flex-col p-8 rounded-2xl border-2 transition-all duration-300 ${popular ? 'border-primary bg-white shadow-2xl shadow-primary/15 ring-1 ring-primary/20' : 'border-border/60 bg-white shadow-lg hover:shadow-xl hover:border-primary/30'}`}>
      {popular && <>
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-50 blur-sm pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-cyan-500 to-primary" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-primary to-cyan-600 text-white whitespace-nowrap shadow-lg shadow-primary/30">Most Popular</span>
        </div>
      </>}
      <div className={`flex flex-col flex-1 ${popular ? 'pt-2' : ''}`}>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-3">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-foreground tracking-tight">{price}</span>
            <span className="text-muted-foreground text-sm font-medium">/month</span>
          </div>
          {isAnnual && originalPrice && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground line-through">{originalPrice}/mo</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Save 20%</span>
            </div>
          )}
          <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-semibold ${popular ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground border border-border'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {leads}
          </div>
          {perCandidate && <p className="text-xs text-muted-foreground mt-2 font-medium">{perCandidate}</p>}
        </div>
        <ul className="space-y-4 mb-8 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-foreground/80 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${popular ? 'bg-primary/15 border border-primary/30' : 'bg-muted border border-border'}`}>
                <svg className={`w-3 h-3 ${popular ? 'text-primary' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="leading-tight">{feature}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => navigate('/auth')} className={`w-full h-14 rounded-xl font-semibold text-base transition-all duration-300 ${popular ? 'bg-gradient-to-r from-primary to-cyan-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.02]' : 'bg-foreground text-background hover:opacity-90 hover:scale-[1.02]'}`}>
          Get Started
        </button>
      </div>
    </motion.div>
  );
}

// ─── Example preview data ───────────────────────────────────
const exampleCandidates: PreviewCandidate[] = [
  { name: "Sarah Chen", title: "Registered Nurse - ICU", company: "Memorial Hospital", location: "Los Angeles, CA", specialty: "ICU", licenses: "RN, BSN", certifications: "BLS, ACLS, CCRN", match_score: 92, scoring_notes: "Strong ICU background with 8 years experience. Active RN and BSN licenses. All required certifications present.", years_experience: 8 },
  { name: "Marcus Williams", title: "Travel Nurse - Critical Care", company: "TravelNurse Corp", location: "Phoenix, AZ", specialty: "ICU, Emergency", licenses: "RN", certifications: "BLS, ACLS, PALS, TNCC", match_score: 87, scoring_notes: "Experienced travel nurse with critical care and emergency specialties. Strong certification profile.", years_experience: 6 },
  { name: "Jennifer Patel", title: "Nurse Practitioner", company: "City Health System", location: "San Diego, CA", specialty: "Med-Surg", licenses: "RN, NP, MSN", certifications: "BLS, ACLS", match_score: 74, scoring_notes: "Advanced practice nurse. MSN degree. Med-Surg specialty differs from ICU requirement but transferable skills.", years_experience: 12 },
];

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { appName } = useBrandConfig();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PreviewCandidate[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handlePreviewSearch = async () => {
    if (searchQuery.trim().length < 3) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResults(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/preview-search`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        setSearchError(data.error || 'Search failed. Please try again.');
        return;
      }

      setSearchResults(data.leads || []);
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignupCTA = () => {
    if (searchQuery.trim()) {
      sessionStorage.setItem('pendingSearch', searchQuery.trim());
    }
    navigate('/auth');
  };

  const features = [
    { visual: MagnetPull, title: "AI-Powered Search & Filtering", description: "Describe the role you need filled. MediLead finds nurses matching your exact criteria, verifies credentials, and ranks by match score—so you only see top candidates." },
    { visual: PulseOrb, title: "Match Scoring & Verification", description: "Every candidate gets a qualification score with reasoning. Licenses, certifications, and experience verified automatically—saving 20+ hours per week." },
    { visual: StackedBars, title: "Personalized Outreach", description: `AI writes unique emails using each candidate's background. Send via Gmail, track opens and replies. 15-25% response rates vs 5% industry average.` },
    { visual: DataFlow, title: "Multi-Role Management", description: "Manage ICU, ER, travel contracts simultaneously. Track contacted, responded, and interview-ready candidates across all your openings in one dashboard." },
  ];

  const steps = [
    { title: "Describe Who You Need", description: "Use natural language to describe the role. 'Travel ICU nurse, 13-week contract, Phoenix, BLS/ACLS required.' Our AI understands healthcare terminology and requirements.", time: "⏱️ Takes 30 seconds" },
    { title: "AI Searches & Filters Candidates", description: "Our AI searches across millions of healthcare professionals, filters for required credentials and experience, then ranks by match score. You see only the top qualified candidates—not hundreds of unqualified results.", time: "⏱️ Takes 2 minutes" },
    { title: "Get Verified Contact Info", description: "Each candidate is automatically enriched with email, phone, license verification, and current employment status. 98% contact accuracy guaranteed.", time: "⏱️ Instant enrichment" },
    { title: "Send Personalized Emails", description: "Generate personalized outreach with AI, or write your own. Send directly from the platform using your Gmail account. Track opens and responses.", time: "⏱️ First responses in 24-48 hours" },
  ];

  const [pricingPeriod, setPricingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const isAnnualPricing = pricingPeriod === 'annual';

  const pricing = [
    { name: "Starter", price: isAnnualPricing ? "$239" : "$299", originalPrice: "$299", leads: "250 searches/mo", perCandidate: isAnnualPricing ? "~$0.96 per verified candidate" : "~$1.20 per verified candidate", features: ["~2,500-3,750 qualified candidates", "AI-powered candidate search", "License & certification verification", "Gmail integration", "AI-generated email outreach", "Job opening management", "Email tracking (opens, replies)"] },
    { name: "Growth", price: isAnnualPricing ? "$479" : "$599", originalPrice: "$599", leads: "1,000 searches/mo", perCandidate: isAnnualPricing ? "~$0.48 per verified candidate" : "~$0.60 per verified candidate", popular: true, features: ["~10,000-15,000 qualified candidates", "Everything in Starter, plus:", "Priority enrichment", "Advanced candidate filters", "Match scoring with AI reasoning", "Enhanced email analytics", "Multiple job opening management", "Weekly performance reports"] },
    { name: "Agency", price: isAnnualPricing ? "$799" : "$999", originalPrice: "$999", leads: "2,500 searches/mo", perCandidate: isAnnualPricing ? "~$0.32 per verified candidate" : "~$0.40 per verified candidate", features: ["~25,000-37,500 qualified candidates", "Everything in Growth, plus:", "Dedicated account support", "Unlimited job openings", "CSV export", "Priority support"] },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="fixed top-4 inset-x-0 z-50 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="relative px-2 py-2 rounded-2xl bg-white/70 backdrop-blur-xl border border-border/50 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              <div className="flex items-center pl-2 justify-start min-w-0">
                <img src="/medilead-logo.png" alt={appName} className="h-6 object-contain flex-shrink-0" />
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="flex items-center bg-muted/50 rounded-xl p-1">
                  {[{ label: 'Features', href: '#features' }, { label: 'How it Works', href: '#how-it-works' }, { label: 'Pricing', href: '#pricing' }].map((link) => (
                    <a key={link.label} href={link.href} className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/80">{link.label}</a>
                  ))}
                  <button onClick={() => setIsContactOpen(true)} className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/80">Contact</button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pr-1">
                {user ? (
                  <button onClick={() => navigate('/dashboard')} className="h-9 px-5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-0.5">Dashboard</button>
                ) : (
                  <>
                    <button onClick={() => navigate('/auth')} className="hidden sm:flex h-9 px-4 items-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Sign In</button>
                    <button onClick={() => navigate('/auth')} className="h-9 px-5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-300 hover:-translate-y-0.5">Get Started</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO SECTION ═══ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)_/_0.08)_0%,_transparent_60%)]" />
        <FloatingOrb className="w-96 h-96 bg-primary/20 -top-48 -right-48" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-cyan-400/15 -bottom-40 -left-40" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-primary/15 top-1/3 right-1/4" delay={4} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-border/40 text-sm font-medium mb-8 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Healthcare Candidate Sourcing</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">AI-powered nurse sourcing</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">with built-in license verification</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Find credentialed, qualified candidates in minutes. Auto-verify licenses. Send personalized outreach. Fill roles <span className="font-semibold text-foreground">5x faster</span>.
          </motion.p>

          {/* ─── HERO SEARCH BAR ─── */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="max-w-2xl mx-auto mb-6">
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-border/60 shadow-xl shadow-primary/10 hover:border-primary/30 transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-2xl focus-within:shadow-primary/15">
              <Search className="absolute left-5 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePreviewSearch()}
                placeholder="Try it — e.g., ICU Nurse Los Angeles"
                className="flex-1 h-16 pl-14 pr-4 text-base bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handlePreviewSearch}
                disabled={isSearching || searchQuery.trim().length < 3}
                className="flex-shrink-0 h-12 px-6 mr-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isSearching ? 'Searching...' : 'Find Candidates'}
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              ✨ 5 free candidate previews · No credit card required
            </p>
          </motion.div>

          {/* Existing CTA buttons */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('/auth')} size="lg" className="h-12 px-6 text-base gap-2 bg-gradient-to-r from-primary to-cyan-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-105 transition-all duration-300 border-0">
              Start Finding Nurses — Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base gap-2 bg-white/80 backdrop-blur-sm border-border/60 shadow-md hover:shadow-lg hover:bg-white hover:border-primary/30 transition-all duration-300">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="mt-12 flex items-center justify-center gap-3 flex-wrap">
            {["✓ License Verification", "✓ CAN-SPAM Compliant", "✓ HIPAA Conscious"].map((badge) => (
              <span key={badge} className="inline-flex items-center px-4 py-2 rounded-full bg-muted/60 border border-border/40 text-sm text-muted-foreground font-medium">{badge}</span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ SEARCH RESULTS / EXAMPLE CARDS ═══ */}
      <section ref={resultsRef} className="py-16 px-6 bg-gradient-to-b from-blue-50/30 to-background relative">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Loading state */}
            {isSearching && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-16 gap-6">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-muted/30" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-foreground">🔍 AI is searching for matching candidates...</p>
                  <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
                    {['Searching LinkedIn', 'Verifying credentials', 'Scoring matches'].map((label, i) => (
                      <motion.span key={label} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.6 }} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />{label}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {!isSearching && searchError && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-destructive mb-4">{searchError}</p>
                <Button variant="outline" onClick={() => setSearchError('')}>Try Again</Button>
              </motion.div>
            )}

            {/* Real search results */}
            {!isSearching && !searchError && searchResults !== null && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {searchResults.length > 0 ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-medium text-primary">{searchResults.length} candidates found</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Sign up to unlock contact details and run unlimited searches</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((candidate, i) => (
                        <PreviewCandidateCard key={i} candidate={candidate} index={i} />
                      ))}
                    </div>
                    <div className="text-center mt-10">
                      <button onClick={handleSignupCTA} className="h-14 px-10 rounded-xl text-lg font-semibold bg-gradient-to-r from-primary to-cyan-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-105 transition-all duration-300">
                        Unlock Contact Details — Start Free
                      </button>
                      <p className="text-sm text-muted-foreground mt-3">No credit card required · 250 free searches included</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground mb-4">No matching candidates found for this search.</p>
                    <p className="text-sm text-muted-foreground mb-6">Try different keywords, or sign up to access our full AI search engine with advanced filters.</p>
                    <Button onClick={handleSignupCTA}>Sign Up for Full Access</Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Example cards (no search yet) */}
            {!isSearching && !searchError && searchResults === null && (
              <motion.div key="examples" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
                  Example results — try your own search above
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {exampleCandidates.map((candidate, i) => (
                    <PreviewCandidateCard key={i} candidate={candidate} index={i} isExample />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-blue-50/50 to-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.03)_1px,_transparent_0)] bg-[size:24px_24px]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-12">Proven Results for Healthcare Recruiters</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-stretch">
            {[{ value: "25%", label: "Reply Rate", sub: "vs 5-8% average" }, { value: "5x", label: "Faster Fill", sub: "vs 3-6 months" }, { value: "13hrs", label: "Saved Weekly", sub: "LinkedIn searching" }, { value: "95%+", label: "License Accuracy", sub: "Auto-verified" }].map((stat, i) => (
              <StatItem key={stat.label} value={stat.value} label={stat.label} sub={stat.sub} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Built for Healthcare Recruiting */}
      <section className="py-20 px-6 bg-background relative">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 tracking-wide">Purpose-Built Platform</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Built for Healthcare Recruiting</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Automatic License Verification", description: "Detects RN, BSN, NP, CRNA, and 15+ healthcare license types directly from candidate profiles. No manual checking.", Icon: ShieldCheck },
              { title: "AI Credential Matching", description: "Each candidate scored against your specific requirements — specialty experience, certifications, location match — with detailed reasoning.", Icon: Sparkles },
              { title: "Personalized Outreach at Scale", description: "AI writes unique emails using each candidate's actual credentials and work history. Send via your Gmail with one click.", Icon: Mail },
            ].map((card, i) => (
              <AnimatedSection key={card.title} delay={i * 0.1}>
                <div className="p-6 rounded-2xl bg-card border border-border/40 shadow-md h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4"><card.Icon className="w-6 h-6 text-primary" /></div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">{card.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6 relative bg-primary-foreground">
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-cyan-400/[0.04] rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 tracking-wide">Built for Healthcare Recruiters</span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Everything you need to fill roles faster</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Powerful features designed to help you source, qualify, and reach qualified healthcare candidates.</p>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => <FeatureCard key={feature.title} {...feature} index={i} />)}
          </div>
        </div>
      </section>

      <div className="relative h-24 bg-background">
        <svg className="absolute bottom-0 w-full h-24" viewBox="0 0 1440 96" preserveAspectRatio="none" fill="none"><path d="M0,96 L0,40 Q360,0 720,40 T1440,40 L1440,96 Z" fill="hsl(220 10% 97.5%)" /></svg>
      </div>

      {/* How it Works */}
      <section id="how-it-works" className="py-32 px-6 relative bg-muted/50 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl" />
        <div className="max-w-4xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 tracking-wide">Simple Process</span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">From Job Req to Placement in 4 Steps</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Find, qualify, and contact candidates in minutes, not hours.</p>
          </AnimatedSection>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div key={step.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex gap-6 items-start p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/40 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex-shrink-0"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary/20">{i + 1}</div></div>
                <div className="pt-2 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">{step.time}</span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative h-24 bg-muted/50">
        <svg className="absolute top-0 w-full h-24" viewBox="0 0 1440 96" preserveAspectRatio="none" fill="none"><path d="M0,96 L0,40 Q360,0 720,40 T1440,40 L1440,96 Z" fill="hsl(0 0% 100%)" /></svg>
      </div>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 relative bg-primary-foreground">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto relative z-10">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">Every search gives you 10-15 qualified candidates with verified contact info. First 5 candidates free.</p>
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border">
              <button onClick={() => setPricingPeriod('monthly')} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${!isAnnualPricing ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Monthly</button>
              <button onClick={() => setPricingPeriod('annual')} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isAnnualPricing ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Annual <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">-20%</span>
              </button>
            </div>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {pricing.map((plan, i) => <PricingCard key={plan.name} {...plan} index={i} isAnnual={isAnnualPricing} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-cyan-500/[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_hsl(var(--primary)_/_0.08)_0%,_transparent_60%)]" />
        <AnimatedSection className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-500/10 border border-primary/20 mb-8"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-600 shadow-lg shadow-primary/25" /></div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">Ready to fill roles<br /><span className="bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">3x faster?</span></h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">Join healthcare recruiters using {appName} to source, qualify, and reach candidates in minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => navigate('/auth')} size="lg" className="h-14 px-10 text-lg gap-2 bg-gradient-to-r from-primary to-cyan-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-105 transition-all duration-300 border-0">
              Start Finding Candidates <ArrowRight className="w-4 h-4" />
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg gap-2 bg-white/80 backdrop-blur-sm border-border/60 shadow-md hover:shadow-lg hover:bg-white hover:border-primary/30 transition-all duration-300">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/60 mt-6">First 5 candidates free. No credit card required.</p>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 text-white bg-secondary">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-white/90" /></div>
            <span className="font-medium text-white">{appName}</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-gray-400">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <button onClick={() => setIsContactOpen(true)} className="hover:text-white transition-colors">Contact</button>
          </div>
          <p className="text-sm text-gray-500">© 2026 {appName}. All rights reserved.</p>
        </div>
      </footer>

      <ContactDialog isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
