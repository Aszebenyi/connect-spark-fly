

## Enable Google OAuth Sign-In

The error "provider is not enabled" occurs because the Google OAuth provider needs to be configured through Lovable Cloud's managed authentication system.

### The Problem

Your project is calling `supabase.auth.signInWithOAuth()` directly, but Lovable Cloud requires using the managed `lovable.auth.signInWithOAuth()` function which handles all the OAuth configuration automatically.

### Solution

I will configure Google OAuth using Lovable Cloud's managed solution, which will:

1. Generate the required authentication module at `src/integrations/lovable/`
2. Install the `@lovable.dev/cloud-auth-js` package
3. Update the Auth page to use `lovable.auth.signInWithOAuth()` instead of the direct Supabase call

### Changes Required

**1. Configure Social Auth (Tool Call)**
- Use the social auth configuration tool to set up Google OAuth
- This generates the necessary Lovable integration files

**2. Update `src/pages/Auth.tsx`**
- Import the Lovable auth module
- Replace the current Google sign-in implementation:

```text
Current (broken):
  supabase.auth.signInWithOAuth({ provider: 'google', ... })

New (working):
  lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })
```

### Technical Details

- Lovable Cloud provides managed Google OAuth credentials by default, so no additional API keys are needed
- The managed solution automatically handles the OAuth flow, redirect URIs, and token exchange
- If you prefer to use your own Google OAuth credentials for branding purposes, you can configure them in the Cloud Dashboard under Authentication Settings

### After Implementation

You'll be able to sign in with Google immediately without any additional setup.

