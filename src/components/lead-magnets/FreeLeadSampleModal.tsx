import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlurredLeadCard } from './BlurredLeadCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, ArrowRight, Sparkles, Users, Lock, Target, Zap, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BlurredLead {
  name: string;
  title: string;
  company: string;
  location: string;
  email_available: boolean;
  linkedin_available: boolean;
  phone_available: boolean;
}

interface FreeLeadSampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'query' | 'email' | 'loading' | 'results' | 'limit-reached';

const suggestions = [
  { label: 'SaaS founders', icon: Target },
  { label: 'Marketing directors', icon: Zap },
  { label: 'E-commerce CEOs', icon: Users },
  { label: 'HR managers', icon: CheckCircle2 },
];

export function FreeLeadSampleModal({ open, onOpenChange }: FreeLeadSampleModalProps) {
  const [step, setStep] = useState<Step>('query');
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [leads, setLeads] = useState<BlurredLead[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleQuerySubmit = () => {
    if (query.trim().length < 5) {
      setError('Please describe who you\'re looking for (at least 5 characters)');
      return;
    }
    setError('');
    setStep('email');
  };

  const handleEmailSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const response = await supabase.functions.invoke('free-lead-sample', {
        body: { email, query },
      });

      // Handle rate limit (429)
      if (response.error) {
        const errorMessage = response.error.message || 'Something went wrong';
        
        // Check if it's a rate limit error
        if (errorMessage.includes('already used') || errorMessage.includes('limit')) {
          setError(errorMessage);
          setStep('limit-reached');
          return;
        }
        
        throw response.error;
      }

      const data = response.data;

      // Handle error in response body (for non-HTTP errors)
      if (data?.error) {
        if (data.limit_reached) {
          setError(data.error);
          setStep('limit-reached');
          return;
        }
        setError(data.error);
        setStep('email');
        return;
      }

      setLeads(data?.leads || []);
      setStep('results');
    } catch (err: any) {
      console.error('Free lead sample error:', err);
      
      // Parse error message from edge function response
      let errorMessage = 'Something went wrong. Please try again.';
      try {
        if (err.context?.body) {
          const body = JSON.parse(err.context.body);
          if (body.error) {
            errorMessage = body.error;
            if (body.limit_reached) {
              setError(errorMessage);
              setStep('limit-reached');
              return;
            }
          }
        }
      } catch {}
      
      setError(errorMessage);
      setStep('email');
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  const resetModal = () => {
    setStep('query');
    setQuery('');
    setEmail('');
    setLeads([]);
    setError('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 bg-background/80 backdrop-blur-2xl border-border/30 shadow-2xl shadow-primary/10">
        {/* Decorative header gradient */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="relative p-6 overflow-x-hidden">
          <DialogHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mx-auto mb-4"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                  {step === 'results' ? (
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  ) : (
                    <Users className="w-8 h-8 text-primary-foreground" />
                  )}
                </div>
              </div>
            </motion.div>
            
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {step === 'results' ? 'Your Free Leads' : 'Get 5 Free Leads'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              {step === 'query' && 'Tell us who you\'re looking for and we\'ll find them instantly.'}
              {step === 'email' && 'Enter your email to receive your personalized leads.'}
              {step === 'loading' && 'Our AI is searching millions of profiles...'}
              {step === 'results' && 'Sign up to unlock full contact details.'}
              {step === 'limit-reached' && 'Ready to unlock unlimited leads?'}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {step === 'query' && (
              <motion.div
                key="query"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 mt-6"
              >
                <div className="space-y-3">
                  <Label htmlFor="query" className="text-sm font-medium">Who are you looking for?</Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="query"
                        placeholder="e.g., CTOs at fintech startups in NYC"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
                        className="pl-12 h-14 text-base rounded-xl border-border/50 bg-muted/30 focus:bg-muted/50 focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => {
                      const Icon = suggestion.icon;
                      return (
                        <motion.button
                          key={suggestion.label}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setQuery(suggestion.label)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-muted/50 hover:bg-muted border border-border/30 hover:border-primary/30 transition-all"
                        >
                          <Icon className="w-4 h-4 text-primary" />
                          {suggestion.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  onClick={handleQuerySubmit} 
                  className="w-full h-14 text-base rounded-xl apple-button group"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}

            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 mt-6"
              >
                <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Search className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Searching for</p>
                      <p className="font-medium text-foreground">{query}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-medium">Your email address</Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                        className="pl-12 h-14 text-base rounded-xl border-border/50 bg-muted/30 focus:bg-muted/50 focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  We'll deliver your leads instantly. No spam, ever.
                </p>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('query')} 
                    className="flex-1 h-12 rounded-xl"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleEmailSubmit} 
                    className="flex-[2] h-12 rounded-xl apple-button group"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Get My Leads
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse" />
                  
                  {/* Spinning ring */}
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-muted/30" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles className="w-8 h-8 text-primary" />
                      </motion.div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <motion.p 
                    className="font-semibold text-lg text-foreground"
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Finding your leads...
                  </motion.p>
                  <p className="text-sm text-muted-foreground">Scanning millions of profiles</p>
                </div>
                
                {/* Progress steps */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {['Searching', 'Analyzing', 'Enriching'].map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.5, duration: 0.3 }}
                      className="flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {label}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 mt-6"
              >
                {/* Results header */}
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-medium text-primary truncate">{leads.length} leads found</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Details locked</span>
                  </div>
                </div>

                {/* Leads list */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1">
                  {leads.map((lead, index) => (
                    <BlurredLeadCard key={index} lead={lead} index={index} />
                  ))}
                </div>

                {leads.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No leads found. Try a different search query.</p>
                  </div>
                )}

                {/* Premium CTA */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm">Unlock full details</h4>
                      <p className="text-xs text-muted-foreground">Emails, phones, LinkedIn + 250/mo</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSignUp} 
                    className="w-full h-11 rounded-lg apple-button text-sm"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {step === 'limit-reached' && (
              <motion.div
                key="limit-reached"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6 mt-6"
              >
                <div className="text-center py-8">
                  <div className="relative mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                    <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
                      <Lock className="w-10 h-10 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    You've used your free samples
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    {error || "Sign up now to unlock unlimited leads with full contact details."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground text-sm">Go Pro</h4>
                      <p className="text-xs text-muted-foreground">250 leads/mo + emails, phones, LinkedIn</p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSignUp} 
                    className="w-full h-12 rounded-lg apple-button"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <button
                  onClick={() => handleOpenChange(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
