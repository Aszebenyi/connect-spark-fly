

# Email Sending, Bulk Email, and Email History for MediLead

This plan adds three major features: individual email sending from the candidate table, bulk email sending for multiple candidates, and email history tracking with status management.

---

## Part 1: "Send Email" in Actions Menu + Email Modal

**What changes:**
- Add a "Send Email" option to the actions dropdown (the three-dot menu) in the candidate table
- Create a new `EmailModal` component that opens as a Dialog
- When opened, it auto-generates a personalized email using the existing `generateOutreach()` API
- User can edit subject and body before sending
- Sends via the existing `send-email` edge function (through `useEmailConnection` hook)

**New file: `src/components/EmailModal.tsx`**
- Uses shadcn Dialog component
- Shows From (read-only, from user profile), To (lead email, read-only), Subject (editable), Body (large textarea, editable)
- Loading spinner while generating email
- Cancel and Send buttons
- On send success: updates lead status to "contacted", saves outreach message, shows toast, calls `onSent()` callback

**Modified file: `src/components/LeadTable.tsx`**
- Add `Mail` icon import from lucide-react
- Add state for email modal (`emailModalLead`, `setEmailModalLead`)
- Add "Send Email" menu item in the actions dropdown after "View LinkedIn"
- Pass the `useEmailConnection` hook (or accept `onSendEmail` callback from parent)
- Render `EmailModal` at the bottom of the component

**Modified file: `src/pages/Dashboard.tsx`**
- Pass campaign context to LeadTable so EmailModal can use campaign goal for generation

---

## Part 2: Bulk Email Sending

**New file: `src/components/BulkEmailModal.tsx`**
- Dialog showing "Send Emails to {N} Candidates"
- Template editor with merge field variables: `{first_name}`, `{specialty}`, `{certifications}`, `{experience_years}`
- "Generate for All" button that calls `generateOutreach()` for each lead
- Preview section showing personalized version for the first lead
- Progress bar during sending (sends sequentially with 200ms delay)
- Maximum 50 emails per batch with warning
- Skips leads without valid email addresses
- Shows success/failure counts on completion
- Updates all sent leads to "contacted" status

**Modified file: `src/components/LeadTable.tsx`**
- Add bulk "Send Emails" button in the bulk action bar (next to Delete and Export)
- State for `showBulkEmail` modal
- Render `BulkEmailModal`

---

## Part 3: Email History in Candidate Detail Panel

**Modified file: `src/components/LeadDetailSheet.tsx`**
- Add new "Email History" section after the "Activity" section
- Query `outreach_messages` table for the selected lead (using existing `getOutreachMessages()` from api.ts)
- Show timeline of sent emails with date, subject, and status
- "View Full Email" expands to show full body
- "Send Follow-Up" button that opens the email modal pre-filled with context
- Remove the test mode override (luukalleman@gmail.com) -- send to actual lead email

---

## Part 4: Email Status Badges in Table

**Modified file: `src/components/LeadTable.tsx`**
- Add a small mail icon badge next to candidate name if emails have been sent
- Tooltip on hover showing count and last sent date
- Query outreach messages count per lead (batch query, not per-row)

---

## Part 5: Manual Status Updates in Actions Menu

**Modified file: `src/components/LeadTable.tsx`**
- Expand the status options in the actions dropdown to include:
  - Mark as Contacted
  - Mark as Replied
  - Mark as Interview Scheduled (new status)
  - Mark as Offer Sent (new status)
  - Mark as Hired (new status)

**Database migration:**
- No schema changes needed -- the `leads.status` column is a text field, so new status values work without migration
- Add indexes on `outreach_messages.lead_id` and `outreach_messages.sent_at` for query performance

---

## Part 6: Clickable Dashboard Stats

**Modified file: `src/pages/Dashboard.tsx`**
- Make stat cards clickable -- clicking navigates to the leads tab with a status filter pre-applied
- Pass initial status filter to LeadTable
- Add "Clear Filter" indicator when filtered

---

## Technical Details

### New Files
1. `src/components/EmailModal.tsx` -- Single email send dialog
2. `src/components/BulkEmailModal.tsx` -- Bulk email send dialog with progress

### Modified Files
1. `src/components/LeadTable.tsx` -- Send Email menu item, bulk email button, email badges, expanded status options
2. `src/components/LeadDetailSheet.tsx` -- Email history section, remove test mode override
3. `src/pages/Dashboard.tsx` -- Clickable stats, pass campaign context

### Database Migration
- Add index on `outreach_messages(lead_id)` for fast email history lookups
- Add index on `outreach_messages(sent_at)` for chronological ordering

### No New Edge Functions Needed
- `send-email` already exists and handles Gmail sending
- `generate-outreach` already exists for AI email generation
- `getOutreachMessages()` already exists in api.ts

