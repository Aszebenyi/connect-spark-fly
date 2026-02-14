

## Remove Card Borders, Add Glow Effect to Stats Section

### Problem
The stats currently sit inside bordered cards which looks boxy. The stats section and the section below it both have a dull grey background. The user wants no card borders -- just the stats floating with a colorful glow behind them.

### Changes (all in `src/pages/Landing.tsx`)

**1. StatItem component (lines 87-105)**
- Remove the card styling: no `bg-card`, `border`, `shadow-sm`, `rounded-xl`, or `borderImage` style
- Keep centered layout with `text-center`
- Add a soft radial glow behind each stat value using a `before` pseudo-element or an inline div with a blurred gradient circle (blue-to-cyan, ~30% opacity, `blur-2xl`)

**2. Stats section background (line 417)**
- Change from `bg-gradient-to-b from-blue-50/50 to-white` to a white background: `bg-white`

**3. Features section (line 438)**
- Currently uses the default page background (grey-ish `--background`). Add `bg-white` to make it match and avoid the grey band effect.

**4. Transition div (line 414)**
- Update the transition gradient so it blends into white instead of `background`.

### Visual Result
- Stats float on a clean white section with soft blue/cyan glow orbs behind each number
- No card borders or boxes
- The section below (Features) also gets a white background so there is no grey band
