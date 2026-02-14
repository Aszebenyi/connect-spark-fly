

## Restore Landing Page Styling

The dashboard redesign accidentally removed the `gradient-text` CSS class from `index.css`. This class is used throughout the landing page (and explainer page) for key visual elements like the "3x faster" hero text and stat values. Without it, those elements render as plain dark text, making the page look flat and broken.

### What happened
The previous `index.css` update removed landing-page-specific CSS classes while simplifying the dashboard styles. The `gradient-text` class (which applies a blue gradient to text) was deleted.

### Fix
Add back the `gradient-text` class to `index.css`. This is a single CSS addition that restores the landing page to its original appearance without affecting the clean dashboard design.

---

### Technical Details

**File: `src/index.css`**

Add the following CSS class back into the `@layer utilities` section:

```css
.gradient-text {
  background: linear-gradient(135deg, hsl(210 80% 50%), hsl(210 80% 65%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

This is used by:
- `Landing.tsx`: Hero "3x faster" text, stats values, CTA heading
- `Explainer.tsx`: Multiple headings and stat displays

No other files need changes. The dashboard components do not use this class, so there is no conflict.

