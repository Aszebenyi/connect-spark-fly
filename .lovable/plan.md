

## Add 4 New Sections to Landing Page

All changes in `src/pages/Landing.tsx`. Nothing existing gets removed or rewritten.

### 1. Update Stats Values (lines 429-433)
Replace current stat values with the user's requested numbers:
- "25%" / "Reply Rate" / "vs 5% industry avg"
- "3x" / "Faster Fill" / "vs manual sourcing"  
- "13hrs" / "Saved Weekly" / "per recruiter"
- "95%+" / "Accuracy" / "contact verified"

### 2. Add 3 New Feature Cards (line 227)
Append three new entries to the existing `features` array (currently 4 cards, will become 7). Uses existing `FeatureCard` component and existing visual element components. The grid will naturally reflow.

- **One-Click Job Import** -- "Paste any job posting URL from Indeed, LinkedIn, or career pages and we auto-extract title, requirements, and search query in seconds."
- **Email Deliverability Protection** -- "Smart daily sending limits based on your Gmail account age prevent spam folder issues and protect your sender reputation."
- **International Recruitment** -- "Works across US, UK, Canada, Australia, and UAE. Auto-adjusts license formats, currency, and regional medical terminology."

New icons imported from lucide-react: `Link`, `ShieldCheck`, `Globe`.

Since these use icons (not the custom visual elements), the `FeatureCard` component interface stays the same -- the lucide icons accept `className` just like the visual elements do.

### 3. Add "Works in Your Country" Section (after features, before wave divider -- line 466)
A new standalone section with country flags and bullet points:

```text
Works in Your Country

[flag chips: US, UK, Canada, Australia, UAE]

Automatically adjusts to show:
- Local license formats (State boards, NMC, AHPRA, etc.)
- Your currency (USD, GBP, CAD, AUD, AED)
- Regional terminology (ER vs A&E, ICU vs ITU)
```

Styled as an `AnimatedSection` with the same blue-cyan gradient accent as other sections. Country data pulled from `src/lib/countries.ts`.

### Technical Details

**File:** `src/pages/Landing.tsx`

**New imports (line 10):**
- `Link`, `ShieldCheck`, `Globe` from `lucide-react`
- `COUNTRIES` from `@/lib/countries`

**Features array (line 227):** Add 3 objects after the existing 4. Each uses a lucide icon component as the `visual` prop since lucide icons accept `className` just like the custom visual elements.

**Stats data (lines 429-433):** Update the 4 stat objects with new values/labels/subs.

**New section (insert after line 465):** "Works in Your Country" section wrapped in `AnimatedSection`, containing flag chips mapped from `COUNTRIES` and a bullet list of localization features. Placed between the features grid and the wave divider.

