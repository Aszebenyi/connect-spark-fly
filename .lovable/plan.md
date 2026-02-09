

# Remaining Phase 2 Gaps

Most of what you described is already built. After reviewing every file, here are the **3 remaining items** that need fixing:

## 1. Fix Auto-Assignment to Use Junction Table

**Problem**: When searching from a job opening, `saveLeads()` still sets the old `campaign_id` column on the `leads` table instead of inserting into the `lead_campaign_assignments` junction table. This means candidates found via a job opening search aren't properly linked in the many-to-many system.

**Fix**: After inserting leads in `saveLeads()`, if a `campaignId` is provided, also insert rows into `lead_campaign_assignments` for each new lead.

## 2. Shift+Click Range Selection

**Problem**: The bulk selection system has individual checkboxes and "select all," but shift+click to select a range of rows is not implemented.

**Fix**: Track the last-clicked row index. On shift+click, select all rows between the last-clicked index and the current one.

## 3. Certifications "+X more" Overflow

**Problem**: The spec asks for max 3 visible certification badges with a "+X more" tooltip when there are more. Currently all badges are shown.

**Fix**: In the Certifications table cell, only render the first 3 badges. If there are more, show a small "+N more" badge with a title tooltip listing all certifications.

---

## Technical Details

### File: `src/lib/api.ts`
- In `saveLeads()`, after the leads insert succeeds and `campaignId` is provided, query back the inserted lead IDs and bulk-insert into `lead_campaign_assignments`.

### File: `src/components/LeadTable.tsx`
- Add a `lastClickedIndex` ref to track shift+click range selection.
- Update `toggleOne` to accept the row index and event, checking `event.shiftKey`.
- In the Certifications cell, slice to 3 items max and render a "+N more" indicator with a `title` attribute.

No database changes needed -- the junction table and RLS policies are already in place.

