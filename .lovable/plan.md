

## Fix Landing Page Styling for Light Mode

The landing page has dozens of dark-theme CSS values (white at low opacity for borders, shadows, backgrounds) that are invisible or wrong on a light background. This plan replaces them with proper light-mode equivalents to restore visual depth and polish while staying in light mode.

### Changes Overview

**File: `src/pages/Landing.tsx`**

1. **Navigation bar** (lines 270-340)
   - Replace `border-white/[0.08]` with `border-border/60`
   - Replace heavy dark shadow `shadow-[0_8px_32px_rgba(0,0,0,0.4)]` with light shadow `shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]`
   - Replace `via-white/10` shine with `via-black/[0.04]`
   - Replace `bg-white/[0.03]` nav link backgrounds with `bg-black/[0.03]` and hover `bg-black/[0.04]`

2. **Hero background grid** (line 351)
   - Replace `rgba(255,255,255,0.01)` grid lines with `rgba(0,0,0,0.03)` so the subtle grid is visible on light backgrounds

3. **Pricing cards** (lines 116-119)
   - Non-popular cards: Replace `border-white/10`, `ring-white/5` with `border-border`, `ring-border/50`
   - Popular card: Keep as-is (already uses `border-primary/60` which works in light mode)

4. **"How it Works" section** (lines 478-523)
   - Replace `bg-white` with `bg-muted/50` so it contrasts with the main background
   - Replace `bg-neutral-50/80 border-neutral-100` step cards with `bg-card border-border/80`
   - Replace hardcoded `text-neutral-900` and `text-neutral-500` with `text-foreground` and `text-muted-foreground`
   - Update wave SVG dividers (lines 472-475, 527-530): change `fill="white"` to `fill="hsl(220 10% 95%)"` to match the new section background

5. **Visual elements file: `src/components/ui/visual-elements.tsx`**
   - Replace all LeadPulse pink/magenta (`hsl(330 100% 60%)`) with MediLead blue (`hsl(210 80% 50%)`)
   - Replace all `hsl(350 100% 68%)` with `hsl(210 80% 65%)`
   - Affects gradients in: `HexagonBadge`, `WavePattern`, `AbstractBlob`, `CircuitLines`, `SendArrow`, `MagnetPull`

6. **CSS glass utilities: `src/index.css`**
   - Restore `.glass` with light-mode-appropriate glassmorphism: `background: hsl(var(--card) / 0.7); backdrop-filter: blur(20px);`
   - Restore `.glass-strong` similarly with higher opacity

### What stays the same
- Theme remains `light` -- no dark mode revert
- Dashboard styles untouched
- Page layout, copy, and structure unchanged
- All component imports unchanged

### Technical Details

**Nav shadow replacement:**
```
Before: shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
After:  shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)]
```

**Pricing card (non-popular) replacement:**
```
Before: border-white/10 bg-card/80 hover:border-white/20 ring-1 ring-white/5
After:  border-border bg-card/80 hover:border-primary/20 ring-1 ring-border/50
```

**How it Works section:**
```
Before: bg-white (blends into light bg)
After:  bg-muted/50 (subtle contrast with main background)
```

**Wave SVG fills:**
```
Before: fill="white"
After:  uses CSS variable-based fill matching the muted section color
```

**Visual elements color swap (example):**
```
Before: hsl(330 100% 60%) (pink)
After:  hsl(210 80% 50%) (blue)
```

