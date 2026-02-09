
# UI/UX Polish -- Professional Layout and Spacing

## Overview
Tighten spacing, increase density, and improve visual hierarchy across all major pages to give MediLead a polished, professional SaaS feel.

---

## 1. Candidates Table (`src/components/LeadTable.tsx`)

**Row density**
- Reduce all cell padding from `p-5` to `p-3` (both `<th>` and `<td>`)
- Reduce header bar padding from `p-6` to `p-4`
- Reduce footer padding from `p-6` to `p-4`

**Column headers**
- Increase header font from `text-sm` to `text-[13px]` with uppercase tracking (`uppercase tracking-wider`)

**Column widths**
- Apply `style={{ width: 'X%' }}` on each `<th>` matching the requested distribution (Candidate 20%, Employer 15%, Location 10%, License 10%, Certifications 15%, Experience 10%, Match Score 8%, Job Opening 10%, Status 7%, Actions 5%)
- Remove the "Added" column to reclaim space (it adds clutter with minimal value)

**Badges**
- Increase license/cert badge padding from `px-2 py-0.5` to `px-2.5 py-1`
- Increase cert badge font from `text-[11px]` to `text-xs`
- Increase gap between badge groups from `gap-1` to `gap-1.5`

**Vertical alignment**
- Add `align-middle` to all `<td>` elements via className

---

## 2. Dashboard Page (`src/pages/Dashboard.tsx` + components)

**Global page padding**
- Reduce main padding from `p-10` to `p-6`

**Page header**
- Reduce `page-header` margin-bottom from `mb-12` to `mb-6` (in `index.css`)

**Stats cards (`StatCard.tsx` + CSS)**
- Reduce `.stat-card` padding from `p-7` to `p-5`
- Reduce value font from `text-5xl` to `text-3xl`
- Reduce title margin-bottom from `mb-3` to `mb-1`
- Reduce stats grid bottom margin from `mb-12` to `mb-6`
- Reduce stats grid gap from `gap-6` to `gap-4`

**Quick Actions**
- Reduce action card padding (CSS `.action-card`) from `p-8` to `p-5`
- Reduce visual badge from `visual-badge-lg` (w-20 h-20) to default `visual-badge` (w-16 h-16), reduce icon size, reduce `mb-5` to `mb-3`
- Reduce heading from `text-xl` to `text-base`
- Reduce bottom margin from `mb-12` to `mb-6`
- Reduce grid gap from `gap-6` to `gap-4`

**Recent Candidates preview**
- Already shows up to 5 candidates on the dashboard; reduce its `mb-12` to `mb-6`

**Onboarding card**
- Already compact. Minor: reduce step item padding from `p-4` to `p-3`

---

## 3. Find Candidates Page (`src/components/LeadFinder.tsx`)

**Hero section**
- Reduce `mb-12` to `mb-6`
- Reduce `mb-8` (blob spacer) to `mb-4`
- Reduce heading from `text-4xl` to `text-2xl`
- Reduce subtitle from `text-xl` to `text-base`

**Search box card**
- Reduce padding from `p-10` to `p-6`
- Reduce search input padding from `px-6 py-5` to `px-4 py-3`
- Reduce button height from `h-16` to `h-12`
- Reduce `mb-10` (card bottom margin) to `mb-6`
- Make the input `text-base` instead of `text-lg`

**Example buttons**
- Make them `text-xs` instead of `text-sm`, reduce padding from `px-4 py-2` to `px-3 py-1.5`
- Reduce spacing between helper text and examples (`mt-4` to `mt-2`, `mb-3` to `mb-2`)

**Error messages**
- Wrap toast calls with a top-positioned variant (already using toast which appears at top -- no structural change needed)

---

## 4. Job Openings Empty State (`src/pages/Dashboard.tsx`, campaigns tab)

- Replace generic empty state with richer content:
  - Heading: "No job openings yet"
  - Subtext: "Job openings help you organize candidates by role. Create your first job opening to get started."
  - Add 2 ghost/preview example cards showing what a job opening looks like (static, non-interactive, with muted styling)
  - Make the CTA button larger and more prominent with the `apple-button` class

---

## 5. Global Spacing (`src/index.css`)

- `.page-header` margin-bottom from `mb-12` to `mb-6`
- `.section-header` margin-bottom from `mb-7` to `mb-4`
- Reduce `.page-title` from `text-4xl` to `text-3xl`
- Reduce `.page-subtitle` text from `text-lg` to `text-base`, margin from `mt-2` to `mt-1`
- Reduce `.stat-card` padding from `p-7` to `p-5`
- Reduce `.action-card` padding from `p-8` to `p-5`
- Reduce `.empty-state` padding from `p-16` to `p-10`
- Reduce `.visual-badge-lg` from `w-20 h-20` to `w-14 h-14`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Reduce global spacing tokens for page-header, section-header, stat-card, action-card, empty-state, visual-badge-lg, page-title, page-subtitle |
| `src/components/LeadTable.tsx` | Reduce cell/header padding, add column widths, remove "Added" column, enlarge badges, add align-middle |
| `src/components/StatCard.tsx` | Reduce value font size, tighten margins |
| `src/pages/Dashboard.tsx` | Reduce grid gaps, margins, quick action icon sizes, add richer job openings empty state with preview cards |
| `src/components/LeadFinder.tsx` | Reduce hero/search box padding, heading sizes, example button sizes |
| `src/components/OnboardingChecklist.tsx` | Minor step padding reduction |
| `src/components/EmptyState.tsx` | Reduce default vertical padding |
