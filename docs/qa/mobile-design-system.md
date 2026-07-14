# Mobile Design System
This document outlines the standard UI/UX specifications for mobile viewports across the `construction-erp-v2` application.

## 1. Typography
Do NOT use `text-3xl` or `text-4xl` directly on mobile except in special cases.
- **Page title:** 20–22px (`text-xl font-bold`)
- **Section title lớn:** 17–18px (`text-[17px] font-bold`)
- **Section title nhỏ:** 14–16px (`text-base font-semibold`)
- **Card/item title:** 13–14px (`text-[13px] font-medium` or `text-sm font-medium`)
- **Body:** 13–14px (`text-[13px]` or `text-sm`)
- **Metadata/Subtext:** 11–12px (`text-[11px]` or `text-xs`)
- **Badge:** 10–11px (`text-[10px]` or `text-[11px] px-1.5 py-0.5 rounded-full`)
- **Button Text:** 13–14px (`text-[13px] font-medium` or `text-sm font-medium`)

## 2. Spacing & Layout
- **Page padding (X):** 12px on mobile (`p-3`), expanding to 20-24px on tablet/desktop (`sm:p-5 md:p-6`)
- **Section gap:** 12–16px (`gap-3` or `gap-4`)
- **Item gap:** 6–8px (`gap-1.5` or `gap-2`)
- **Card padding:** 10–12px (`p-2.5` or `p-3`)
- **Toolbar gap:** 6–8px
- **Form gap:** 10–12px (`gap-2.5` or `gap-3`)
- **Button height:** 40–44px (`h-10` or `h-11`)
- **Touch target (Icon Button):** Visual can be smaller, but touch target should be 40x40 (`h-10 w-10 sm:h-9 sm:w-9`)

## 3. Card Usage
- Use lists instead of cards when possible.
- DO NOT nest cards inside cards.
- Reduce heavy shadows (`shadow-sm` instead of `shadow-md`).
- Ensure borders are subtle (`border-slate-100` or `border-slate-200/60`).
- No internal paddings of 24-32px on mobile (`p-6` -> `p-3 sm:p-4`).

## 4. Action Hierarchy
- **Primary action:** One clear primary button per view.
- **Secondary actions:** Use icons or group into a `MoreVertical` (3-dot) context menu.
- **Row actions:** Always group in context menus instead of horizontally stacking 3-4 buttons.
- No sticky footers with multiple stacked full-width buttons unless strictly necessary.

## 5. Viewport Metrics Rules
- Ensure `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Remove horizontal tables (convert to list-cards on mobile).
- No `w-screen` inside layout containers, use `min-w-0 max-w-full`.

## 6. App Shell
- **Header height:** 52-56px (`h-[52px] sm:h-[56px] lg:h-16`).
- **Sidebar Drawer:** Full height drawer, dark premium theme (`sidebar.module.css`), easy to tap items (`min-h-10`).
- User profile in header hides name on mobile, only shows avatar.
