# FULL SYSTEM RECORD ACTION COVERAGE LEDGER

Static/source ledger. Runtime columns intentionally remain `UNVERIFIED` unless direct browser evidence exists. Primary toolbar actions are excluded.

| ID | Module | Route/tab | Screen/component | Record type | Current pattern | Unified? | Pointer requested | Pointer implemented | Active row | Desktop | Mobile | RBAC | Runtime tested | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | Users | `/users` | `user-management-client` | User | row menu | Yes | Yes | source support | source state | static | static branch? | source | No | UNVERIFIED |
| A02 | Projects | `/projects` | `project-list-client` | Project | row menu | Yes | Yes | source support | not runtime | static | unverified | source | No | UNVERIFIED |
| A03 | Materials | `?tab=requests` | `material-proposal-list` | Proposal | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A04 | Materials | `?tab=catalog` | `materials-ui` | Material | shared row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A05 | Materials | `?tab=stock` | `materials-ui` | Stock | shared row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A06 | Materials | `?tab=transactions` | `materials-ui` | Movement | shared row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A07 | HR | `/hr/employees` | `employee-data-table` | Employee | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A08 | HR | `/hr/organization?tab=positions` | `position-management-client` | Position | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A09 | HR | organization managers | `unit-manager-management-client` | Manager assignment | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A10 | HR | `/hr/project-assignments` | `project-assignment-table` | Assignment | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A11 | Reports | `/reports` all | `reports-table` | Field report | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A12 | Supervision | `/supervision/weekly` | `weekly-list-client` desktop | Weekly file | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A13 | Supervision | `/supervision/weekly` | `weekly-list-client` alternate branch | Weekly file | row menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A14 | Supervision | weekly detail tables | `row-action-menu` | Schedule/result line | wrapper menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A15 | Safety | safety list | `safety-row-action-menu` | Safety record | wrapper menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A16 | Safety | safety portal list | `safety-row-action-portal-menu` | Safety file | portal wrapper | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A17 | Safety | weekly file PLAN | `safety-weekly-file-workspace` | Plan | header/action menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A18 | Safety | weekly file ASSESSMENT | `safety-weekly-file-workspace` | Assessment | header/action menu | Yes | Yes | source support | source state | static | unverified | source | No | UNVERIFIED |
| A19 | Documents | `/documents` | `document-workspace` | Document | context/custom menu | Candidate | Yes | unknown | unknown | static | static mobile component | source | No | UNVERIFIED |
| A20 | Documents | project documents | `document-manager` | Document | inline/context actions | Candidate | Yes | unknown | unknown | static | static mobile component | source | No | UNVERIFIED |
| A21 | Dashboard | pending actions | action center/card list | Pending item | inline action group | No/unknown | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A22 | Dashboard | recent documents | dashboard cards | Document | card action | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A23 | Project detail | `/projects/[id]` | project detail tabs | WBS/item | inline/custom | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A24 | Reports | mobile reports | `reports-mobile-cards` | Field report | mobile card actions | Candidate | Yes | unknown | unknown | static | static mobile | source | No | UNVERIFIED |
| A25 | Materials | catalog | `materials-catalog` | Material | inline/action buttons | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A26 | Materials | stock | `materials-stock-table` | Stock | inline/action buttons | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A27 | Materials | movement | `materials-transactions` | Movement | inline/action buttons | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A28 | Approvals | PENDING/RESOLVED/ALL | `approval-center-client` | Approval request | direct workflow actions | Exception; safety-critical | Documented | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A29 | Settings | settings surfaces | `settings-workspace` | Setting/config | config action | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A30 | HR | contracts | HR contract list | Contract | inline/action group | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A31 | HR | reports | HR report table | HR report | export/detail | Candidate | Yes | unknown | unknown | static | unknown | source | No | UNVERIFIED |
| A32 | Reports | weekly inspection | `weekly-list-client`/detail | Inspection | row menu/workflow | Yes/wrapper | Yes | source support | source state | static | unknown | source | No | UNVERIFIED |
| A33 | Safety/Supervision | editor tables | `result-data-tables` / `result-schedule-table` | Result/schedule line | row menu | Yes via wrapper | Yes | source support | source state | static | unknown | source | No | UNVERIFIED |

## Counting note

This ledger's 33 is a static location count, not a claim that 33 runtime menus were opened. The runtime action-menu coverage is 0/33.

