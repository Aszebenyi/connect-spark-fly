import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { cn } from '@/lib/utils';
import { 
  CircuitLines, 
  DataFlow, 
  SparkBurst, 
  TargetRings,
  PulseOrb,
  AbstractBlob,
  MagnetPull,
  StackedBars,
  SendArrow
} from '@/components/ui/visual-elements';
import { 
  ChevronDown, 
  ChevronRight,
  Database,
  Shield,
  Zap,
  Mail,
  CreditCard,
  Users,
  Search,
  Settings,
  Lock,
  ExternalLink,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

// ============================================
// ANIMATED SECTION WRAPPER
// ============================================
function AnimatedSection({ 
  children, 
  className = '', 
  delay = 0,
  id
}: { 
  children: React.ReactNode; 
  className?: string; 
  delay?: number;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ============================================
// FLOATING DECORATIVE ORB
// ============================================
function FloatingOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={cn("absolute rounded-full blur-3xl opacity-20", className)}
      animate={{
        y: [0, -30, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

// ============================================
// TECH STACK CARD
// ============================================
function TechCard({ 
  icon, 
  title, 
  items, 
  index 
}: { 
  icon: React.ReactNode; 
  title: string; 
  items: string[]; 
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative glass rounded-2xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300 h-full">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ============================================
// DATABASE TABLE CARD
// ============================================
function TableCard({ 
  name, 
  description, 
  columns, 
  hasRLS,
  index 
}: { 
  name: string; 
  description: string; 
  columns: string[];
  hasRLS: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="group"
    >
      <div 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "glass rounded-xl p-4 border cursor-pointer transition-all duration-300",
          expanded ? "border-primary/50 shadow-lg shadow-primary/10" : "border-white/10 hover:border-white/20"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-primary" />
            <code className="text-sm font-mono text-foreground">{name}</code>
          </div>
          <div className="flex items-center gap-2">
            {hasRLS && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                RLS
              </span>
            )}
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90"
            )} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="grid grid-cols-2 gap-2">
              {columns.map((col, i) => (
                <div key={i} className="text-xs font-mono text-muted-foreground bg-background/50 rounded px-2 py-1">
                  {col}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// FLOW STEP COMPONENT
// ============================================
function FlowStep({ 
  step, 
  title, 
  description, 
  icon,
  isLast = false,
  index
}: { 
  step: number;
  title: string; 
  description: string;
  icon: React.ReactNode;
  isLast?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      viewport={{ once: true }}
      className="relative flex gap-4"
    >
      {/* Vertical line connector */}
      {!isLast && (
        <div className="absolute left-6 top-14 w-0.5 h-[calc(100%-2rem)] bg-gradient-to-b from-primary/50 to-primary/10" />
      )}
      
      {/* Step circle */}
      <div className="relative z-10 flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono text-primary/80">STEP {step}</span>
        </div>
        <h4 className="text-lg font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ============================================
// EDGE FUNCTION CARD
// ============================================
function EdgeFunctionCard({
  name,
  purpose,
  inputs,
  outputs,
  secrets,
  index
}: {
  name: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  secrets?: string[];
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      viewport={{ once: true }}
    >
      <div 
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "glass rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden",
          expanded ? "border-primary/40" : "border-white/10 hover:border-white/20"
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-primary" />
              <code className="text-sm font-mono text-foreground">{name}</code>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{purpose}</p>
        </div>
        
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3"
          >
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Inputs</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {inputs.map((input, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {input}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Outputs</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {outputs.map((output, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                    {output}
                  </span>
                ))}
              </div>
            </div>
            {secrets && secrets.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Required Secrets</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {secrets.map((secret, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                      {secret}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// SECURITY FEATURE CARD
// ============================================
function SecurityFeature({ 
  title, 
  description, 
  index 
}: { 
  title: string; 
  description: string; 
  index: number; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="flex items-start gap-4"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
        <Shield className="w-4 h-4 text-green-400" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

// ============================================
// PRICING TIER VISUAL
// ============================================
function PricingTierVisual({ 
  name, 
  price, 
  credits, 
  index 
}: { 
  name: string; 
  price: string; 
  credits: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="glass rounded-xl p-6 border border-white/10 text-center hover:border-primary/30 transition-all duration-300"
    >
      <h4 className="text-lg font-semibold text-foreground mb-2">{name}</h4>
      <div className="text-3xl font-bold gradient-text mb-1">{price}</div>
      <p className="text-sm text-muted-foreground">{credits} leads/month</p>
    </motion.div>
  );
}

// ============================================
// NAV DOT FOR SECTION INDICATOR
// ============================================
function NavDot({ 
  active, 
  label, 
  onClick 
}: { 
  active: boolean; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3"
    >
      <div className={cn(
        "w-3 h-3 rounded-full border-2 transition-all duration-300",
        active ? "bg-primary border-primary scale-125" : "border-white/30 hover:border-white/60"
      )} />
      <span className={cn(
        "text-xs transition-all duration-300 opacity-0 group-hover:opacity-100",
        active ? "text-primary opacity-100" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </button>
  );
}

// ============================================
// MAIN EXPLAINER PAGE
// ============================================
export default function Explainer() {
  const { appName, isLoading } = useBrandConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [activeSection, setActiveSection] = useState('hero');
  
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const sections = [
    { id: 'hero', label: 'Overview' },
    { id: 'market-problem', label: 'The Market' },
    { id: 'tech-stack', label: 'Tech Stack' },
    { id: 'database', label: 'Database' },
    { id: 'lead-flow', label: 'Lead Discovery' },
    { id: 'auth', label: 'Authentication' },
    { id: 'billing', label: 'Billing' },
    { id: 'email', label: 'Email System' },
    { id: 'branding', label: 'Branding' },
    { id: 'security', label: 'Security' },
    { id: 'edge-functions', label: 'Edge Functions' },
  ];

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2;
      let closestSection = sections[0].id;
      let closestDistance = Infinity;
      
      sections.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);
        
        // Check if section is at least partially visible
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible && distance < closestDistance) {
          closestDistance = distance;
          closestSection = id;
        }
      });
      
      setActiveSection(closestSection);
    };
    
    // Initial check
    handleScroll();
    
    // Throttled scroll handler
    let ticking = false;
    const scrollHandler = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => window.removeEventListener('scroll', scrollHandler);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const displayName = isLoading ? 'Platform' : appName;
  const currentIndex = sections.findIndex(s => s.id === activeSection);

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Floating Orbs Background */}
      <FloatingOrb className="w-[600px] h-[600px] bg-primary/30 top-20 -left-40" delay={0} />
      <FloatingOrb className="w-[500px] h-[500px] bg-primary/20 top-[60vh] -right-32" delay={2} />
      <FloatingOrb className="w-[400px] h-[400px] bg-primary/25 top-[150vh] left-1/4" delay={4} />
      
      {/* Mobile Slide Indicator - Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 lg:hidden">
        <div className="glass border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {sections.length}
            </span>
            <span className="text-sm font-medium text-foreground">
              {sections[currentIndex]?.label}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={false}
              animate={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
      
      {/* Desktop Navigation Dots */}
      <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-4">
        <div className="glass rounded-2xl p-3 border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <NavDot
                key={section.id}
                active={activeSection === section.id}
                label={section.label}
                onClick={() => scrollToSection(section.id)}
              />
            ))}
          </div>
          {/* Current slide indicator */}
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <span className="text-xs font-mono text-primary">
              {currentIndex + 1}/{sections.length}
            </span>
          </div>
        </div>
      </nav>

      {/* Back Button */}
      <Link 
        to="/"
        className="fixed top-6 left-6 z-50 glass rounded-full p-3 border border-white/10 hover:border-primary/40 transition-all duration-300 group"
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>

      {/* ========================================== */}
      {/* SECTION 1: HERO */}
      {/* ========================================== */}
      <motion.section 
        id="hero"
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-screen flex items-center justify-center px-6"
      >
        <div className="text-center max-w-4xl mx-auto">
          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute top-1/4 left-1/4 -translate-x-1/2"
          >
            <CircuitLines className="w-32 h-32 opacity-30" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="absolute bottom-1/3 right-1/4 translate-x-1/2"
          >
            <DataFlow className="w-40 h-40 opacity-30" />
          </motion.div>
          
          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <span className="inline-block text-xs font-mono uppercase tracking-[0.3em] text-primary mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
              Architecture Deep-Dive
            </span>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
              Under the Hood of
              <span className="block gradient-text">{displayName}</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              A complete breakdown of the infrastructure, data flows, security measures, 
              and technical decisions that power this AI-driven lead generation platform.
            </p>
            
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <span className="text-sm">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ========================================== */}
      {/* SECTION 2: MARKET PROBLEM 2026 */}
      {/* ========================================== */}
      <AnimatedSection id="market-problem" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              The Market in 2026
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Cold Outreach is Harder Than Ever
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The landscape has shifted. What worked in 2020 no longer works today.
            </p>
          </div>
          
          {/* Problem Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-16">
            {[
              { problem: 'Email deliverability stricter', impact: 'Gmail/Outlook filters have become more aggressive', icon: <Mail className="w-4 h-4" /> },
              { problem: 'Inboxes flooded with AI-generated spam', impact: 'Response rates are plummeting', icon: <AlertTriangle className="w-4 h-4" /> },
              { problem: 'Privacy regulations (GDPR, etc.)', impact: 'More restrictions on data usage', icon: <Shield className="w-4 h-4" /> },
              { problem: 'Buyers are fatigued', impact: '"Hey {first_name}" no longer works', icon: <Users className="w-4 h-4" /> },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass rounded-xl p-5 border border-red-500/20 bg-red-500/5 hover:border-red-500/40 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">{item.problem}</h4>
                    <p className="text-xs text-muted-foreground">{item.impact}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 border border-primary/30 bg-primary/5 text-center mb-20"
          >
            <p className="text-lg md:text-xl text-foreground font-medium">
              But: companies still need to sell. The demand for leads isn't disappearing — 
              <span className="gradient-text font-bold"> the bar for quality is going up.</span>
            </p>
          </motion.div>
          
          {/* The Shift: Volume → Precision */}
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Where {displayName} Comes In
            </span>
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Shift: Volume → Precision
            </h3>
          </div>
          
          {/* Comparison Table */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {/* Old Way */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="text-xl font-semibold text-foreground">The Old Way</h4>
              </div>
              <div className="space-y-3">
                {[
                  '10,000 emails, 0.5% response',
                  'Generic templates',
                  'Buying lead lists',
                  'Spray and pray',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* New Way */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-primary/30 bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-xl font-semibold text-foreground">The New Way</h4>
              </div>
              <div className="space-y-3">
                {[
                  '500 hyper-targeted emails, 5% response',
                  'AI-personalized per prospect',
                  'AI-discovery based on criteria',
                  'Research-based outreach',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Positioning Statement */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-block glass rounded-2xl px-8 py-6 border border-primary/40 shadow-lg shadow-primary/10">
              <p className="text-xl md:text-2xl font-bold gradient-text">
                Fewer leads. Better leads. Higher conversion.
              </p>
            </div>
          </motion.div>
          
          {/* Market Stats */}
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Market Statistics
            </span>
            <h3 className="text-2xl font-semibold text-foreground">
              The Numbers Speak for Themselves
            </h3>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { value: '$9.5B+', label: 'Global lead gen market 2026', source: 'Industry Reports' },
              { value: '78%', label: 'Sales teams prioritize quality > quantity', source: 'HubSpot/Gartner' },
              { value: '1-3%', label: 'Avg cold email response (was 5-8% in 2020)', source: 'Mailshake/Lemlist' },
              { value: '63%', label: 'Companies say lead gen is #1 challenge', source: 'Demand Gen Report' },
              { value: '21%', label: 'Sales rep time spent on research', source: 'Salesforce' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="glass rounded-xl p-5 border border-white/10 text-center hover:border-primary/30 transition-all duration-300"
              >
                <div className="text-2xl md:text-3xl font-bold gradient-text mb-2">{stat.value}</div>
                <p className="text-xs text-muted-foreground mb-2">{stat.label}</p>
                <span className="text-[10px] text-primary/60 font-mono">{stat.source}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 3: TECH STACK */}
      {/* ========================================== */}
      <AnimatedSection id="tech-stack" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Technology Stack
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Built on Modern Foundations
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A carefully selected stack optimized for performance, developer experience, and scalability.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TechCard
              icon={<Zap className="w-6 h-6 text-primary" />}
              title="Frontend"
              items={['React 18 + TypeScript', 'Vite (Build Tool)', 'Tailwind CSS', 'Framer Motion', 'shadcn/ui Components']}
              index={0}
            />
            <TechCard
              icon={<Database className="w-6 h-6 text-primary" />}
              title="Backend"
              items={['Supabase (PostgreSQL)', 'Edge Functions (Deno)', 'Row Level Security', 'Realtime Subscriptions']}
              index={1}
            />
            <TechCard
              icon={<Lock className="w-6 h-6 text-primary" />}
              title="Authentication"
              items={['Supabase Auth', 'Email/Password', 'Google OAuth (Gmail)', 'Session Management']}
              index={2}
            />
            <TechCard
              icon={<CreditCard className="w-6 h-6 text-primary" />}
              title="Payments"
              items={['Stripe Checkout', 'Customer Portal', 'Webhook Handling', 'Subscription Management']}
              index={3}
            />
            <TechCard
              icon={<Search className="w-6 h-6 text-primary" />}
              title="AI & Data"
              items={['Exa.ai (Lead Discovery)', 'Apify (LinkedIn Scraping)', 'Lovable AI Gateway', 'Structured Data Extraction']}
              index={4}
            />
            <TechCard
              icon={<Mail className="w-6 h-6 text-primary" />}
              title="Email"
              items={['Resend API (Transactional)', 'Gmail API (Outreach)', 'Open/Click Tracking', 'Template Engine']}
              index={5}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 3: DATABASE SCHEMA */}
      {/* ========================================== */}
      <AnimatedSection id="database" className="py-32 px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Database Schema
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Data Architecture
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              PostgreSQL tables with Row Level Security ensuring data isolation per user.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TableCard
              name="profiles"
              description="Extended user information linked to auth"
              columns={['id', 'user_id', 'email', 'full_name', 'company', 'created_at']}
              hasRLS={true}
              index={0}
            />
            <TableCard
              name="campaigns"
              description="Lead organization containers with goals"
              columns={['id', 'user_id', 'name', 'status', 'search_query', 'goal', 'lead_count', 'sent_count']}
              hasRLS={true}
              index={1}
            />
            <TableCard
              name="leads"
              description="Discovered prospects with enriched data"
              columns={['id', 'user_id', 'campaign_id', 'name', 'title', 'company', 'email', 'linkedin_url', 'status']}
              hasRLS={true}
              index={2}
            />
            <TableCard
              name="subscriptions"
              description="Billing state and credit tracking"
              columns={['id', 'user_id', 'plan_id', 'credits_limit', 'credits_used', 'stripe_customer_id', 'status']}
              hasRLS={true}
              index={3}
            />
            <TableCard
              name="email_connections"
              description="OAuth tokens for Gmail integration"
              columns={['id', 'user_id', 'provider', 'email', 'access_token', 'refresh_token', 'token_expires_at']}
              hasRLS={true}
              index={4}
            />
            <TableCard
              name="email_templates"
              description="Reusable email templates with variables"
              columns={['id', 'name', 'subject', 'body_html', 'category', 'variables', 'is_active']}
              hasRLS={true}
              index={5}
            />
            <TableCard
              name="email_sequences"
              description="Automated email triggers and delays"
              columns={['id', 'name', 'trigger_event', 'template_id', 'delay_minutes', 'is_active']}
              hasRLS={true}
              index={6}
            />
            <TableCard
              name="email_log"
              description="Sent email history with tracking"
              columns={['id', 'user_id', 'recipient_email', 'subject', 'status', 'opened_at', 'clicked_at']}
              hasRLS={true}
              index={7}
            />
            <TableCard
              name="platform_settings"
              description="Dynamic configuration (branding, API keys)"
              columns={['id', 'key', 'value', 'category', 'label', 'is_secret']}
              hasRLS={true}
              index={8}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 4: LEAD DISCOVERY FLOW */}
      {/* ========================================== */}
      <AnimatedSection id="lead-flow" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Core Feature
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Lead Discovery Flow
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              How searches translate into actionable leads through AI-powered discovery.
            </p>
          </div>
          
          <div className="relative">
            <FlowStep
              step={1}
              title="User Submits Search Query"
              description="User enters natural language query like 'VP of Sales at SaaS companies in Austin' through the campaign interface."
              icon={<Search className="w-5 h-5 text-primary" />}
              index={0}
            />
            <FlowStep
              step={2}
              title="Edge Function: exa-search"
              description="Validates credits, creates Exa Webset with enrichments (email, phone, company), registers webhook, stores search metadata in webset_searches table."
              icon={<Zap className="w-5 h-5 text-primary" />}
              index={1}
            />
            <FlowStep
              step={3}
              title="Exa AI Processes Asynchronously"
              description="Exa.ai searches the web, finds LinkedIn profiles, enriches with contact data. This runs in the background (typically 30-60 seconds)."
              icon={<MagnetPull className="w-20 h-20" />}
              index={2}
            />
            <FlowStep
              step={4}
              title="Webhook: webset.idle"
              description="When complete, Exa sends webhook to exa-webhook edge function with all discovered items."
              icon={<Zap className="w-5 h-5 text-primary" />}
              index={3}
            />
            <FlowStep
              step={5}
              title="Lead Parsing & Upsert"
              description="Each item is parsed into lead schema, validated, and upserted to leads table. Credits are deducted via increment_credits_used RPC."
              icon={<Database className="w-5 h-5 text-primary" />}
              index={4}
            />
            <FlowStep
              step={6}
              title="Realtime UI Update"
              description="Supabase Realtime pushes changes to subscribed clients. UI updates instantly showing new leads without page refresh."
              icon={<Users className="w-5 h-5 text-primary" />}
              isLast={true}
              index={5}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 5: AUTHENTICATION */}
      {/* ========================================== */}
      <AnimatedSection id="auth" className="py-32 px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Authentication
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Two Auth Flows
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Standard app authentication plus Gmail OAuth for email sending capabilities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Standard Auth Flow */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Standard Auth</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">1</div>
                  <span className="text-muted-foreground">Email/Password form submission</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">2</div>
                  <span className="text-muted-foreground">Supabase Auth validates credentials</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">3</div>
                  <span className="text-muted-foreground">Session cookie created (auto-refresh)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">4</div>
                  <span className="text-muted-foreground">Profile & subscription created on signup</span>
                </div>
              </div>
            </motion.div>
            
            {/* Gmail OAuth Flow */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Gmail OAuth</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">1</div>
                  <span className="text-muted-foreground">Popup window opens Google consent</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">2</div>
                  <span className="text-muted-foreground">User grants Gmail send permission</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">3</div>
                  <span className="text-muted-foreground">Auth code sent via window.postMessage</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">4</div>
                  <span className="text-muted-foreground">gmail-auth exchanges for tokens</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">5</div>
                  <span className="text-muted-foreground">Tokens stored in email_connections</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 6: BILLING & SUBSCRIPTIONS */}
      {/* ========================================== */}
      <AnimatedSection id="billing" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Monetization
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Subscription & Billing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Credit-based pricing powered by Stripe with automatic limit enforcement.
            </p>
          </div>
          
          {/* Pricing Tiers */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <PricingTierVisual name="Starter" price="$35" credits="250" index={0} />
            <PricingTierVisual name="Growth" price="$99" credits="1,000" index={1} />
            <PricingTierVisual name="Scale" price="$199" credits="2,500" index={2} />
          </div>
          
          {/* Billing Flow */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-foreground mb-6">Billing Lifecycle</h3>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                User Clicks Upgrade
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                create-checkout
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                Stripe Checkout
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
                Webhook: checkout.session.completed
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                Subscription Created
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 7: EMAIL AUTOMATION */}
      {/* ========================================== */}
      <AnimatedSection id="email" className="py-32 px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Automation
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Email Marketing System
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Event-driven email automation with tracking and template management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Trigger Events */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <SparkBurst className="w-8 h-8" />
                Trigger Events
              </h3>
              <div className="space-y-3">
                {['user_signup', 'leads_found', 'low_credits', 'subscription_activated', 'subscription_cancelled'].map((event, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <code className="text-xs font-mono px-2 py-1 rounded bg-primary/10 text-primary">{event}</code>
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* Template Variables */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <SendArrow className="w-8 h-8" />
                Template Variables
              </h3>
              <div className="space-y-3">
                {[
                  { var: '{{user_name}}', desc: 'Recipient name' },
                  { var: '{{lead_count}}', desc: 'Number of leads found' },
                  { var: '{{credits_remaining}}', desc: 'Current credits' },
                  { var: '{{dashboard_url}}', desc: 'Link to dashboard' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <code className="text-xs font-mono px-2 py-1 rounded bg-green-500/10 text-green-400">{item.var}</code>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Email Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-foreground mb-6">Processing Pipeline</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Trigger Fires
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Match Sequence
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Load Template
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Variable Substitution
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Queue (email_log)
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-background/50 border border-white/10">
                Apply Delay
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                Resend API
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
                Track Opens/Clicks
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 8: DYNAMIC BRANDING */}
      {/* ========================================== */}
      <AnimatedSection id="branding" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              White-Label Ready
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Dynamic Branding System
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Change your brand identity without touching code via the admin panel.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Settings Flow */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                platform_settings Table
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-background/50">
                  <span className="text-muted-foreground">app_name</span>
                  <span className="text-foreground">{displayName}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background/50">
                  <span className="text-muted-foreground">app_tagline</span>
                  <span className="text-foreground">AI Lead Generation</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background/50">
                  <span className="text-muted-foreground">support_email</span>
                  <span className="text-foreground">support@...</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background/50">
                  <span className="text-muted-foreground">email_from_name</span>
                  <span className="text-foreground">{displayName} Team</span>
                </div>
              </div>
            </motion.div>
            
            {/* Propagation */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Propagates To
              </h3>
              <div className="space-y-3">
                {[
                  'Navigation bar logo text',
                  'SEO meta tags & page titles',
                  'Auth page welcome messages',
                  'Dashboard headers',
                  'Transactional email "From" name',
                  'Email templates & footers',
                  'Terms/Privacy page references',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Hook explanation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-8 glass rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">useBrandConfig Hook</h3>
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
{`const { appName, tagline, supportEmail, isLoading } = useBrandConfig();
// Returns dynamic values from platform_settings
// Falls back to defaults if loading or not configured`}
            </pre>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 9: SECURITY */}
      {/* ========================================== */}
      <AnimatedSection id="security" className="py-32 px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Security
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Defense in Depth
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Multiple security layers protecting user data at every level.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <SecurityFeature
              title="Row Level Security (RLS)"
              description="Every table has policies ensuring users can only access their own data. Queries are filtered at the database level."
              index={0}
            />
            <SecurityFeature
              title="User Data Partitioning"
              description="All user-specific tables include user_id column with foreign key to auth.users, enforced via RLS policies."
              index={1}
            />
            <SecurityFeature
              title="Leaked Password Protection"
              description="Integration with Have I Been Pwned API during signup to block commonly compromised passwords."
              index={2}
            />
            <SecurityFeature
              title="GDPR-Compliant Deletion"
              description="Full account deletion cascade removes profiles, subscriptions, leads, campaigns, and auth records."
              index={3}
            />
            <SecurityFeature
              title="OAuth Token Encryption"
              description="Gmail OAuth tokens stored securely in email_connections with automatic refresh handling."
              index={4}
            />
            <SecurityFeature
              title="Service Role Isolation"
              description="SUPABASE_SERVICE_ROLE_KEY only used server-side in edge functions, never exposed to client."
              index={5}
            />
            <SecurityFeature
              title="Admin Role Verification"
              description="Admin endpoints verify has_role() RPC before allowing access to sensitive operations."
              index={6}
            />
            <SecurityFeature
              title="Webhook Secret Validation"
              description="Exa webhooks include secret tokens verified before processing to prevent spoofing."
              index={7}
            />
          </div>
          
          {/* RLS Example */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mt-12 glass rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Example RLS Policy</h3>
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
{`CREATE POLICY "Users can view their own leads"
ON public.leads
FOR SELECT
USING (auth.uid() = user_id);

-- This ensures every SELECT query on leads table
-- is automatically filtered to only return rows
-- where user_id matches the authenticated user's ID`}
            </pre>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* SECTION 10: EDGE FUNCTIONS REFERENCE */}
      {/* ========================================== */}
      <AnimatedSection id="edge-functions" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary mb-4 block">
              Backend Reference
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Edge Functions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Serverless Deno functions handling all backend logic.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EdgeFunctionCard
              name="exa-search"
              purpose="Initiates Exa Webset search with enrichments"
              inputs={['query', 'campaignId', 'Bearer token']}
              outputs={['webset_id', 'status: searching']}
              secrets={['EXA_API_KEY']}
              index={0}
            />
            <EdgeFunctionCard
              name="exa-webhook"
              purpose="Processes completed Exa searches, parses leads"
              inputs={['webset.idle event', 'items array']}
              outputs={['leads inserted', 'credits deducted']}
              index={1}
            />
            <EdgeFunctionCard
              name="apify-scrape"
              purpose="Enriches LinkedIn profiles via Apify"
              inputs={['linkedinUrl']}
              outputs={['fullName', 'email', 'title', 'company']}
              secrets={['APIFY_API_KEY']}
              index={2}
            />
            <EdgeFunctionCard
              name="gmail-auth"
              purpose="OAuth flow for Gmail connection"
              inputs={['action: authorize|callback|disconnect']}
              outputs={['auth_url', 'tokens stored']}
              secrets={['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']}
              index={3}
            />
            <EdgeFunctionCard
              name="send-email"
              purpose="Sends outreach emails via Gmail API"
              inputs={['to', 'subject', 'body', 'leadId']}
              outputs={['messageId', 'status updated']}
              index={4}
            />
            <EdgeFunctionCard
              name="send-automated-email"
              purpose="Triggers sequence-based emails"
              inputs={['trigger_event', 'user_id', 'metadata']}
              outputs={['email queued in email_log']}
              secrets={['RESEND_API_KEY']}
              index={5}
            />
            <EdgeFunctionCard
              name="process-email-queue"
              purpose="Sends queued emails after delay"
              inputs={['(cron triggered)']}
              outputs={['emails sent via Resend']}
              secrets={['RESEND_API_KEY']}
              index={6}
            />
            <EdgeFunctionCard
              name="track-email"
              purpose="Records opens/clicks via tracking pixel"
              inputs={['id', 'type: open|click', 'url']}
              outputs={['timestamp recorded', '1x1 GIF']}
              index={7}
            />
            <EdgeFunctionCard
              name="create-checkout"
              purpose="Creates Stripe checkout session"
              inputs={['priceId', 'Bearer token']}
              outputs={['checkout session URL']}
              secrets={['STRIPE_SECRET_KEY']}
              index={8}
            />
            <EdgeFunctionCard
              name="check-subscription"
              purpose="Stripe webhook for subscription events"
              inputs={['Stripe webhook payload']}
              outputs={['subscription upserted']}
              secrets={['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']}
              index={9}
            />
            <EdgeFunctionCard
              name="customer-portal"
              purpose="Generates Stripe billing portal URL"
              inputs={['Bearer token']}
              outputs={['portal session URL']}
              secrets={['STRIPE_SECRET_KEY']}
              index={10}
            />
            <EdgeFunctionCard
              name="generate-outreach"
              purpose="AI-generates personalized outreach copy"
              inputs={['leadId', 'context']}
              outputs={['subject', 'body']}
              index={11}
            />
            <EdgeFunctionCard
              name="admin-send-email"
              purpose="Admin-only email sending via Resend"
              inputs={['to', 'subject', 'html']}
              outputs={['email sent']}
              secrets={['RESEND_API_KEY']}
              index={12}
            />
            <EdgeFunctionCard
              name="admin-stats"
              purpose="Aggregated analytics for admin dashboard"
              inputs={['Bearer token (admin)']}
              outputs={['users, MRR, leads, charts']}
              index={13}
            />
            <EdgeFunctionCard
              name="free-lead-sample"
              purpose="Lead magnet: free search for landing page"
              inputs={['email', 'query']}
              outputs={['blurred lead samples']}
              secrets={['EXA_API_KEY']}
              index={14}
            />
            <EdgeFunctionCard
              name="delete-account"
              purpose="GDPR-compliant full account deletion"
              inputs={['Bearer token']}
              outputs={['all user data removed']}
              index={15}
            />
            <EdgeFunctionCard
              name="get-platform-settings"
              purpose="Returns non-secret platform config"
              inputs={['(none)']}
              outputs={['app_name, tagline, emails, etc.']}
              index={16}
            />
          </div>
        </div>
      </AnimatedSection>

      {/* ========================================== */}
      {/* FOOTER */}
      {/* ========================================== */}
      <footer className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <PulseOrb className="w-16 h-16 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to explore {displayName}?
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Visit Landing Page
              </Link>
              <Link
                to="/auth"
                className="px-6 py-3 rounded-xl glass border border-white/20 text-foreground font-medium hover:border-primary/40 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
