

## Fix Landing Page Stats and Dashboard Background

Two issues to revert from the previous batch of changes:

### 1. Dashboard Background: Grey to White
The dashboard main area uses `bg-background` which maps to `hsl(0 0% 97%)` (light grey). Change the `--background` CSS variable from grey to white, or override the dashboard specifically to use a white background.

**Preferred approach:** Update `src/index.css` to change `--background` from `0 0% 97%` to `0 0% 100%` (pure white). This gives the whole app a clean white base instead of grey.

Alternatively, if you want the landing page to keep the subtle grey but dashboard to be white, we can add `bg-white` to the dashboard's main container in `src/pages/Dashboard.tsx` (line 311).

### 2. Landing Page Stats: Remove Card Boxes
The stats section currently wraps each stat in a white card with borders and shadows (`bg-card rounded-xl p-6 border border-border shadow-sm`). The screenshot shows these should be simple text items on the section background without visible card containers.

**File: `src/pages/Landing.tsx` (lines 91-102, StatItem component)**
- Remove the card styling (`bg-card rounded-xl p-6 border border-border shadow-sm`)
- Keep the text layout (gradient number, label, subtitle) but without a visible card wrapper
- Keep the subtle gradient accent line above each stat
- Use transparent/no-background so the stats sit cleanly on the section background

### Technical Details

**Files to modify:**
- `src/index.css` -- Change `--background: 0 0% 97%` to `--background: 0 0% 100%` (line 8)
- `src/pages/Landing.tsx` -- Remove card wrapper styling from `StatItem` component (lines 96), replace with simple `text-center flex flex-col items-center justify-center min-h-[140px]` without `bg-card`, `border`, or `shadow-sm`

