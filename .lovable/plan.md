
# Update Candidates Table

## Changes Overview

Updates to `src/components/LeadTable.tsx` to improve column layout, data display, and sorting.

## What Changes

### 1. Fix Search Placeholder
- "Search leads..." becomes "Search candidates..."

### 2. Add Location Column (after Employer)
- Display `lead.location` from the lead record
- Fallback: check `profile_data.location` or `profile_data.linkedin?.location`
- Show "-" if unavailable

### 3. Add Experience Column (after Certifications, before Match Score)
- Extract from `profile_data.years_experience` or `profile_data.linkedin?.totalExperienceYears`
- Parse years from `scoring_notes` as a fallback (e.g., "3+ years" or "15 years")
- Format: "5 yrs ICU" (combining years + first specialty) or "3 yrs" (if no specialty)
- Show "-" if unavailable

### 4. Fix Missing Employer Data
- Currently shows "-" when `lead.company` is null (3 of 10 leads have null company)
- Add fallback chain: `lead.company` -> `profile_data.company` -> `profile_data.linkedin?.company` -> `profile_data.linkedin?.latestCompany`
- This pulls from enrichment data when the initial parse missed it

### 5. Default Sort by Match Score (Highest First)
- Already implemented (`sortField` defaults to `'match_score'`, direction `'desc'`)
- No change needed here

### 6. Add Sortable Columns
- **Match Score**: Already sortable (no change)
- **Experience**: Add sort by `years_experience` from profile_data
- **Added Date**: Add sort by `createdAt` field
- All sortable headers get the clickable arrow indicator

### 7. Show Specialty in Subtitle
- In the Name/Title cell, append specialty from `profile_data.specialty`
- Format: "Registered Nurse . ICU Specialty" or "ICU CRITICAL CARE RN . Neuro, Surgical Specialty"
- Only show if specialty exists and differs from the title

## Updated Column Order

```text
Candidate | Employer | Location | License | Certifications | Experience | Match Score | Status | Actions
```

- `colSpan` in empty states updated from 7 to 9

## Technical Details

All changes are in **one file**: `src/components/LeadTable.tsx`

New helper functions:
- `getEmployer(lead)` -- fallback chain for company name
- `getLocation(lead)` -- fallback chain for location
- `getExperienceLabel(lead)` -- formats "X yrs Specialty" string
- `getExperienceYears(lead)` -- numeric value for sorting

Sorting logic update: add cases for `experience` (numeric from profile_data) and `createdAt` (date comparison).
