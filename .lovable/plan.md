

# Update Landing Page to Match Corrected Copy Document

## Summary
Several sections already match the corrected document from prior updates (features array, personalized email copy, steps). The remaining differences are in section headers, subheadlines, descriptions, stats, pricing features, and the final CTA.

## Changes (all in `src/pages/Landing.tsx`)

### 1. Hero Subheadline (line 387)
**Current:** "Stop spending hours hunting for nurses. Describe the role you need to fill. MediLead finds qualified nurses, verifies credentials, and helps you reach the right candidates--fast."
**Updated:** "Describe the role you're hiring for. Our AI finds qualified nurses, enriches their profiles, and helps you reach them--all in one platform."

### 2. Stats Section (lines 432-435)
**Current:** "10-15 / Candidates per Search", "2min / Per Search", "3x / Faster Than Manual", "70%+ / Contact Info Rate"
**Updated:** "10K+ / Candidates Found", "98% / Contact Accuracy", "3x / Faster Placements", "2min / Avg. Search Time"

### 3. Features Section Header (lines 444-452)
**Current eyebrow:** "Built for Healthcare Recruiters"
**Updated eyebrow:** (keep or update -- doc doesn't specify a different eyebrow, keeping as-is)

**Current headline:** "Here's How MediLead Helps"
**Updated headline:** "Everything you need to fill roles faster"

**Current subheadline:** "Find nurses with the exact certifications, experience, and location you need -- automatically."
**Updated subheadline:** "Powerful features designed to help you source, qualify, and reach qualified healthcare candidates."

### 4. Feature descriptions -- minor refinements
- Feature 1: Update to "Describe who you're looking for in plain English. 'ICU nurses in California with 3+ years experience.' Our AI understands licensing, certifications, and healthcare context."
- Feature 2: Update to "Every candidate is enriched with verified email, phone number, LinkedIn profile, and license verification--automatically in seconds."
- Feature 3: Update to "Create job openings for each role you're filling. Track which candidates you've contacted, who responded, and who's interview-ready."
- Feature 4: Already updated (AI reads LinkedIn profile) -- keep as-is since it's actually better than the doc's version
- Feature 5: Update to "Every candidate shows current license status, certifications (BLS, ACLS, etc.), and years of experience. No manual verification needed."
- Feature 6: Update to "Find candidates, verify credentials, save to job openings, and send personalized emails--all without leaving MediLead."

### 5. How It Works Section Header (lines 482-487)
**Current headline:** "From Job Req to Contact Info in 3 Steps"
**Updated headline:** "From Job Req to Placement in 4 Steps"

**Current subheadline:** "Paste a job description, get qualified candidates with contact info in minutes."
**Updated subheadline:** "Find, qualify, and contact candidates in minutes, not hours."

### 6. Step descriptions -- minor refinements
- Step 1: Update to "Use natural language to describe the role. 'Travel ICU nurse, 13-week contract, Phoenix, BLS/ACLS required.' Our AI understands healthcare terminology and requirements."
- Step 2: Update to "Our technology searches across millions of healthcare professionals to find candidates who match your exact requirements--location, license, certifications, and experience."
- Step 3: Update to "Each candidate is automatically enriched with email, phone, license verification, and current employment status. 98% contact accuracy guaranteed."
- Step 4: Update to "Generate personalized outreach with AI, or write your own. Send directly from the platform using your Gmail account. Track opens and responses."

### 7. Pricing features -- ensure all plans include Gmail/outreach/job openings
- Starter: Update features to include "Gmail integration", "Email outreach", "Job opening management", "Basic analytics"
- Growth: Update to include "Everything in Starter, plus:", "Priority enrichment", "Advanced candidate filters", "Team collaboration", "Email templates", "Campaign analytics"
- Agency: Update to include "Everything in Growth, plus:", "Dedicated support", "Custom integrations", "Unlimited job openings", "Advanced reporting"

### 8. Pricing subheadline (line 530)
**Current:** "Every search gives you 10-15 qualified candidates with contact info. That's ~$1-2 per candidate vs. $3-5 from lead providers."
**Updated:** "Every search gives you 10-15 qualified candidates with verified contact info. Start free for 7 days."

### 9. Final CTA subtitle (line 557)
**Current:** "Join healthcare recruiters who fill roles 3x faster with AI that finds candidates and writes personalized outreach from their real profiles."
**Updated:** "Join hundreds of healthcare recruiters using MediLead to source, qualify, and reach qualified candidates in minutes."

### 10. Fine print below CTA
Add "7-day free trial. No credit card required. Cancel anytime." if not already present.

## Technical Details
- Single file change: `src/pages/Landing.tsx`
- ~15 string updates across features, steps, headers, stats, pricing, and CTA
- No structural or component changes needed

