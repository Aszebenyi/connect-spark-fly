

# Three Fixes: Light Mode, Dashboard Cleanup, and Bulk Actions

## 1. Add Light Mode Toggle

The app currently only has a dark theme with no way to switch. We'll add a proper light/dark mode toggle.

**What changes:**
- Add a `ThemeProvider` from `next-themes` (already installed) wrapping the app
- Define light mode CSS variables in `index.css` under `:root` (light) and `.dark` (dark)
- Add a sun/moon toggle button in the Sidebar for switching themes

## 2. Remove "Recent Candidates" from Dashboard

The dashboard currently shows a "Recent Candidates" table preview. This will be removed entirely so the dashboard focuses on stats, quick actions, and job openings only.

## 3. Ensure Bulk Actions Work on Candidates Tab

The floating bulk action bar (Delete, Add to Job Opening, Remove, Export CSV) already exists in the code and is wired up on the main Candidates tab. If it's not appearing, it may be a visibility issue. We'll verify the bar is visible and working when candidates are selected.

The dashboard's mini candidate table (being removed in step 2) didn't have bulk action props -- that may have been the source of confusion.

---

## Technical Details

### Files to modify:

| File | Change |
|------|--------|
| `src/index.css` | Move current dark vars under `.dark` class, add light vars under `:root` |
| `src/App.tsx` | Wrap app with `ThemeProvider` from `next-themes` |
| `src/components/Sidebar.tsx` | Add theme toggle button (sun/moon icon) |
| `src/pages/Dashboard.tsx` | Remove the "Recent Candidates" section (lines 420-434) |

### Light Mode Color Palette:
- Background: white/near-white
- Cards: white with subtle gray borders
- Text: dark gray/black
- Primary: same blue (210, 80%, 50%)
- Muted: light gray tones

### Theme Toggle:
- Placed in the sidebar near the bottom (above user profile area)
- Uses `useTheme()` hook from `next-themes`
- Sun icon for light, Moon icon for dark

