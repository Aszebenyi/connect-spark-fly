
# Remaining Work -- Project Completion Checklist

## Overview
Five functional gaps remain after the UI polish and CORS fixes. These are ordered by impact, from most critical to nice-to-have.

---

## 1. Profile & Notification Persistence (High Priority)

**Problem**: The Settings page profile form (`handleSaveProfile`) and notification toggles (`handleSaveNotifications`) only show a toast -- they don't persist anything to the database.

**Solution**:
- Create a `user_preferences` table with columns: `user_id`, `full_name`, `company`, `email_digest`, `lead_alerts`, `campaign_updates`, `weekly_report`
- Update `handleSaveProfile` to upsert name/company into `profiles` (already exists) and update `auth.user_metadata` via `supabase.auth.updateUser()`
- Update `handleSaveNotifications` to upsert into `user_preferences`
- Load saved preferences on mount via `useEffect`

**Files**:
- New migration (create `user_preferences` table with RLS)
- `src/components/SettingsPage.tsx` (wire up save/load)

---

## 2. Hardcoded "MediLead" Branding (Medium Priority)

**Problem**: The Landing page has 3 hardcoded "MediLead" references in feature descriptions and CTA text, even though `appName` is already available from `useBrandConfig()`.

**Locations**:
- Line 244: "...without leaving MediLead."
- Line 246: "...without leaving MediLead."
- Line 387: "MediLead finds qualified nurses..."
- Line 557: "...using MediLead to source..."

**Solution**: Replace all 4 instances with template literals using `appName`.

**Files**:
- `src/pages/Landing.tsx`

---

## 3. Mobile Responsive Layout (Medium Priority)

**Problem**: The dashboard uses a fixed `ml-72` sidebar with no mobile breakpoints. On screens under 768px, the sidebar overlaps or pushes content off-screen.

**Solution**:
- Make the sidebar collapsible on mobile with a hamburger toggle
- Add `lg:ml-72 ml-0` to the main content area
- Add a mobile top bar with app name and hamburger icon
- Use a backdrop overlay when sidebar is open on mobile

**Files**:
- `src/components/Sidebar.tsx` (add mobile toggle, overlay)
- `src/pages/Dashboard.tsx` (conditional margin, mobile header)

---

## 4. Candidate Table Filtering/Sorting/Search (Medium Priority)

**Problem**: Once candidates are in the table, there's no way to filter, sort, or search them without scrolling.

**Solution**:
- Add a search input above the table that filters by name, employer, or location
- Add clickable column headers for sorting (Name, Match Score, Experience, Status)
- Add a status filter dropdown (All, New, Contacted, Replied, etc.)
- All filtering is client-side on the already-loaded data

**Files**:
- `src/components/LeadTable.tsx` (add filter bar, sort logic, search state)

---

## 5. Delayed Email Queue Processor (Low Priority)

**Problem**: Email sequences with `delay_minutes > 0` are stored in `email_sequences` but there's no cron or processor that actually sends them after the delay.

**Solution**:
- Create a `process-email-queue` edge function (file already exists but may need review)
- Set up a pg_cron job or use Supabase's scheduled functions to call it periodically
- The processor checks for pending emails where `created_at + delay_minutes < now()` and sends them

**Files**:
- `supabase/functions/process-email-queue/index.ts` (review/update)
- New migration for pg_cron schedule (if needed)

---

## Recommended Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Fix hardcoded branding (quick win) | Small |
| 2 | Profile and notification persistence | Medium |
| 3 | Mobile responsive layout | Medium |
| 4 | Table filtering/sorting/search | Medium |
| 5 | Delayed email queue | Medium |

---

## Technical Notes

- The `profiles` table already exists and has `user_id` -- profile save can update `full_name` via `supabase.auth.updateUser()` and upsert company into profiles
- The `useBrandConfig` hook is already imported in `Landing.tsx` and `appName` is destructured -- the branding fix is just string interpolation
- For mobile layout, the Sidebar component is 217 lines with a fixed `w-72` -- it needs a `translate-x` toggle controlled by parent state
- Table filtering can reuse the existing `displayLeads` computed array with an additional `.filter()` step
