

# Test Results and Bug Fix Plan

## Testing Summary

I tested every accessible route and major feature of the app. Here are my findings:

### Working Correctly
- **Landing page** (`/`): Hero, navigation, features, pricing all render properly
- **Annual billing toggle**: Switches between monthly/annual pricing with correct prices and "Save 20%" badges
- **Contact dialog**: Opens and displays the form correctly
- **Forgot password** (`/forgot-password`): Renders with form and branding
- **Terms** (`/terms`): Renders full content
- **404 page**: Shows properly for unknown routes
- **Mobile responsive**: Landing page renders well at 390x844 viewport
- **Toast migration**: LeadTable, LeadDetailSheet, LeadFinder, CampaignCard, ContactForm, CompanyProfileTab all use `sonner` correctly

### Bugs Found

---

**BUG 1 (Critical): Auth page (`/auth`) is completely blank**

The page renders as a white screen. The console shows:
```
SyntaxError: Unexpected token '{'
```
This error originates from `@lovable.dev/cloud-auth-js` chunk. The `Auth.tsx` component imports `lovable` from `@/integrations/lovable/index` for Google OAuth (`lovable.signInWithOAuth`). The lazy-loaded chunk fails to parse, crashing the entire page silently (no error boundary catches it since it's a module parse error).

**Fix**: The `@lovable.dev/cloud-auth-js` package may have a compatibility issue. Wrap the Google OAuth import in a dynamic `import()` or add a try/catch around the usage. Alternatively, fall back to `supabase.auth.signInWithOAuth` directly so the page doesn't depend on this package at all.

---

**BUG 2 (Medium): PostHog fires 404/401 errors on every page load**

The PostHog snippet uses the placeholder `YOUR_POSTHOG_KEY`, causing 4+ network errors per page:
- `404` on config.js fetch
- `401` on flags endpoint
- MIME type refusal errors

These errors clutter the console and slow down page loads slightly.

**Fix**: Either replace `YOUR_POSTHOG_KEY` with a real key, or conditionally load the PostHog snippet only when a real key is configured. Add a guard like: `if (key !== 'YOUR_POSTHOG_KEY') posthog.init(key, ...)`.

---

**BUG 3 (Low): ContactDialog ref warning**

Console shows: `Function components cannot be given refs. Attempts to access this ref will fail.`

The `ContactDialog` component is a function component being passed a ref (likely from `AnimatePresence` in `Landing.tsx`). 

**Fix**: Wrap `ContactDialog` with `React.forwardRef` or restructure the animation wrapper.

---

**BUG 4 (Low): OpeningDetail still uses `useToast` instead of sonner**

The toast migration to sonner was applied to most files, but `OpeningDetail.tsx` (line 6) still imports `useToast` from `@/hooks/use-toast`. This is inconsistent with the rest of the codebase.

**Fix**: Replace `import { useToast } from '@/hooks/use-toast'` with `import { toast } from 'sonner'` and update all toast calls in the file.

---

**BUG 5 (Low): Framer Motion scroll offset warning**

Console shows: `Please ensure that the container has a non-static position, like 'relative', 'fixed', or 'absolute' to ensure scroll offset is calculated correctly.`

This is a minor framer-motion warning from a scroll-linked animation container.

**Fix**: Add `position: relative` to the container element triggering scroll animations on the landing page.

---

## Proposed Fix Priority

1. **Auth page blank screen** -- Critical, blocks all sign-in/sign-up
2. **PostHog placeholder errors** -- Medium, console noise on every page
3. **ContactDialog ref warning** -- Low, cosmetic console warning
4. **OpeningDetail toast migration** -- Low, consistency fix
5. **Framer Motion scroll warning** -- Low, cosmetic console warning

## Technical Implementation

### Fix 1: Auth page
- In `Auth.tsx`, replace `lovable.signInWithOAuth("google", ...)` with `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
- Remove the `import { lovable } from '@/integrations/lovable/index'` line
- This eliminates the dependency on the problematic `@lovable.dev/cloud-auth-js` package for this page

### Fix 2: PostHog guard
- In `index.html`, wrap the `posthog.init()` call with a check: only initialize if the key is not the placeholder
- In `src/lib/analytics.ts`, add the same guard to `trackEvent` and `identifyUser`

### Fix 3: ContactDialog ref
- Wrap the `ContactDialog` component with `React.forwardRef`

### Fix 4: OpeningDetail toast
- Replace `useToast` import with `sonner` import
- Update all `toast({ title: ... })` calls to `toast.success(...)` or `toast.error(...)`

### Fix 5: Framer Motion warning
- Add `className="relative"` to the scroll container triggering the warning on the landing page

