

## Fix: Ensure "No Credits" Shows a Friendly Message Instead of an Error

### Problem
When the edge function returns a 402 (NO_CREDITS), the Supabase JS client treats it as an error. The `searchLeadsWithExa` function tries to parse the error body to extract the `"NO_CREDITS"` string, but this parsing can fail depending on the error format, resulting in a generic "Edge function returned 402" error message instead of the friendly "No credits remaining - upgrade" toast.

### Root Cause
The `error.context?.body` parsing in `src/lib/api.ts` (line 75) may not reliably extract the JSON body from a 402 response. If parsing fails, the fallback `error.message` is a generic string that doesn't match `"NO_CREDITS"`.

### Solution

#### 1. Make the API layer more robust at parsing 402 errors (`src/lib/api.ts`)
- Try multiple paths to extract the error response: `error.context?.body`, `error.message`, and check if the error itself contains structured data
- Also check for HTTP status code 402 explicitly

#### 2. Also catch it at the UI level as a fallback (`src/components/LeadFinder.tsx`)  
- In the generic error handler, check if the error message contains "402" or "credits" and show the upgrade message instead of a generic error

#### 3. Prevent the search from even firing when credits are exhausted
- The button already disables when `!hasCredits`, but the subscription data might be stale
- Call `refreshSubscription()` before searching to ensure credit data is current

### Technical Details

**File: `src/lib/api.ts`** (lines 71-79)
- Improve error body parsing to handle multiple formats
- Add explicit check: if error message includes "402", attempt to parse body as JSON and look for `error` field
- Return `"NO_CREDITS"` as the error string when a 402 is detected even if body parsing fails

**File: `src/components/LeadFinder.tsx`**  
- In the `catch` block (~line 100), add a check for "402" or "credit" in the error message to show upgrade-specific toast
- Before searching, call `refreshSubscription()` to get fresh credit data, so the `!hasCredits` guard catches it before the API call

### Changes Summary
- `src/lib/api.ts` - More robust 402/NO_CREDITS error parsing (3-5 lines changed)
- `src/components/LeadFinder.tsx` - Add pre-search credit refresh + fallback 402 handling (~5 lines added)
