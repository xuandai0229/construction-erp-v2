# QA Report: Supervision Weekly Inline Preview & Quantity Flow Finalization

## 1. Overview
The Supervision Weekly module's editor has been significantly upgraded to resolve long-standing UX issues with quantity inputs, variance calculation, layout consistency, row manipulation, and preview/print flows.

## 2. Issues Addressed & Solutions Implemented

### 2.1 Smart Quantity Input & Variance Automation
- **Problem**: Users were forced to redundantly declare variance states ("Có chênh lệch" / "Khớp báo cáo") and manually select identical units for verified quantities.
- **Solution**: 
  - The explicit "verification mode" combobox was entirely removed from `TransitionTable` and `QuantityTable`.
  - `SmartQuantityInput` was upgraded with a `readOnlyUnit` mode. The "Khối lượng kiểm tra" (verified quantity) field now automatically inherits its unit from the "Khối lượng báo cáo" (reported quantity) and displays it cleanly as a suffix without a secondary combobox.
  - Variance is now inferred dynamically (`reported = checked -> MATCH`, `reported != checked -> DIFFERENT`, `checked is null -> Unchecked`).
  - Variance cell formatting was upgraded to explicitly display percentages and detailed absolute differences (e.g., "Thiếu 11 m² (-0.88%)", "Vượt 5 m³ (+4.17%)", "Khớp báo cáo 0 m² (0%)"). The "Reason" textarea now only appears if there is an actual non-zero variance.
  - Zero-value reported quantities with non-zero verified quantities no longer crash or display `Infinity%`; they cleanly render `—` for the percentage.

### 2.2 Layout & Action Menu Overhaul
- **Problem**: Overflowing inputs broke table layouts on many viewports, and the `RowActionMenu` occupied excessive space while occasionally clipping out of view.
- **Solution**:
  - `table-fixed` layout guarantees were strictly applied across all tables (Mục II, III, IV), preventing dynamic width expansion.
  - `RowActionMenu` was converted to a floating 36x36px ghost button with a compact 160px popover width. Confirmation steps for immediate destructive actions were stripped to maximize speed, and positioning bounding logic guarantees the menu never overflows the viewport.

### 2.3 Source Formatting (Công trình / Hạng mục)
- **Problem**: Disconnected strings and legacy fallback strings created a cluttered view in the collapsed editor state and printed PDFs.
- **Solution**:
  - Developed a standardized `formatSupervisionSourceLines` utility.
  - Editor row summary (`!editable`) now renders distinct `Công trình:` and `Hạng mục:` lines.
  - In printed documents, sources dynamically adapt. If there's no explicitly defined project (legacy fallback), the string elegantly degrades to avoid printing "Công trình: ...".

### 2.4 In-Editor Full-Screen Preview & Print Isolation
- **Problem**: Preview navigation diverted the user from the editor, destroyed local state, and forcibly concatenated "RESULT" and "NEXT_WEEK_PLAN" into a single unmanageable document.
- **Solution**:
  - Implemented an overlay-based `PreviewDialog` triggered directly from the editor.
  - Before launching the dialog, the editor deterministically flushes all debounced updates and resolves its save cycle (`persistOnce`), capturing the exact `lockVersion`.
  - `WeeklyPrintTemplate` was upgraded to ingest an `activeDocument` parameter. It cleanly isolates the preview and `window.print()` scope to the specific active tab, generating separate PDFs for "Báo cáo kết quả tuần" and "Kế hoạch tuần tiếp theo".
  - Scroll state and workflow context are completely preserved underneath the overlay.

## 3. QA Sign-Off
- **UI Overflow**: Resolved. All tables use fixed-width geometries and flex scaling.
- **Unit Sync**: Verified. Changing the reported unit seamlessly propagates the label suffix to the verified column.
- **Variance Logic**: Verified. Displays match/missing/surplus correctly with accurate percentage sign math and edge-case rendering (0 denominator).
- **Print Formatting**: Verified. `window.print()` triggers isolated, paginated rendering free of editor shell components.

The Supervision Weekly module's data-entry UX is now fully stabilized and production-ready.
