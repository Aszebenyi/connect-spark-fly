
# Fix Google Login and Lead Search Errors

## Problem Analysis

### Issue 1: Google Login Error
**Error:** `"Unsupported provider: provider is not enabled"` (status 400)

**Root Cause:** The code in `src/pages/Auth.tsx` (line 98-103) uses the native Supabase OAuth method:
```typescript
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/dashboard` }
});
```

However, this project uses **Lovable Cloud** which requires using the `lovable.auth.signInWithOAuth()` method instead of the direct Supabase client.

### Issue 2: Lead Search Error
**Error:** `"Edge Function returned a non-2xx status code"`

**Root Cause:** The `exa-search` edge function requires authentication (lines 21-37), but the frontend `searchLeadsWithExa` function in `src/lib/api.ts` (lines 57-59) does not explicitly pass the Authorization header:
```typescript
const { data, error } = await supabase.functions.invoke('exa-search', {
  body: params,
});
```

The SDK may auto-attach headers in some cases, but for reliability (especially after the security hardening), explicit headers should be passed. Additionally, without being able to log in via Google, the user may not have a valid session at all.

---

## Implementation Plan

### Step 1: Configure Google OAuth for Lovable Cloud
Use the `supabase--configure-social-auth` tool to generate the proper Lovable Cloud authentication module. This will:
- Create/update the `src/integrations/lovable` folder with the managed OAuth client
- Install the `@lovable.dev/cloud-auth-js` package if needed

### Step 2: Update Auth.tsx to use Lovable OAuth
Replace the native Supabase OAuth call with the Lovable Cloud method:

**Current code (lines 93-113):**
```typescript
const handleGoogleSignIn = async () => {
  setGoogleLoading(true);
  setFormError(null);
  
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    // ...
  }
};
```

**Updated code:**
```typescript
import { lovable } from "@/integrations/lovable/index";

const handleGoogleSignIn = async () => {
  setGoogleLoading(true);
  setFormError(null);
  
  try {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    
    if (error) {
      setFormError(mapAuthError(error));
      setGoogleLoading(false);
    }
  } catch (err) {
    setFormError('Failed to connect with Google. Please try again.');
    setGoogleLoading(false);
  }
};
```

### Step 3: Update API Functions to Explicitly Pass Auth Headers
Modify `src/lib/api.ts` to ensure all authenticated edge function calls include the Authorization header:

**Functions to update:**
1. `searchLeadsWithExa` (lines 53-67)
2. `generateOutreach` (lines 69-84)
3. `enrichLeadWithLinkedIn` (lines 262-345) - specifically the `apify-scrape` invocation

**Pattern to apply:**
```typescript
export async function searchLeadsWithExa(params: {
  query?: string;
  campaignId?: string;
}): Promise<...> {
  // Get current session for auth header
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { success: false, error: 'Authentication required. Please sign in.' };
  }

  const { data, error } = await supabase.functions.invoke('exa-search', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: params,
  });

  if (error) {
    console.error('Exa search error:', error);
    // Parse backend error for better messages
    try {
      const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
      return { success: false, error: errorBody?.error || errorBody?.message || error.message };
    } catch {
      return { success: false, error: error.message };
    }
  }

  return data;
}
```

### Step 4: Add UI Guardrail in LeadFinder
Update `src/components/LeadFinder.tsx` to check for authentication before allowing searches:

**Add check in handleSearch:**
```typescript
const { user } = useAuth();

const handleSearch = async () => {
  if (!user) {
    toast({
      title: 'Sign in required',
      description: 'Please sign in to search for leads.',
      variant: 'destructive',
    });
    return;
  }
  // ... existing logic
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Import lovable module, update `handleGoogleSignIn` to use `lovable.auth.signInWithOAuth()` |
| `src/lib/api.ts` | Add explicit Authorization headers and improved error parsing to `searchLeadsWithExa`, `generateOutreach`, and `enrichLeadWithLinkedIn` |
| `src/components/LeadFinder.tsx` | Add authentication check before search |

---

## Technical Details

### Why explicit headers are needed
The Supabase JS client may auto-attach auth headers in some scenarios, but:
1. After security hardening, edge functions strictly validate tokens
2. Explicit headers ensure consistent behavior across all environments
3. Better error handling when session is missing

### Why Lovable OAuth is required
This project runs on Lovable Cloud, which manages OAuth providers through its own authentication layer. The native `supabase.auth.signInWithOAuth()` bypasses this and results in the "provider not enabled" error because the backend expects requests through the Lovable auth system.

---

## Testing Checklist
After implementation:
1. Click "Continue with Google" on the login page - should open Google consent screen
2. After selecting Google account, should redirect back and land on `/dashboard`
3. Go to Lead Finder, run a search query - should show "Search started!" or clear error (e.g., "No credits")
4. While logged out, attempt to search - should show "Sign in required" toast
5. Verify outreach generation still works for existing leads
