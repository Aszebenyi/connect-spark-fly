import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { lovable } from '@/integrations/lovable/index';
import { Loader2, ArrowRight, Zap, Target, TrendingUp, Mail, Lock, User, Eye, EyeOff, Star, Shield, Sparkles } from 'lucide-react';
import { InlineAlert, FieldError } from '@/components/ui/inline-alert';
import { mapAuthError } from '@/hooks/useInlineError';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  
  const { signIn, signUp, user } = useAuth();
  const { appName } = useBrandConfig();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Clear form error when switching modes
  useEffect(() => {
    setFormError(null);
    setErrors({});
  }, [isLogin]);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validate()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setFormError(mapAuthError(error));
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setFormError(mapAuthError(error));
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setFormError(null);
    
    try {
      const { error } = await lovable.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        setFormError(mapAuthError(error));
        setGoogleLoading(false);
      }
    } catch (err) {
      setFormError('Failed to connect with Google. Please try again.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Content container */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Brand Panel */}
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <div className="w-4 h-4 rounded-md bg-primary rotate-45" />
            </div>
            <span className="text-xl font-semibold text-foreground tracking-tight">{appName}</span>
          </motion.div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <h1 className="text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                      Welcome<br />back
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
                      Your leads are waiting. Sign in to continue building connections that matter.
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {['hsl(210 80% 55%)', 'hsl(160 60% 45%)', 'hsl(40 95% 55%)', 'hsl(330 80% 55%)'].map((color, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="w-9 h-9 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: color }}
                        >
                          {String.fromCharCode(65 + i)}
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Join 2,000+ sales teams
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-10"
                >
                  <div className="space-y-5">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary font-medium">10 free leads included</span>
                    </motion.div>
                    <h1 className="text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                      Find your<br />next customer
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
                      AI-powered lead generation that actually works. No credit card required.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { icon: Target, text: 'AI-powered lead discovery' },
                      { icon: Zap, text: 'Instant email outreach generation' },
                      { icon: Shield, text: 'LinkedIn profile enrichment' },
                    ].map((feature, i) => (
                      <motion.div
                        key={feature.text}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border">
                          <feature.icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-foreground/70 font-medium">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="border-t border-border pt-8"
          >
            <div className="flex gap-12">
              {[
                { value: '50K+', label: 'Leads generated' },
                { value: '2.5x', label: 'Reply rate increase' },
                { value: '4.9', label: 'User rating', icon: Star },
              ].map((stat, i) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-1">
                    {stat.value}
                    {stat.icon && <stat.icon className="w-4 h-4 fill-primary text-primary" />}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Side - Form Panel */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative">
          {/* Vertical separator line */}
          <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-[400px]"
          >
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <div className="w-4 h-4 rounded-md bg-primary rotate-45" />
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">{appName}</span>
            </div>

            {/* Form container */}
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <motion.h2 
                  key={isLogin ? 'login-title' : 'signup-title'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-foreground"
                >
                  {isLogin ? 'Sign in' : 'Create account'}
                </motion.h2>
                <p className="text-muted-foreground">
                  {isLogin 
                    ? 'Enter your credentials to access your account' 
                    : 'Get started with 10 free lead credits'}
                </p>
              </div>

              {/* Inline Error Alert */}
              <AnimatePresence>
                {formError && (
                  <InlineAlert
                    variant="error"
                    title={isLogin ? "Sign in failed" : "Sign up failed"}
                    message={formError}
                    onDismiss={() => setFormError(null)}
                  />
                )}
              </AnimatePresence>

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full h-12 rounded-xl bg-card border-border text-foreground hover:bg-muted transition-all group"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="fullName" className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({ ...errors, email: undefined });
                      setFormError(null);
                    }}
                    className={`h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-all ${errors.email ? 'border-destructive' : ''}`}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({ ...errors, password: undefined });
                      setFormError(null);
                    }}
                    className={`h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-all ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <FieldError message={errors.password} />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base group transition-all"
                  disabled={loading || googleLoading}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Sign in' : 'Create account'}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="w-full py-3 text-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                By continuing, you agree to our{' '}
                <button onClick={() => navigate('/terms')} className="text-foreground/60 hover:text-foreground underline underline-offset-2">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button onClick={() => navigate('/privacy')} className="text-foreground/60 hover:text-foreground underline underline-offset-2">
                  Privacy Policy
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
