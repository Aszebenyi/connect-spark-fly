import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InlineAlert, FieldError } from '@/components/ui/inline-alert';
import { supabase } from '@/integrations/supabase/client';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import { mapAuthError } from '@/hooks/useInlineError';
import { z } from 'zod';
import { ArrowLeft, CheckCircle, Loader2, Lock, Shield, Sparkles, KeyRound } from 'lucide-react';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  
  const navigate = useNavigate();
  const { appName } = useBrandConfig();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setIsRecoveryMode(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setFieldError(passwordResult.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(mapAuthError(updateError));
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Invalid link state
  if (!isRecoveryMode) {
    return (
      <div className="min-h-screen w-full bg-background relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px]" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <div className="w-4 h-4 rounded-md bg-primary rotate-45" />
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">{appName}</span>
            </div>

            <div className="rounded-2xl bg-card border border-border p-8 shadow-sm">
              <InlineAlert
                variant="warning"
                title="Invalid Reset Link"
                message="This password reset link is invalid or has expired. Please request a new one."
                className="mb-6"
              />
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen w-full bg-background relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-success/10 blur-[200px]" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <div className="w-4 h-4 rounded-md bg-primary rotate-45" />
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">{appName}</span>
            </div>

            <div className="rounded-2xl bg-card border border-border p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 border border-success/20">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Password Reset!</h2>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully updated. Redirecting to dashboard...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[200px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Brand Panel */}
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16">
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

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] tracking-tight">
                  Set your<br />new password
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
                  Choose a strong password to keep your account secure. You'll be back to finding leads in no time.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Lock, text: 'Minimum 6 characters required' },
                  { icon: Shield, text: 'Your data is always encrypted' },
                  { icon: Sparkles, text: 'Back to leads instantly' },
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
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="border-t border-border pt-8"
          >
            <p className="text-muted-foreground text-sm">
              Changed your mind?{' '}
              <button 
                onClick={() => navigate('/auth')}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Sign in instead
              </button>
            </p>
          </motion.div>
        </div>

        {/* Right Side - Form Panel */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 relative">
          <div className="hidden lg:block absolute left-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-[400px]"
          >
            <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <div className="w-4 h-4 rounded-md bg-primary rotate-45" />
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">{appName}</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Set new password</h2>
                <p className="text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <InlineAlert
                    variant="error"
                    title="Reset failed"
                    message={error}
                    onDismiss={() => setError(null)}
                  />
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                      setFieldError(null);
                    }}
                    className="h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                      setFieldError(null);
                    }}
                    className="h-12 rounded-xl bg-card border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 transition-all"
                  />
                  <FieldError message={fieldError || undefined} />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
