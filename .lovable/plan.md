
## What’s happening (based on your screenshots + code)

### 1) Google login error
Your screenshot shows this backend response:

- `code: 400`
- `error_code: "validation_failed"`
- `msg: "Unsupported provider: provider is not enabled"`

That means **Google sign-in is not enabled in your backend authentication settings**. The frontend is correctly sending the user to the backend OAuth authorize URL, but the backend rejects it because the Google provider is disabled.

### 2) Lead search error (“Edge Function returned a non‑2xx status code”)
Your lead search calls the backend function `exa-search`:

- Frontend: `src/lib/api.ts` → `supabase.functions.invoke('exa-search', { body })`
- Backend: `supabase/functions/exa-search/index.ts` now **requires a Bearer token** and returns **401** if missing/invalid (or **500** if token validation fails).

Because Google login is failing, you’re very likely **not actually authenticated**, so lead search hits the new auth requirement and fails with a non‑2xx.

There’s also a secondary risk: `exa-search` currently validates the token using `supabase.auth.getClaims(token)` on a client created with the service key; in other functions you validate via `auth.getUser()` using an anon-key client with the user’s Authorization header. Unifying this avoids subtle token-validation failures.

---

## Plan to fix both issues

### A) Enable Google provider in backend auth settings (fixes Google login)
1. Open Lovable Cloud Backend (the project’s backend UI).
2. Go to **Users / Authentication settings** → **Sign-in methods**.
3. **Enable Google** as a provider.
4. Configure redirect/callback URLs:
   - Add your **published domain** (and preview domain if you want Google login to work in preview).
   - Ensure the redirect URL you’re using in code is allowed:
     - Code uses: `redirectTo: ${window.location.origin}/dashboard` in `src/pages/Auth.tsx`
5. If you’re using “bring your own Google OAuth credentials”:
   - Add the **Client ID** and **Client Secret** in that same Google provider panel.
   - In Google Cloud Console, ensure the authorized redirect URIs match the backend’s required callback URL(s).

**Expected result:** clicking “Continue with Google” opens Google and successfully returns to your app with a valid session.

---

### B) Make lead search reliably authenticated + show a real error message (fixes lead search)
We’ll make this robust in two layers:

#### 1) Frontend: explicitly pass the user token to authenticated backend functions
Update `src/lib/api.ts` so `searchLeadsWithExa`, `generateOutreach`, and `enrichLeadWithLinkedIn` do:

- `const { data: { session } } = await supabase.auth.getSession()`
- If no session: return `{ success:false, error:'Authentication required' }`
- Call `supabase.functions.invoke(..., { headers: { Authorization: `Bearer ${session.access_token}` }, body })`

This removes any ambiguity about whether the SDK auto-attaches the token.

#### 2) Frontend: parse backend error bodies so the toast isn’t generic
In `searchLeadsWithExa` (and any other invoke wrapper), if `error` is present:
- Try reading `error.context?.body` and JSON-parse it.
- Prefer `body.error` (or `body.message`) over the generic “non‑2xx status code”.
This will produce actionable UI errors like:
- “Authentication required”
- “NO_CREDITS”
- “EXA_API_KEY not configured”
- etc.

#### 3) UI guardrail: don’t allow searching while logged out
In `src/components/LeadFinder.tsx`:
- Read `user` from `useAuth()`
- If user is missing, show a toast and route them to `/auth` (or disable the button with “Sign in to search”)
This prevents the confusing “search failed” state when login is broken.

---

### C) Backend: standardize token validation in `exa-search` to avoid false failures
Update `supabase/functions/exa-search/index.ts` to follow the same pattern as other secured functions:

1. Require `Authorization: Bearer ...`
2. Create a **user-scoped client** with `SUPABASE_ANON_KEY` and `global.headers.Authorization = authHeader`
3. Validate session via `await userClient.auth.getUser()`
4. Use a separate **admin client** (service key) for DB reads/writes

This avoids relying on `getClaims()` with a service client and makes behavior consistent across functions.

**Expected result:** once logged in, lead search returns 200 and begins the webset search workflow.

---

## Testing checklist (end-to-end)
1. From `/auth`, click **Continue with Google**
   - Confirm you are redirected back and stay logged in (you land in `/dashboard`).
2. Go to Lead Finder, run a query
   - Confirm you get “Search started!” (or a clear error like “No credits”).
3. While logged out (open an incognito tab), attempt to access lead search UI
   - Confirm you’re redirected to sign in or the button is disabled with a clear message.
4. Optional sanity checks:
   - Verify `generate-outreach` and LinkedIn enrichment still work (they also require auth now).

---

## Files that will be changed (once you approve this plan)
- `src/pages/Auth.tsx` (optional small tweaks to redirect handling / UX)
- `src/lib/api.ts` (attach Authorization header + improved error parsing)
- `src/components/LeadFinder.tsx` (guardrail when logged out)
- `supabase/functions/exa-search/index.ts` (token validation refactor to userClient + adminClient)

---

## Notes / risks
- Google login cannot be fixed purely in code if the provider is disabled; it must be enabled in backend auth settings.
- Enabling Google for both **preview** and **published** environments requires adding both domains to the allowed redirect configuration (recommended during development).
