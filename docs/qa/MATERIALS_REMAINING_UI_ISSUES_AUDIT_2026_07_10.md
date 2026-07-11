# Materials Remaining UI Issues Audit - 2026-07-10

## Scope

This audit covers only the Materials transaction tab, the material request creation form, the shared enterprise combobox used by those surfaces, and the MaterialRequestItem persistence path.

No code was changed before this audit.

## A. User Image: Nhap/Xuat Tab

Observed from the user's described screenshot and current code:

- The Nhap/Xuat tab still renders six KPI cards: Tong giao dich, Tong nhap, Tong xuat, Xuat hom nay, Xuat nhieu nhat, Canh bao.
- Those cards sit between the header and filter/table, so they push the actual transaction table below the first viewport.
- The table is wrapped by `MaterialDataTable`, which currently applies `max-h-[min(640px,calc(100vh-260px))]`. That creates an internal scroll container.
- The count `18 giao dich` is computed from `filteredTransactions.length`, and the table also maps `filteredTransactions`, so the data count is not sliced. The UX problem is visual: users see a count of 18 but only a partial internal viewport of rows.
- The current text `Bang render du du lieu trong vung cuon noi bo` explains the implementation but does not fix the user perception.

Conclusion: remove transaction KPI cards entirely and use natural page scroll for the desktop table, with a small non-card summary line.

## B. User Image: Tao De Xuat Form

Observed from the user's described screenshot and current code:

- `EnterpriseCombobox` was made creatable for material and work selection. That mixes two different tasks in one dropdown: selecting existing master data and typing free text.
- When a custom material or work is selected, badges are rendered under individual cells. This increases row height and breaks the clean desktop grid rhythm.
- Unit, quantity, and work cells can become vertically misaligned because helper/badge content appears inside only some columns.
- The material and work cells need explicit modes instead of a creatable option inside the dropdown:
  - Material: `Danh muc` versus `Ngoai danh muc`
  - Work: `Chon cong viec` versus `Mo ta tu do`
- Row-level errors should appear under the whole row, not under individual cells, to avoid uneven column heights.

Conclusion: replace creatable combobox usage in the request form with explicit mode controls and stable-height controls.

## C. Combobox Audit

Current `EnterpriseCombobox` already uses `createPortal` and fixed positioning. Remaining risks:

- The desktop panel height uses available space, but the mobile sheet height calculation can exceed desired compact behavior if the trigger is near the footer.
- The form currently uses custom-create options in the dropdown, which makes the popover feel like it is doing too much.
- The component should remain portal/fixed for all Materials comboboxes, but the request form should no longer rely on creatable options.

Conclusion: keep portal/fixed combobox, tighten max-height behavior, and remove creatable usage from the request form.

## D. Materials UI Shared Components

Current `materials-ui.tsx` includes `MaterialKpiRibbon` and `MaterialDataTable`.

- `MaterialKpiRibbon` is still useful for request KPI cards, but must not be used by the Nhap/Xuat tab.
- `MaterialDataTable` currently hardcodes internal max-height, causing the transaction-table perception issue.

Conclusion: make `MaterialDataTable` support natural height by default, or override it for transactions so the page scrolls naturally.

## E. MaterialRequestItem Persistence Audit

Schema fields on `MaterialRequestItem`:

- `materialCode String?`
- `materialName String`
- `unit String`
- `wbsItemId String?`
- `fieldProgressItemId String?`
- `workItemNameSnapshot String?`
- `note String?`

Actions:

- `createMaterialRequest` persists `materialCode`, `materialName`, `unit`, `wbsItemId`, `fieldProgressItemId`, `workItemNameSnapshot`, and `note`.
- `updateMaterialRequest` persists the same fields.
- There is no `materialItemId` on `MaterialRequestItem`; request lines are snapshot-based.
- Current update behavior deletes and recreates request items. This is existing tech debt because it can change item IDs. It should not be rewritten in this UI fix without broader tests.

Conclusion: custom material and custom work can be stored safely as snapshots. No master MaterialItem or WBS item should be created silently.

## Phase 0 Decision

Proceed with a narrow UI fix:

- Remove all transaction KPI cards.
- Use a compact header, filter bar, and summary line.
- Let the transaction table page-scroll naturally.
- Rework request lines into explicit material/work modes.
- Keep combobox portal/fixed positioning but avoid creatable combobox inside request rows.
