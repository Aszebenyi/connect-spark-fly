

## International Healthcare Recruiting for MediLead

### Overview
Add multi-country support (US, UK, Canada, Australia, UAE) with country-specific credentials, currency, terminology, and recruiter profile settings.

### Phase Breakdown

This is a large feature set. The implementation will be structured across 4 phases within a single pass:

1. Database schema changes
2. Country configuration library
3. Settings page "International" tab + profile fields
4. Campaign creation country-aware fields
5. Onboarding checklist country step
6. Lead table credential display
7. Email generation country context

---

### Phase 1: Database Migrations

Add new columns to 3 tables:

**profiles table:**
- `base_country` (VARCHAR(2), default 'US')
- `recruit_countries` (TEXT[], default ARRAY['US'])
- `international_recruiting` (BOOLEAN, default false)
- `currency` (VARCHAR(3), default 'USD')
- `date_format` (VARCHAR(20), default 'MM/DD/YYYY')

**campaigns table:**
- `job_country` (VARCHAR(2), default 'US')
- `salary_min` (DECIMAL)
- `salary_max` (DECIMAL)
- `salary_currency` (VARCHAR(3), default 'USD')
- `visa_sponsorship` (BOOLEAN, default false)
- `required_credentials` (JSONB, default '[]')

**leads table:**
- `nationality` (VARCHAR(2))
- `credentials` (JSONB, default '[]')
- `languages` (TEXT[], default ARRAY['English'])
- `willing_to_relocate` (BOOLEAN, default false)
- `target_countries` (TEXT[], default ARRAY[]::TEXT[])

All columns are nullable or have defaults so existing data is unaffected.

---

### Phase 2: Country Configuration Library

**New file: `src/lib/countries.ts`**

Contains the `COUNTRIES` constant with configuration for US, GB, CA, AU, AE including:
- Currency codes/symbols
- Date formats
- Regulatory body labels and examples
- Country-specific terminology (ER vs A&E, ICU vs ITU, OR vs Theatre)
- Country-specific subdivisions (US states, CA provinces, GB NHS bands, AE emirates)
- Helper functions: `getCurrencySymbol()`, `getLicenseLabel()`

---

### Phase 3: Settings Page - International Tab

**Modified file: `src/components/SettingsPage.tsx`**

Add "International" as a new tab alongside Account, Billing, Integrations, Company Profile.

The tab will include:
- Base country selector (dropdown with flags)
- Multi-select checkboxes for recruitment countries
- International candidate sourcing toggle
- Currency and date format display preferences
- Save button that updates the `profiles` table

---

### Phase 4: Campaign Creation - Country Fields

**Modified file: `src/components/CreateCampaignDialog.tsx`**

After the existing "Goal" step and before "Search", or integrated into the existing steps:
- Job location country selector (filtered to user's `recruit_countries`)
- Country-specific fields that appear conditionally:
  - US: State dropdown
  - GB: NHS Band dropdown
  - CA: Province dropdown
  - AE: Emirate dropdown
- Salary range inputs with auto-currency symbol
- Visa sponsorship toggle (shown for AE, AU, GB)
- Required credentials label showing country-appropriate license type

The campaign is saved with `job_country`, `salary_min`, `salary_max`, `salary_currency`, `visa_sponsorship`, and `required_credentials`.

---

### Phase 5: Onboarding Checklist - Country Step

**Modified file: `src/components/OnboardingChecklist.tsx`**

Add "Select your country" as the new **Step 0** (before Connect Gmail). Shows 5 clickable country cards with flags. On selection:
- Saves `base_country` to profiles
- Optionally asks about recruiting for other countries
- Marked complete when `base_country` is set

Renumber existing steps to 1-5.

**Modified file: `src/hooks/useOnboardingProgress.ts`**

Add `hasCountrySet` boolean check (profiles.base_country is not null/default). Update `totalSteps` to 6.

---

### Phase 6: Lead Table - Credential Display

**Modified file: `src/components/LeadTable.tsx`**

- Show country flag next to location
- Display credentials from the `credentials` JSONB field (license type, country flag, number)
- Truncate to 2 credentials with "+N more" overflow

---

### Phase 7: Email Generation - Country Context

**Modified file: `supabase/functions/generate-outreach/index.ts`**

Pass country-specific context to the AI prompt:
- Use correct terminology based on `campaign.job_country` (ER vs A&E, ICU vs ITU)
- Include salary range with correct currency symbol
- Mention visa sponsorship if applicable
- Reference country-appropriate credential requirements

---

### Files Changed Summary

| File | Action |
|---|---|
| Database migration | New columns on profiles, campaigns, leads |
| `src/lib/countries.ts` | **New** - Country config and helpers |
| `src/components/SettingsPage.tsx` | Add International tab |
| `src/components/CreateCampaignDialog.tsx` | Add country-specific fields |
| `src/components/OnboardingChecklist.tsx` | Add country selection step |
| `src/hooks/useOnboardingProgress.ts` | Add country check |
| `src/components/LeadTable.tsx` | Show credentials and flags |
| `supabase/functions/generate-outreach/index.ts` | Country-aware prompts |
| `src/pages/Dashboard.tsx` | Wire up new onboarding prop |

### Risk Considerations

- All new database columns have defaults, so no migration issues with existing data
- The TypeScript types file (`types.ts`) auto-regenerates after migration, so code referencing new columns must wait for that
- Country selection is optional -- US remains the default for existing users
- No breaking changes to existing workflows

