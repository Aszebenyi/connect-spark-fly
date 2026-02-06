

## Fix Your Account Setup and Grant Admin Access

Your signup was successful (I can see it in the auth logs), but the database trigger that should automatically create your profile didn't fire. I'll fix this by manually creating the required records.

### What I'll Do

1. **Create your profile** in the `profiles` table with your user details
2. **Create your subscription** in the `subscriptions` table (free plan with 10 credits)
3. **Grant admin access** by inserting a record into the `user_roles` table

### Database Changes

I'll run SQL migrations to insert the following records:

```text
profiles table:
- user_id: ed18d141-2f19-4b3c-a267-c26048c64fa9
- email: anthony.szebenyi@gmail.com
- full_name: Anthony Szebenyi

subscriptions table:
- user_id: ed18d141-2f19-4b3c-a267-c26048c64fa9
- plan_id: free
- credits_limit: 10
- credits_used: 0

user_roles table:
- user_id: ed18d141-2f19-4b3c-a267-c26048c64fa9
- role: admin
```

### After Implementation

Once approved, you'll be able to:
- Access the admin dashboard at `/admin`
- Manage users, view platform statistics, and configure settings
- Use all admin-only features

### Technical Note

I'll also investigate why the `handle_new_user()` trigger didn't fire and fix it if needed, so future signups work correctly.

