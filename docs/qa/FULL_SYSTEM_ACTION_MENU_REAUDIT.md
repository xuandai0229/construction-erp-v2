# FULL SYSTEM ACTION MENU RE-AUDIT

## Verdict

`PARTIAL / FAIL` — static evidence is available, but runtime coverage is not sufficient for PASS. No source was changed during this audit.

## Verified counts

| Hạng mục | Số lượng |
|---|---:|
| Static record-action locations (audit ledger counting rule) | 33 |
| Production files containing `UnifiedActionMenu` | 16 (15 consumers/wrappers + shared component) |
| Concrete `<UnifiedActionMenu>` instances in production | 17 |
| Custom menu/popover candidate files requiring inspection | 28 |
| Inline/action-group candidate locations | 19 |
| Pointer missing verified at runtime | 0 (not tested) |
| Pointer wrong verified at runtime | 0 (not tested) |
| Duplicate action UIs verified at runtime | 0 (not tested) |

Static counts are not runtime PASS counts. The 33-location count excludes primary toolbar buttons and counts each distinct record list/card/detail action surface once.

## UnifiedActionMenu consumers and wrappers

| Component | Route/surface inferred from imports | Instances | Wrapper/branch notes | Runtime |
|---|---|---:|---|---|
| `users/user-management-client.tsx` | `/users` | 1 | controlled `openActionMenuId`, RBAC action list | UNVERIFIED |
| `materials/material-proposal-list.tsx` | `/materials?tab=requests` | 1 | proposal row menu | UNVERIFIED |
| `materials/materials-ui.tsx` | materials catalog/stock/transactions | 1 | shared material row action surface | UNVERIFIED |
| `projects/project-list-client.tsx` | `/projects` | 1 | project row menu | UNVERIFIED |
| `reports/reports-table.tsx` | `/reports` | 1 | report row menu | UNVERIFIED |
| `hr/employee-data-table.tsx` | `/hr/employees` | 1 | employee row menu | UNVERIFIED |
| `hr/position-management-client.tsx` | `/hr/organization?tab=positions` | 1 | position wrapper | UNVERIFIED |
| `hr/unit-manager-management-client.tsx` | organization managers | 1 | manager row wrapper | UNVERIFIED |
| `hr/project-assignments/project-assignment-table.tsx` | `/hr/project-assignments` | 1 | assignment row menu | UNVERIFIED |
| `supervision-weekly/weekly-list-client.tsx` | `/supervision/weekly` | 2 | desktop/list branches, active row state source | UNVERIFIED |
| `supervision-weekly/row-action-menu.tsx` | weekly editor tables | 1 | wrapper; custom `MoreVertical` trigger | UNVERIFIED |
| `safety/safety-row-action-menu.tsx` | safety plan/assessment list | 1 | wrapper; custom trigger | UNVERIFIED |
| `safety/safety-row-action-portal-menu.tsx` | safety portal list | 1 | wrapper; portal-specific consumer | UNVERIFIED |
| `safety/safety-weekly-file-workspace.tsx` | weekly file detail | 2 | plan/assessment header/menu surfaces | UNVERIFIED |
| `layout/header.tsx` | global header | 1 | not record-level; excluded from 33 ledger | UNVERIFIED |

Props inspected statically include `showPointer`/defaults, `open`, `onOpenChange`, `align`, `width`, `contextHeader`, and custom triggers. Runtime DOM/visibility/geometry gates were not executable.

## Custom menu candidates

Static candidate set: 28 files. Important record/action candidates include `documents/document-context-menu.tsx`, `documents/document-workspace.tsx`, `materials/materials-catalog.tsx`, `materials/materials-stock-table.tsx`, `materials/materials-transactions.tsx`, `projects/[id]/page.tsx`, `reports` drawers/mobile cards, `supervision-weekly/result-data-tables.tsx`, `result-schedule-table.tsx`, and `smart-quantity-input.tsx`. Some candidates are non-record popovers, tab controls, input toggles, or primary workflow controls and require runtime/line-level classification.

## Inline actions and duplicate risk

19 source locations contain inline icon/button or handler patterns that require record-level classification. The source includes document actions, project-detail actions, dashboard/action-center cards, material catalog/stock/transaction actions, report mobile/table actions, safety workflow actions, and supervision table actions. Because the protected UI could not be opened, no item is promoted to verified duplicate or verified clean.

## Pointer and active-row audit

The shared component statically contains pointer support and portal-positioning logic. Static presence does not satisfy the three gates: DOM exists, visible, and target-correct. No trigger/menu/pointer rectangles were captured. First/middle/last row, window scroll, internal table scroll, horizontal scroll, clipping, z-index, outside click, Escape, and row X/Y switching are all `UNVERIFIED`.

## Labels and exceptions

Primary actions such as Tạo/Thêm/Lưu/Gửi/Duyệt/Tìm kiếm/Bộ lọc are excluded from record-secondary action findings. Source discovery found Vietnamese labels in audited components, but no complete runtime language audit was possible; any user-facing English labels remain `UNVERIFIED`.

