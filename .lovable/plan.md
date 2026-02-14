

## Two-Part Update: Landing Page Brand Colors + Onboarding Checklist Reorder

### Part 1: Replace all purple with cyan/teal across Landing Page

Every instance of `purple` in `Landing.tsx` will be replaced with the MediLead blue-to-cyan gradient palette.

**Color mapping:**
- `purple-600` / `purple-500` --> `cyan-600` / `cyan-500`
- `purple-400` --> `cyan-400`
- `purple-300` --> `cyan-300`
- `purple-50` --> `cyan-50`
- `purple-500/[0.03]` --> `cyan-500/[0.03]`

**Affected locations in `Landing.tsx`:**

| Element | Before | After |
|---|---|---|
| Hero gradient text "3x faster" | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| Hero bg | `from-blue-50 via-white to-purple-50` | `from-blue-50 via-white to-cyan-50` |
| Floating orbs | `bg-purple-400/15`, `bg-purple-300/10` | `bg-cyan-400/15`, `bg-cyan-300/10` |
| Transition gradient | `from-purple-50/30` | `from-cyan-50/30` |
| Nav logo bg | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| CTA buttons (hero, nav, pricing, CTA section) | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| Feature card hover border/gradient | `via-purple-500`, `to-purple-500/[0.03]` | `via-cyan-500`, `to-cyan-500/[0.03]` |
| Feature card icon bg | `to-purple-500/10`, `to-purple-500/20` | `to-cyan-500/10`, `to-cyan-500/20` |
| Stats gradient text | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| How it Works step number bg | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| How it Works decorative blob | `bg-purple-400/5` | `bg-cyan-400/5` |
| Features decorative blob | `bg-purple-400/[0.04]` | `bg-cyan-400/[0.04]` |
| Pricing popular badge | `from-primary to-purple-600` | `from-primary to-cyan-600` |
| Pricing popular card gradient line | `via-purple-500` | `via-cyan-500` |
| CTA section gradient bg | `to-purple-500/[0.04]` | `to-cyan-500/[0.04]` |
| CTA section icon | `to-purple-500/10`, `to-purple-600` | `to-cyan-500/10`, `to-cyan-600` |
| Footer logo | `from-primary to-purple-600` | `from-primary to-cyan-600` |

This is a straightforward find-and-replace of all `purple` references in the file.

---

### Part 2: Reorder and expand Onboarding Checklist to 5 steps

**File: `src/hooks/useOnboardingProgress.ts`**

Add `hasCompanyProfile` check and `hasSentOutreach` now queries `outreach_messages` instead of `leads` with status `contacted`.

New parallel queries:
1. `email_connections` where `is_active = true` (existing)
2. `profiles` where `company` is not null (new)
3. `campaigns` count > 0 (existing)
4. `leads` count > 0 (existing)
5. `outreach_messages` count > 0 (new, replaces the old `leads` status check)

Update `totalSteps` from 4 to 5. Update interface to include `hasCompanyProfile: boolean`.

**File: `src/components/OnboardingChecklist.tsx`**

- Add `Building2, Briefcase, Search` to lucide imports, remove `Sparkles, Users`
- Add new prop `onNavigateToCompanyProfile` for navigating to Settings > Company tab
- Reorder steps array to:
  1. Connect Gmail (Mail icon, `progress.hasEmailConnection`)
  2. Set up company profile (Building2 icon, `progress.hasCompanyProfile`)
  3. Create job opening (Briefcase icon, `progress.hasCampaign`)
  4. Find candidates (Search icon, `progress.hasLeads`)
  5. Send outreach (Send icon, `progress.hasSentOutreach`)

**File: `src/pages/Dashboard.tsx`**

- Add `onNavigateToCompanyProfile` prop to the `<OnboardingChecklist>` component, pointing to settings with the company tab active (e.g., `() => { setActiveTab('settings'); }` -- same as settings since company profile is a tab within settings)

### Technical Details

**useOnboardingProgress.ts changes:**
```typescript
// New query added to Promise.all:
supabase.from('profiles').select('company').eq('user_id', user.id).not('company', 'is', null).limit(1),
// outreach check changed from:
supabase.from('leads').select('id').eq('status', 'contacted').limit(1)
// to:
supabase.from('outreach_messages').select('id').limit(1)
```

**OnboardingChecklist.tsx new props interface:**
```typescript
interface OnboardingChecklistProps {
  onCreateCampaign: () => void;
  onNavigateToFinder: () => void;
  onNavigateToSettings: () => void;
  onNavigateToCompanyProfile: () => void;
  onNavigateToLeads: () => void;
}
```

