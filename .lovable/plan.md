

## Restore Color Gradients and Improve Stats Section

### Problem
The recent changes made the page too plain -- color gradients disappeared, the hero-to-stats transition feels disconnected with too much empty white space, and the glow behind stats is barely visible. Stats need to be bigger with a more vibrant gradient.

### Changes (all in `src/pages/Landing.tsx`)

**1. Better Hero-to-Stats Blend (line 415)**
- Replace the plain `h-32 bg-gradient-to-b from-cyan-50/30 via-white/50 to-white` with a shorter, smoother gradient that carries the hero's blue/cyan tones into the stats section, reducing the visual gap.

**2. Stats Section Background (line 418)**
- Change from plain `bg-white` to a soft gradient background: `bg-gradient-to-b from-white via-blue-50/30 to-white` to add warmth and color continuity from the hero.

**3. StatItem Component Improvements (lines 87-105)**
- Make stat values larger: bump from `text-4xl md:text-5xl` to `text-5xl md:text-6xl` for more visual impact.
- Enlarge the glow orb: increase from `w-24 h-24` to `w-32 h-32` and boost opacity from `from-primary/25 to-cyan-400/20` to `from-primary/30 to-cyan-400/25` so the glow is actually noticeable.
- Add a second, wider glow layer for depth (e.g., `w-40 h-40 blur-3xl` at lower opacity).

**4. Features Section Background (line 439)**
- Change from flat `bg-white` to `bg-gradient-to-b from-white to-blue-50/20` so there is a subtle color flow instead of everything being stark white.

### Visual Result
- Hero blends smoothly into the stats with carried-over blue/cyan tones
- Stats are bigger, bolder, with visible colorful glows behind the numbers
- Sections flow with soft blue gradients instead of flat white or grey
- The brand's blue-to-cyan color identity is present throughout

### Technical Details
All changes are in `src/pages/Landing.tsx`:
- Line 97: Update StatItem div classes for larger glow orbs
- Line 101: Increase stat value font size
- Line 415: Shorten and color the transition div
- Line 418: Add gradient background to stats section
- Line 439: Add gradient background to features section

