

## Fix Landing Page Issues

### 1. Make the Logo Smaller
Reduce the navbar logo from `h-8` to `h-6` (line 251 in Landing.tsx).

### 2. Fix Statistics Section
The screenshot shows three problems with the stats bar:

- **Inconsistent visual size**: The stat values ("25%", "5x", "13hrs", "95%+") vary in character count, making them look uneven. Fix by ensuring each stat card has a uniform minimum height and consistent layout.
- **Not vertically centered**: The text inside each stat item is not properly centered. Add `items-center` and `justify-center` with consistent height to each stat cell.
- **All grey, needs color**: The stats section background is a plain grey (`bg-gradient-to-b from-muted/30 to-muted/50`). Replace with a white card-based design where each stat sits in its own card with a subtle colored accent or give the section a white background with colored stat values (which already exist via the gradient text).

### Technical Details

**File: `src/pages/Landing.tsx`**

- **Line 251**: Change `h-8` to `h-6` on the logo `<img>` tag.
- **Lines 87-103 (StatItem component)**: Add a white card wrapper with rounded corners, padding, a subtle top border accent using the primary-to-cyan gradient, and ensure all items have equal height via `min-h` and flex centering.
- **Line 416**: Change the section background from grey muted tones to a cleaner look -- use `bg-white` or a light blue-tinted gradient (`bg-gradient-to-b from-blue-50/50 to-white`) to add warmth and differentiate from other sections.
- **Line 423**: Add `items-stretch` to the grid so all stat cards are equal height.

