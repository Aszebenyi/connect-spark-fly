

## MediLead Complete Fix Plan

This plan addresses the critical and high-priority fixes from the audit, organized into manageable phases.

---

### Phase 1: Critical Fixes

#### 1.1 Fix Auth Pages Dark Mode
The Auth (`/auth`), ForgotPassword (`/forgot-password`), and ResetPassword (`/reset-password`) pages all use hardcoded `bg-[#030303]` dark backgrounds with `text-white` styling, clashing with the light-mode app.

**Approach:** Set theme to "light" globally in `App.tsx` and convert all three auth pages to use theme-aware Tailwind classes instead of hardcoded dark colors.

**Files:**
- `src/App.tsx` -- Wrap app in a component that calls `setTheme("light")` once on mount
- `src/pages/Dashboard.tsx` -- Remove the per-page `setTheme("light")` useEffect (lines 42-48)
- `src/pages/Landing.tsx` -- Remove the per-page `setTheme("light")` useEffect (lines 203-207)
- `src/pages/Auth.tsx` -- Replace `bg-[#030303]` with `bg-background`, replace `text-white` with `text-foreground`, replace `text-white/50` with `text-muted-foreground`, replace `border-white/10` with `border-border`, replace `bg-white/[0.03]` with `bg-card`, etc. throughout the file (~482 lines)
- `src/pages/ForgotPassword.tsx` -- Same dark-to-light conversion (~311 lines). Remove pink glow background effects, use `bg-background` and theme-aware colors
- `src/pages/ResetPassword.tsx` -- Same dark-to-light conversion (~387 lines)

#### 1.2 Add International Settings Tab
The `InternationalSettingsTab` component exists but is not accessible.

**File: `src/components/SettingsPage.tsx`**
- Add import for `InternationalSettingsTab`
- Add `{ key: 'international' as const, label: 'International' }` to `settingsTabs` array (line 74)
- Update `SettingsTab` type to include `'international'` (line 81)
- Add render case for `activeTab === 'international'` showing the `InternationalSettingsTab` component

---

### Phase 2: Design Consistency

#### 2.1 Replace Glassmorphism with Flat Design
Replace all `glass-strong` and `glass-soft` classes with clean, flat alternatives across 11 files.

**Global replacements:**
- `glass-strong` becomes `bg-card border border-border` (using theme-aware tokens)
- `glass-soft` becomes `bg-card/50 border border-border/50`
- `card-shadow` stays as-is (already defined as a subtle `box-shadow`)

**Files affected:** `SettingsPage.tsx`, `OnboardingChecklist.tsx`, `LeadTable.tsx`, `LeadFinder.tsx`, `LeadResultCard.tsx`, `EmailModal.tsx`, `BulkEmailModal.tsx`, `InternationalSettingsTab.tsx`, `AdminSidebar.tsx`, `ErrorBoundary.tsx`, `NotFound.tsx`

#### 2.2 Simplify Status Badge Colors (3-color system)
Reduce visual noise in `LeadTable.tsx` status badges from 7+ colors to 3 categories:
- **Gray**: New, Unqualified, Lost (inactive/neutral)
- **Blue**: Contacted, Responded, Interview, Offer Sent (in-progress)
- **Green**: Replied, Qualified, Hired (positive outcomes)

#### 2.3 Fix Landing Page
- **Logo size**: Change `h-8` to `h-6` on line 251 of `Landing.tsx`
- **Stats section**: Wrap each `StatItem` in a white card with consistent `min-h`, flex centering, and a subtle top-border accent. Change section background from grey to light blue tint (`from-blue-50/50 to-white`). Add `items-stretch` to grid.

---

### Phase 3: UX Improvements

#### 3.1 Button Hierarchy Audit
Review and update button variants across key components for consistent visual hierarchy:
- Primary actions: `variant="default"` (Send Email, Create Job, Search)
- Secondary actions: `variant="outline"` (Export CSV, Cancel, View Details)
- Destructive actions: `variant="destructive"` (Delete, Remove)

**Files:** `LeadTable.tsx`, `CampaignCard.tsx`, `CreateCampaignDialog.tsx`

#### 3.2 Improve Empty States with CTAs
The `EmptyState` component already supports `actionLabel`/`onAction` props. Ensure all empty state usages pass meaningful action buttons:
- No campaigns: "Create First Job Opening" button
- No candidates: "Search for Candidates" button
- No emails sent: "View Candidates" button

**Files:** `Dashboard.tsx`, `LeadTable.tsx`

#### 3.3 Bulk Email Visibility
Add a visible "Send Bulk Emails" section above the candidates table in `LeadTable.tsx` with a Select All checkbox in the table header.

---

### Phase 4: Accessibility

#### 4.1 Focus Indicators
Add keyboard focus-visible styles to `src/index.css`:
- `*:focus-visible` with `outline: 2px solid` primary color and `outline-offset: 2px`
- Specific styles for buttons, links, inputs, and checkboxes

#### 4.2 Skip to Main Content
Add a visually-hidden skip link in `App.tsx` and `id="main-content"` on the Dashboard content area.

#### 4.3 Aria Labels
Add `aria-label` attributes to interactive elements in `LeadTable.tsx`, `CampaignCard.tsx`, and `Dashboard.tsx`.

---

### Items Deferred (Too Risky / Complex for This Batch)

- **Part 6 (Gmail OAuth from onboarding)**: The Gmail connection uses a dedicated `gmail-auth` edge function, not standard OAuth. Changing the onboarding flow to bypass Settings requires careful integration with that existing flow. Recommended as a separate task.
- **Part 7 (Job URL as primary flow)**: The `CreateCampaignDialog` already has URL extraction integrated. Reordering the UI is a separate design task.
- **Part 8 (Milestone celebrations)**: New feature, not a fix. Better as a follow-up.
- **Part 10 (Grouped search results)**: Requires understanding match score data availability. Better as a follow-up.

---

### Technical Summary

| Phase | Files Modified | Estimated Complexity |
|-------|---------------|---------------------|
| Phase 1 | 6 files | Medium (auth page restyling is the bulk) |
| Phase 2 | ~13 files | Low-Medium (mostly find/replace + stat redesign) |
| Phase 3 | ~4 files | Low |
| Phase 4 | ~4 files | Low |

**No database changes required.**

