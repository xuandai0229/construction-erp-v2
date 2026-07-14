# Defect Manifest: Mobile UI/UX Issues

## 1. App Shell & Navigation
- Header size is too large on mobile, consuming too much vertical space.
- Notification bell and project switcher icons are too close, causing touch target conflicts.
- Navigation sidebar doesn't transition into a proper mobile drawer, leading to overflow or hidden functionality.
- Project selector takes up the full width instead of being contained.

## 2. Global Styling & Layout
- Overuse of `p-6`, `p-8` which causes extreme padding on small devices (320px-430px).
- Excessive usage of cards nested within cards leading to thick borders and wasted whitespace.
- Fonts are sized for desktop (e.g., `text-3xl`, `text-4xl`), breaking layout and forcing horizontal scroll.
- Dialogs and bottom sheets overflow or don't respect the safe area.

## 3. Data Tables & Lists
- Desktop tables are forced into horizontal scroll on mobile, making data hard to read and interact with.
- Row actions require scrolling all the way to the right instead of a neat context menu on mobile.
- Filters and toolbars stack vertically, taking up 3-4 lines before showing any actual data.

## 4. Empty & Error States
- Empty states take up 50-70% of the screen height.
- Error states show raw text/stack trace instead of a clean, actionable UI.

## 5. Specific Modules
- **Dashboard**: KPIs render in a 1-column layout, making the page too long.
- **Projects**: Project lists show too much metadata.
- **Field Progress**: Calendar selection is hard to use on mobile; inputs are cramped.
- **Documents**: Folder tree is hidden or breaks layout; file cards are not compact enough.
