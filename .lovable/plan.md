

## MediLead Improvement Plan - Prioritized Phases

This plan adapts the comprehensive improvement prompt to what actually needs to be done, skipping items already implemented in your codebase.

### Already Done (No Work Needed)
- Status badges already use 3-color system (gray/blue/green)
- Focus-visible CSS styles already exist
- Skip-to-main-content link already in App.tsx
- Onboarding already has 5 steps (country step removed)
- React Query already installed
- `aria-label` on checkboxes in LeadTable already present
- NotificationBell already implemented

---

### Phase 1: Database Performance Indexes (Quick Win)

Add missing database indexes for faster queries on large datasets. This is a single migration with no code changes.

**Tables affected:** leads, campaigns, outreach_messages, email_log, email_send_limits, lead_campaign_assignments

---

### Phase 2: Code Splitting with Lazy Loading

Currently all pages are eagerly imported in App.tsx. Lazy-load heavy routes (Dashboard, AdminDashboard, Auth, Landing) to reduce initial bundle size.

**Files to modify:**
- `src/App.tsx` - Add `React.lazy()` and `Suspense` for all route components

---

### Phase 3: Add Aria Labels to Icon-Only Buttons

Several icon-only buttons in LeadTable, Dashboard, and other components lack `aria-label` attributes. Add them for screen reader accessibility.

**Files to modify:**
- `src/components/LeadTable.tsx` - Delete, email, and action buttons
- `src/components/NotificationBell.tsx` - Bell button
- `src/pages/Dashboard.tsx` - Mobile menu button

---

### Phase 4: Memoization for LeadTable Performance

LeadTable (942 lines) re-renders expensively. Add `useMemo` for filtered/sorted leads and `useCallback` for handlers. Wrap the component's row rendering with `memo`.

**Files to modify:**
- `src/components/LeadTable.tsx` - Wrap `filteredLeads` computation in `useMemo`, memoize event handlers with `useCallback`

---

### Phase 5: Structured Edge Function Logging

Create a shared logger utility for edge functions to produce structured JSON logs with consistent format (timestamp, level, userId, endpoint). This replaces scattered `console.error` calls.

**Files to create:**
- `supabase/functions/_shared/logger.ts`

**Files to modify:**
- `supabase/functions/exa-search/index.ts`
- `supabase/functions/generate-outreach/index.ts`
- `supabase/functions/send-email/index.ts`
- Other edge functions (apply same pattern)

---

### Phase 6: Rate Limiting for Edge Functions

Add a rate_limits database table and shared rate-limiter utility. Apply rate checks to all user-facing edge functions to prevent abuse.

**Database changes:**
- Create `rate_limits` table with RLS
- Add cleanup function for expired entries

**Files to create:**
- `supabase/functions/_shared/rate-limiter.ts`

**Files to modify:**
- `supabase/functions/exa-search/index.ts`
- `supabase/functions/generate-outreach/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/functions/apify-scrape/index.ts`
- `supabase/functions/extract-company-identity/index.ts`
- `supabase/functions/free-lead-sample/index.ts`

---

### Phase 7: Improve Landing Page Value Proposition

Strengthen the hero section with more specific claims (e.g., time-to-fill reduction, reply rates), add a social proof section with testimonials, and refine CTAs.

**Files to modify:**
- `src/pages/Landing.tsx` - Update hero copy, add testimonials section

---

### What's NOT Included (and Why)

| Suggestion | Reason Skipped |
|---|---|
| Sentry integration | Requires external account, API keys, and npm packages not available in Lovable |
| Blog/content pages | Content creation is outside scope of code changes |
| Component refactoring (break LeadTable into subfiles) | Large refactor with high risk, memoization in Phase 4 provides the performance benefit |
| Design tokens file | Current CSS variables already serve this purpose |
| `cron.schedule` for rate limit cleanup | Not available in Lovable Cloud environment |

---

### Technical Details

**Phase 1 - Indexes Migration SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_created ON public.campaigns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign ON public.outreach_messages(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON public.outreach_messages(status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_limits_user_date ON public.email_send_limits(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_campaign ON public.lead_campaign_assignments(campaign_id);
```

**Phase 2 - Code Splitting Pattern:**
```typescript
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
// Wrap Routes in <Suspense fallback={<PageLoader />}>
```

**Phase 5 - Logger Pattern:**
```typescript
export function logError(error: any, context: { userId?: string; endpoint?: string }) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message || 'Unknown error',
    ...context,
  }));
}
```

**Phase 6 - Rate Limiter:**
Uses a `rate_limits` table to track per-user, per-endpoint request counts within sliding windows. Each edge function checks the limit before processing. Cleanup happens inline (delete stale entries on read) since cron is not available.

### Estimated Implementation Order
1. Phase 1 (Indexes) - fastest, highest impact on DB performance
2. Phase 2 (Code splitting) - quick App.tsx change, improves load time
3. Phase 3 (Aria labels) - small targeted edits
4. Phase 4 (Memoization) - LeadTable performance
5. Phase 5 (Logging) - edge function observability
6. Phase 6 (Rate limiting) - security hardening
7. Phase 7 (Landing page) - business/conversion improvement

