## Update Hero Section Text and Social Proof

### Changes to `src/pages/Landing.tsx`

**1. Update hero heading** (lines 353-355)

- Change "Fill healthcare roles" to "Fill healthcare roles"
- Change "3x faster" to "5x faster"

**2. Update hero subtitle** (lines 363-364)

- Replace current text with: "MediLead identifies qualified candidates, verifies credentials, and enables personalised outreach based on the open role."

**3. Replace social proof text** (lines 394-401)

- Remove the plain text "Join healthcare recruiters filling roles 3x faster"
- Replace with an avatar stack (overlapping circular profile photos) followed by "Join 1,000+ recruiters and agencies"
- Use 4-5 small overlapping avatar circles with real-looking placeholder images (from UI Faces or similar free avatar URLs)
- Style: overlapping circles with white borders, followed by bold text

### Visual Design for Avatar Stack

```text
[img1][img2][img3][img4][img5]  Join 1,000+ recruiters and agencies
 ^--- overlapping circular avatars with white ring borders
```

- Each avatar: 32x32px, rounded-full, border-2 border-white, -ml-2 overlap
- Use `randomuser.me` or `i.pravatar.cc` URLs for realistic profile photos
- Text styled slightly bolder than current muted text  
  
4. Add the medilead logo to the landingpage

### Technical Details

- File modified: `src/pages/Landing.tsx`
- No new dependencies needed
- Avatar images sourced from `i.pravatar.cc` (free, no API key needed)
- Also update the stats section "3x" reference to "5x" for consistency (line 420)