import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            delay: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 404 Text */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <h1 className="text-[120px] md:text-[160px] font-bold leading-none tracking-tighter">
              <span className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                404
              </span>
            </h1>
          </motion.div>

          {/* Card */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3">
              Page Not Found
            </h2>
            
            <p className="text-muted-foreground mb-8">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/')}
                className="apple-button w-full gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </Button>
              
              <Button 
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </a>
            <span className="text-border">•</span>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <span className="text-border">•</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
