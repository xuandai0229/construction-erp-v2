# WEEKLY INSPECTION DUPLICATE MENU — ROOT CAUSE REPORT

**Date:** 2026-08-11  
**Phase:** B — Full System Runtime Action Menu Re-Audit  
**Status:** FIXED & VERIFIED

---

## 1. Observed Duplicate Menus

When clicking the three-dot trigger on any row at `/reports/weekly-inspection`, TWO menu panels appeared simultaneously:

| Menu | Location | Content |
|------|----------|---------|
| Menu A (GHOST) | Top-left corner (~0,0 coordinates), overlapping sidebar | Hồ sơ BCGS-2026-W32, Tuần 32/2026, Soạn / Sửa hồ sơ, Xem chi tiết, In / PDF, Xóa hồ sơ |
| Menu B (CORRECT) | Anchored near trigger, correct position | Soạn / Sửa hồ sơ, Xem trước HTML, Xem PDF (In sạch), Tải PDF, Tải DOCX, Xóa hồ sơ |

---

## 2. Root Cause

### File: src/components/supervision-weekly/weekly-list-client.tsx

The component renders TWO separate UnifiedActionMenu instances for each record:

1. Desktop branch (line ~838) — inside `div className="hidden sm:block"`
2. Mobile branch (line ~1003) — inside `div className="block sm:hidden"`

Both branches used the SAME controlled state:

```tsx
// BEFORE FIX — single shared state
const [activeActionRowId, setActiveActionRowId] = useState<string | null>(null);

// Desktop menu
<UnifiedActionMenu open={activeActionRowId === row.id} ... />

// Mobile menu  
<UnifiedActionMenu open={activeActionRowId === row.id} ... />
```

### Why both opened simultaneously

When a user clicks the trigger on desktop:
1. `setActiveActionRowId(row.id)` is called
2. The desktop UnifiedActionMenu opens correctly
3. The mobile UnifiedActionMenu ALSO receives `open={true}` because it uses the same state
4. UnifiedActionMenu uses `createPortal(menu, document.body)` — the Portal renders into document.body, ESCAPING the parent's `display:none` from `block sm:hidden`

### Why Menu A appeared at top-left (0,0)

The mobile branch's trigger button is inside display:none container. Its getBoundingClientRect() returns {top: 0, left: 0, width: 0, height: 0}. The updatePosition() function uses this zero-rect, causing the menu to appear at viewport origin.

### Why action labels differed

The two branches had independently hardcoded different action sets:
- Desktop: Xem trước HTML, Xem PDF (In sạch), Tải PDF, Tải DOCX
- Mobile: Xem chi tiết, In / PDF (fewer actions, different labels)

---

## 3. Fix Applied

### File changed: src/components/supervision-weekly/weekly-list-client.tsx

Change 1: Separate state for desktop and mobile

```diff
-  const [activeActionRowId, setActiveActionRowId] = useState<string | null>(null);
+  const [desktopActiveRowId, setDesktopActiveRowId] = useState<string | null>(null);
+  const [mobileActiveRowId, setMobileActiveRowId] = useState<string | null>(null);
+  const activeActionRowId = desktopActiveRowId ?? mobileActiveRowId;
```

Change 2: Desktop menu uses desktopActiveRowId only

Change 3: Mobile menu uses mobileActiveRowId only

Change 4: Unified action labels (mobile harmonized with desktop)

---

## 4. Runtime Verification After Fix

| Check | Result |
|-------|--------|
| Click trigger -> visible menu panels | 1 PASS |
| Ghost menu at top-left | None PASS |
| Active row highlight | Correct PASS |
| Pointer visible and aligned | Yes PASS |
| Menu action set unified | Yes — 6 items PASS |
| Escape closes menu | Yes PASS |
| Outside click closes menu | Yes PASS |
| Console errors | 0 PASS |

---

## 5. Regression Search System-Wide

| Component | Duplicate Risk |
|-----------|---------------|
| weekly-list-client.tsx | PROVEN -> FIXED |
| project-list-client.tsx | NONE |
| user-management-client.tsx | NONE |
| reports-table.tsx | NONE |
| safety-list-client.tsx | NONE |
| materials-ui.tsx | NONE |
| All HR components | NONE |

The root cause pattern (shared controlled state across responsive branches) was unique to weekly-list-client.tsx.

---

## 6. Quality Gates

| Gate | Result |
|------|--------|
| npx tsc --noEmit | PASS (0 errors) |
| Runtime verification | PASS |
