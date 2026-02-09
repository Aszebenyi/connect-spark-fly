

# Fix Find Candidates: Restore Helper Text and Reposition Logo

## Issue 1: Restore Helper Text Below Search Input
The helper text "Paste a full job description or describe the role, location, and requirements. Be as specific as possible." was moved into the hero description but should also appear as helper text below the search input inside the search card (where it was before, but with the updated wording).

**Change in `src/components/LeadFinder.tsx`:**
- Add back the helper `<p>` tag between the search input and the Examples section (around line 232), with the text: "Paste a full job description or describe the role, location, and requirements. Be as specific as possible."

## Issue 2: Move MediLead Logo to Top-Right Corner
The logo is currently centered above the title. Move it to the top-right corner of the search card instead.

**Change in `src/components/LeadFinder.tsx`:**
- Remove the `<img>` from the hero section (line 199-201)
- Add the logo inside the search card (line 213), positioned absolute in the top-right corner using `absolute top-4 right-4`

---

## Technical Details

**File: `src/components/LeadFinder.tsx`**

| Lines | Change |
|-------|--------|
| 199-201 | Remove `<img>` logo from hero section |
| ~213-215 | Add logo `<img>` inside the search card, positioned `absolute top-4 right-4 w-10 h-10 object-contain` |
| ~232 | Re-add `<p className="text-sm text-muted-foreground mt-2 mb-2">Paste a full job description...</p>` between search input and Examples |
