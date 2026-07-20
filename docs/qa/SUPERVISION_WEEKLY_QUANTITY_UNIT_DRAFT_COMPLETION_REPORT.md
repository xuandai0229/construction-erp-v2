# QA Report: Supervision Weekly Module Optimization

## Objective
Finalize the Supervision Weekly report module by replacing native UI elements with custom components, standardizing input mechanisms for quantities, fixing layout overlaps, and ensuring comprehensive data persistence including edge cases in draft states.

## Changes Implemented

### 1. Unified Combobox Integration (Sections II, III, IV)
- **Problem**: Native `<select>` elements suffered from inconsistent styling, black background rendering issues, and OS-specific rendering behaviors that disrupted the light-themed design language.
- **Solution**: All occurrences of native `<select>` for unit choices in `QuantityTable` and progress statuses/delay units in `ProgressTable` have been replaced with the system's `EnterpriseCombobox` primitive (`SupervisionUnitCombobox`). 
- **Result**: Consistent styling, accessible keyboard navigation, and proper popover positioning without affecting the table grid structure.

### 2. Smart Quantity Input (`SmartQuantityInput`)
- **Problem**: The old `QuantityInput` logic was visually cluttered with redundant helper texts ("Nhập nội dung thay cho số") and suffered from poor spatial layout.
- **Solution**: Rebuilt as `SmartQuantityInput`. Integrated the `SupervisionUnitCombobox` natively. Replaced the helper text toggle with a sleek `RowActionMenu`-style trigger (using `MoreHorizontal`) to switch between Numeric and Text entry modes. Added explicit unit tests to ensure Vietnamese layout (`,` for decimals, `.` for thousands) and English layout are parsed accurately based on `quantity.ts` heuristics.

### 3. Row Action Ergonomics & Dedicated Action Column
- **Problem**: Row manipulation actions (Up/Down/Duplicate/Delete) were inline with text, causing extreme layout shifting and text overflow in the "STT" or "Công trình" columns.
- **Solution**: Established a dedicated `44px` right-most Action column in `TransitionTable`, `QuantityTable`, and `ProgressTable`. Inserted the `RowActionMenu` (vertical ellipsis) component, appearing on `group-hover` or `focus-within` for a cleaner default appearance.

### 4. Layout Stabilization & Overflow Prevention
- **Problem**: Long source strings caused horizontal scrolling and ruined table layouts.
- **Solution**: Enforced `table-layout: fixed` across all section tables. Applied `min-w-0` to flex children and `[overflow-wrap:anywhere]` to `AutoTextarea` to ensure content wraps gracefully within assigned column boundaries.

### 5. Data Persistence & Draft Recovery Integrity
- **Problem**: When a user quickly added an empty/partial row, the UI assigned a client-side `temp-xxx` UUID. When the "Lưu bản nháp" workflow persisted this to the backend, it leaked the `temp-xxx` ID into the Prisma `createMany` payload. Since the backend did not re-sync the IDs to the client upon saving, subsequent saves caused conflicts or failed silently because the backend treated it as an invalid/conflicting key or replaced it without telling the UI.
- **Solution**: Updated `actions.ts` to actively sanitize the `id` payload: `entry.id?.startsWith("temp-") ? undefined : entry.id`. This ensures Prisma generates a valid `cuid` and guarantees that repeated draft saves of incomplete rows function correctly and do not disrupt the application lifecycle.

## Testing Verification
1. **Quantity Parsing**: 10/10 Vitest cases passed for `quantity.test.ts`. Ensured robust fallback and variance calculation regardless of whether `120,5` or `120.5` is provided.
2. **Build Integrity**: `npx tsc --noEmit` and `npm run build` completed successfully with 0 type regressions.
3. **Draft Workflows**: Verified that users can save a completely empty row or partially empty row (e.g., Progress without `delayValue`) securely.
4. **Preview Sync**: Reloading or requesting a Preview correctly flushes `persistOnce` prior to launching the Preview window, maintaining full consistency.

**Status**: ALL CHECKS PASSED. SYSTEM OPTIMIZATION COMPLETE.
