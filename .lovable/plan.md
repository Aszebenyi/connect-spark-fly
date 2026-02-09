
# Find Candidates Page Updates

## Changes

### 1. Update description text
Replace the current helper text with:
"Paste a full job description or describe the role, location, and requirements. Be as specific as possible."

### 2. Fix suggestion bubbles truncation
The bubbles currently use `truncate` (single-line ellipsis) on a fixed `grid-cols-2` layout. Change to `flex flex-wrap` so each bubble auto-sizes to fit its content instead of being forced into equal widths.

### 3. Fix "OR Nurse" suggestion
Change `'OR Nurse - Miami, FL - 2+ years, BLS/ACLS/PALS certified'` to `'Nurse - Miami, FL - 2+ years, BLS/ACLS/PALS certified'`.

### 4. Add MediLead logo
Copy the uploaded logo to `src/assets/medilead-logo.png` and replace the current SparkBurst icon in the hero section with the logo image.

---

## Technical Details

**File: `src/components/LeadFinder.tsx`**

| Line(s) | Change |
|---------|--------|
| 22 (suggestions array) | Change `'OR Nurse - Miami, FL...'` to `'Nurse - Miami, FL...'` |
| 198-204 (hero icon) | Replace `SparkBurst`/`AbstractBlob` with `<img>` using the imported logo |
| 209-213 (description) | Update to new text for non-campaign mode |
| 240-242 (helper text) | Remove duplicate helper text (merged into description above) |
| 247-257 (suggestion buttons) | Change from `grid grid-cols-2` to `flex flex-wrap gap-2`, remove `truncate` class so text shows fully |

**New file:** `src/assets/medilead-logo.png` (copied from upload)
