# System text overflow audit

Audit scope: business text must remain readable or have an explicit disclosure. Decorative icons, status pills, technical codes and modal shells may still use bounded overflow when the complete business value is available elsewhere. `SmartOverflowText` adds `data-business-text`, `data-overflow-mode`, `data-full-text-trigger`, keyboard focus, tap/click, Escape dismissal, outside-click dismissal, copy action and `ResizeObserver` recalculation.

| Route | Component | Text | Cách cũ | Cách mới | Full text available | Desktop | Mobile | Keyboard |
|---|---|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard cards/status tables | Project names, chart labels | Mixed `truncate`/fixed table | Needs shared identity/disclosure on business labels | PARTIAL | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/projects` | `ProjectsListClient` | Project name, investor, location | `truncate`, fixed table cells | Two-line smart disclosure, duration line, wrapping mobile cards | YES | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/projects/[id]` | Project detail page | Title, investor, location, folder names, description | `truncate`, `line-clamp` | Full title wrapping; smart info/folder text; duration tile | YES | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/documents` | Documents overview | Project card title, code, execution unit | `truncate` | `ProjectIdentity` card/list variants with smart disclosure | YES | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/documents/[projectId]` | Document page header/workspace | Project title, folder names, document names | Header `truncate`; mixed row clipping | Full `ProjectIdentity` header; workspace remains to be migrated | PARTIAL | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Global header | `GlobalProjectContextSwitcher` | Selected project, code, status, investor/unit | Narrow trigger and metadata `truncate` | Selector variant keeps code/status/unit and opens full name | YES | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/materials` | `MaterialsWorkspace` | Project context, material names/groups | Large project-name pill; table truncation | Compact `ProjectIdentity` context; material table audit still pending | PARTIAL | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/reports` | Reports tables/drawers | Report title, project, creator, attachment name | `line-clamp-1`/`truncate` | Shared disclosure migration pending per component | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/approvals` | Approval center | Approval title, project and reasons | `line-clamp-1`, fixed table widths | Status labels remain bounded; business fields need component migration | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/tasks` | Work management lists/drawers | Task title, project, description | Mixed `truncate`/`line-clamp` | Backend/data scope verified; UI component migration pending | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/users` | User/account tables | User names, email, role labels | Compact table cells | Email may remain compact; name disclosure migration pending | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| `/notifications` | Notification bell/list | Notification title, project name, error text | `line-clamp-1/2` | Needs shared disclosure for business title | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Global search | `GlobalSearchCommand` | Project, report, notification titles | `truncate` rows | Needs shared disclosure while preserving search density | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Drawers/modals | Report/material/document drawers | Headings, reasons, file names | Mixed `truncate` | Shell overflow stays; business text migration pending | PARTIAL | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Dropdowns/comboboxes | Shared enterprise/safety comboboxes | Option labels and descriptions | `truncate` | Options need expandable/full-text rendering | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Toast/validation | Toast and form errors | Error messages | bounded containers | Must wrap and expose full message | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |

## Static scan

Repository scan targets were `truncate`, `text-ellipsis`, `text-overflow`, `line-clamp`, `overflow-hidden`, `whitespace-nowrap`, `table-fixed`, `max-w-*`, `min-w-0`, fixed widths/heights. No blanket removal was performed: technical labels, status pills, controls and media shells remain bounded; business text is listed above for targeted migration.

## Runtime status

This inventory is not a runtime PASS. The full viewport matrix, authenticated Playwright setup and cross-module RBAC suite still require execution with a live server and QA storage state. Evidence is recorded in `docs/qa/FULL_SOURCE_RECONCILIATION_AND_UI_UX_FINAL_REPORT.md`.
