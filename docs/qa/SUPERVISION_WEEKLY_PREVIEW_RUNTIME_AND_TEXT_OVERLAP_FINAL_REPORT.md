# QA Report: Supervision Weekly Preview Runtime & Text Overlap Finalization

## 1. Overview
This report addresses a critical data contract mismatch (`Runtime TypeError: Cannot read properties of undefined (reading 'name')`) and various UI layout overlapping issues within the Supervision Weekly module. The fix ensures a robust, type-safe data flow for printing and previews while polishing the inline component layouts.

## 2. Issues Addressed & Solutions Implemented

### 2.1 Preview/Print Runtime Crash (`createdBy` missing)
- **Problem**: The `PreviewDialog` historically passed the volatile `WeeklyEditorDossier` state directly into `WeeklyPrintTemplate`, which lacked the fully expanded `createdBy` relation, leading to a crash when rendering the signature section.
- **Solution**: 
  - Introduced a strictly defined, print-specific data transfer object (`SupervisionWeeklyPrintDto`) in `src/lib/supervision-weekly/print-types.ts`.
  - Implemented `getSupervisionWeeklyPrintData(id)` in the server actions layer to execute a canonical database fetch with guaranteed `createdBy` null-safety.
  - Implemented graceful fallback mapping for `creatorName` in legacy records (falling back from `createdBy.name` to `revisions.actor.name` to `"——"`).
  - Redesigned `PreviewDialog` to feature internal state management (`loading`, `ready`, `error`). The dialog now explicitly invokes the server action to fetch canonical data *after* `flushSave()` guarantees all changes have been persisted successfully.

### 2.2 Text Overlap in `SmartQuantityInput`
- **Problem**: The "Nhập khối lượng..." placeholder and the "Chưa có đơn vị" suffix were stacked on top of each other using `absolute` positioning, causing severe text overlaps on smaller viewports.
- **Solution**: 
  - Eradicated the absolute positioning mechanism for the static suffix.
  - Refactored `SmartQuantityInput` to utilize a deterministic CSS Grid layout (`grid-cols-[minmax(0,1fr)_auto]` and `grid-cols-[minmax(0,1fr)_84px]`). This enforces a physical separation between the input box and the suffix/combobox element, ensuring no overlap can occur regardless of viewport width.

### 2.3 System-Wide Layout and Heights Standardization
- **Problem**: Various controls (textareas, comboboxes, inputs) had differing heights, causing misalignment in the tables.
- **Solution**: 
  - Upgraded `AutoTextarea` to default to `min-h-[72px]` while preserving backwards compatibility for inline single-row overrides (`min-h-10`).
  - Standardized control heights within `ProgressTable` to ensure they strictly align with the `40px` (`h-10`) minimum single-line control specification, replacing anomalous `h-8` heights.
  - Validated that `RowActionMenu` employs `createPortal` and safe viewport bounding to avoid clipping.

## 3. Pre-flight Checks & Test Results
- **Missing Creator Null-Safety Test**: PASS. Fallback mechanisms correctly intercept and render missing `createdBy` relations as `"——"` without crashing.
- **DTO Canonical Fetching**: PASS. Previews now rely exclusively on `SupervisionWeeklyPrintDto` after a successful `flushSave()`, guaranteeing consistency.
- **Quantity Text Overlap**: PASS. Grid implementations guarantee structural text separation.
- **Layout Overflow**: PASS. `table-fixed` and `min-w-0` prevent viewport horizontal scrolling.
- **Independent Document Printing**: PASS. RESULT and NEXT_WEEK_PLAN render entirely in isolation via their dedicated tabs.
- **Build & Compilation**: PASS. All strict TypeScript definitions (`--noEmit`) have passed without compilation errors.
