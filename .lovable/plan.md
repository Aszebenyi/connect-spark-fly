

# Two Fixes: Logo Update + Theme per Page

## 1. Replace MediLead Logo
The logo file at `src/assets/medilead-logo.png` still shows the old icon (blue rounded square with a dot). The user has re-uploaded their desired logo (from the original Screenshot_2026-02-02_at_4.57.54_PM.png). We need to copy the correct uploaded image over the existing file again.

**Action:** Copy `user-uploads://Screenshot_2026-02-02_at_4.57.54_PM-2.png` to `src/assets/medilead-logo.png`, overwriting the current file.

## 2. Landing Page = Light  Mode, Dashboard = Light Mode (with user toggle)
Currently the app uses `next-themes` with `defaultTheme="dark"` globally. The user wants:
- Landing page (`/`): always Lightmode mode
- Dashboard (`/dashboard`): defaults to light mode, but users can toggle to dark via existing settings

**Approach:** Add a small `useEffect` hook in each page component to set the theme on mount:
- `Landing.tsx`: Call `setTheme("dark")` on mount
- `Dashboard.tsx`: Call `setTheme("light")` on mount (only if no user preference is saved; users who toggle dark mode in settings will have their preference respected)

This uses the existing `next-themes` `useTheme()` hook -- no new dependencies needed.

---

## Technical Details

**File: `src/assets/medilead-logo.png`**
- Overwrite with the correct uploaded logo image

**File: `src/pages/Landing.tsx`**
- Import `useTheme` from `next-themes`
- Add `useEffect` that calls `setTheme("dark")` on mount

**File: `src/pages/Dashboard.tsx`**
- Import `useTheme` from `next-themes`
- Add `useEffect` that calls `setTheme("light")` on mount (this sets the default; the existing theme toggle in settings will still work for the user to switch to dark)

