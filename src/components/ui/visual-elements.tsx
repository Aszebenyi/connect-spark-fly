import { cn } from '@/lib/utils';

// Custom abstract shapes instead of icons
export function PulseOrb({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" />
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/30" />
      <div className="absolute top-1/4 left-1/4 w-1/4 h-1/4 rounded-full bg-white/30 blur-sm" />
    </div>
  );
}

export function DiamondShape({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div 
        className="w-full h-full bg-gradient-to-br from-primary to-primary/60 rotate-45 rounded-lg shadow-lg shadow-primary/20"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rotate-45 rounded-lg" />
    </div>
  );
}

export function HexagonBadge({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full absolute">
        <defs>
          <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(210 80% 50% / 0.2)" />
            <stop offset="100%" stopColor="hsl(210 80% 50% / 0.05)" />
          </linearGradient>
        </defs>
        <polygon 
          points="50,2 95,25 95,75 50,98 5,75 5,25" 
          fill="url(#hexGrad)"
          stroke="hsl(210 80% 50% / 0.3)"
          strokeWidth="1"
        />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function RingLoader({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
    </div>
  );
}

export function GlowDot({ className, color = 'primary' }: { className?: string; color?: 'primary' | 'success' | 'warning' }) {
  const colors = {
    primary: 'bg-primary shadow-primary/50',
    success: 'bg-success shadow-success/50',
    warning: 'bg-warning shadow-warning/50',
  };
  
  return (
    <div className={cn('relative', className)}>
      <div className={cn('w-full h-full rounded-full shadow-lg', colors[color])} />
      <div className={cn('absolute inset-0 rounded-full animate-ping opacity-30', colors[color].split(' ')[0])} />
    </div>
  );
}

export function WavePattern({ className }: { className?: string }) {
  return (
    <svg className={cn('', className)} viewBox="0 0 100 20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(210 80% 50% / 0.3)" />
          <stop offset="50%" stopColor="hsl(210 80% 65% / 0.3)" />
          <stop offset="100%" stopColor="hsl(210 80% 50% / 0.3)" />
        </linearGradient>
      </defs>
      <path 
        d="M0,10 Q25,0 50,10 T100,10 V20 H0 Z" 
        fill="url(#waveGrad)"
      />
    </svg>
  );
}

export function AbstractBlob({ className }: { className?: string }) {
  return (
    <svg className={cn('', className)} viewBox="0 0 200 200">
      <defs>
        <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(210 80% 50% / 0.4)" />
          <stop offset="100%" stopColor="hsl(210 80% 65% / 0.2)" />
        </linearGradient>
      </defs>
      <path 
        d="M47.5,-57.2C59.3,-46.8,65.4,-29.8,67.8,-12.5C70.2,4.8,69,22.3,60.8,36.2C52.6,50.1,37.3,60.3,20.5,66.1C3.7,71.9,-14.7,73.2,-30.8,67.2C-46.9,61.2,-60.8,47.8,-68.2,31.5C-75.6,15.2,-76.6,-4.1,-71.1,-21.3C-65.6,-38.5,-53.7,-53.7,-39.3,-63.4C-24.9,-73.1,-8,-77.4,5.5,-84C19,-90.6,35.7,-67.6,47.5,-57.2Z" 
        transform="translate(100 100)" 
        fill="url(#blobGrad)"
      />
    </svg>
  );
}

export function CircuitLines({ className }: { className?: string }) {
  return (
    <svg className={cn('', className)} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(210 80% 50% / 0.5)" />
          <stop offset="100%" stopColor="hsl(210 80% 50% / 0.1)" />
        </linearGradient>
      </defs>
      <path 
        d="M10,50 H30 L40,30 H60 L70,50 H90" 
        stroke="url(#circuitGrad)" 
        strokeWidth="2" 
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="30" cy="50" r="3" fill="hsl(210 80% 50%)" />
      <circle cx="70" cy="50" r="3" fill="hsl(210 80% 50%)" />
    </svg>
  );
}

export function TargetRings({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 rounded-full border border-primary/20" />
      <div className="absolute inset-[15%] rounded-full border border-primary/30" />
      <div className="absolute inset-[30%] rounded-full border border-primary/50" />
      <div className="absolute inset-[42%] rounded-full bg-primary shadow-lg shadow-primary/40" />
    </div>
  );
}

export function SparkBurst({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-1/3 bg-gradient-to-t from-primary to-transparent origin-bottom"
            style={{ transform: `rotate(${i * 45}deg)` }}
          />
        ))}
      </div>
      <div className="absolute inset-[35%] rounded-full bg-primary shadow-lg shadow-primary/40" />
    </div>
  );
}

export function DataFlow({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 flex flex-col justify-between py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-shimmer" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
      <div className="absolute inset-[30%] rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30" />
    </div>
  );
}

export function StackedBars({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-end justify-center gap-1', className)}>
      <div className="w-1.5 h-[40%] rounded-full bg-primary/40" />
      <div className="w-1.5 h-[70%] rounded-full bg-primary/60" />
      <div className="w-1.5 h-[55%] rounded-full bg-primary/80" />
      <div className="w-1.5 h-[90%] rounded-full bg-primary" />
    </div>
  );
}

export function ChatBubbles({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute top-0 left-0 w-3/5 h-2/5 rounded-xl bg-primary/30 rounded-bl-none" />
      <div className="absolute bottom-0 right-0 w-3/5 h-2/5 rounded-xl bg-primary/60 rounded-br-none" />
    </div>
  );
}

export function SendArrow({ className }: { className?: string }) {
  return (
    <svg className={cn('', className)} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(210 80% 50%)" />
          <stop offset="100%" stopColor="hsl(210 80% 65%)" />
        </linearGradient>
      </defs>
      <path 
        d="M5 12L3 21L21 12L3 3L5 12ZM5 12L13 12" 
        stroke="url(#arrowGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function MagnetPull({ className }: { className?: string }) {
  return (
    <svg className={cn('', className)} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="magnetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(210 80% 60%)" />
          <stop offset="100%" stopColor="hsl(210 80% 45%)" />
        </linearGradient>
        <linearGradient id="magnetGlow" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="hsl(210 80% 50% / 0.6)" />
          <stop offset="100%" stopColor="hsl(210 80% 50% / 0)" />
        </linearGradient>
      </defs>
      {/* Glow effect */}
      <ellipse cx="24" cy="32" rx="12" ry="6" fill="url(#magnetGlow)" />
      {/* Center orb */}
      <circle cx="24" cy="18" r="8" fill="url(#magnetGrad)" />
      <circle cx="21" cy="15" r="2" fill="white" fillOpacity="0.4" />
      {/* Attraction lines */}
      <path d="M24 28 L24 38" stroke="hsl(210 80% 50% / 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M18 26 L12 34" stroke="hsl(210 80% 50% / 0.3)" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 3" />
      <path d="M30 26 L36 34" stroke="hsl(210 80% 50% / 0.3)" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 3" />
      {/* Orbiting dots */}
      <circle cx="14" cy="20" r="2.5" fill="hsl(210 80% 50% / 0.5)" />
      <circle cx="34" cy="16" r="2" fill="hsl(210 80% 50% / 0.4)" />
      <circle cx="28" cy="28" r="1.5" fill="hsl(210 80% 50% / 0.3)" />
    </svg>
  );
}
