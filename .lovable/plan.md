
## Fix Logo and Subtitle Layout

### 1. Fix the logo in the navbar
The logo file at `public/medilead-logo.png` may be corrupted from the previous copy. Re-copy the user's uploaded logo file to `public/medilead-logo.png` to ensure it displays correctly in the navbar.

### 2. Widen the subtitle to fit on 2 lines
Change the subtitle's `max-w-2xl` class to `max-w-3xl` so the text wraps across 2 lines instead of 3.

**File:** `src/pages/Landing.tsx` (line 356)
- Change: `max-w-2xl` to `max-w-3xl`

### Technical Details
- Re-copy `user-uploads://Screenshot_2026-02-02_at_4.57.54_PM-removebg-preview_1-2.png` to `public/medilead-logo.png`
- Single class change on line 356 of `src/pages/Landing.tsx`
