# HR Navigation and Entity Visibility Reconciliation

## 1. Baseline

- Repository: `D:\construction-erp-v2`
- HEAD before this phase: `c68347a318ed122c9301cdfcda6c5069c9a5f629`
- The worktree was already materially dirty before the HR phase. The pre-existing work is concentrated in Materials, Prisma metadata migration scripts, shared enterprise UI, and several reports. No reset, clean, migration, seed, or data mutation was performed.
- HR files changed in this phase are listed in section 17. They are intentionally separate from the pre-existing Materials work.

## 2. Design read and contract

Reading this as: a dense internal ERP workspace for HR administrators and project managers, with an established restrained enterprise visual language. The redesign is a targeted preservation pass: static interaction, compact data density, and existing blue/neutral tokens.

The resulting contract is:

1. The left side of the workspace bar is content navigation.
2. The right side is one contextual page action, rendered only when server permission permits it.
3. Desktop keeps navigation and context action on one row from `xl`; tablet and mobile place the contextual action above an independently scrollable tab row.
4. Identity-critical values receive available width and up to two lines before truncation. Codes, dates, percentages, status, and record actions remain compact secondary data.
5. Full names remain discoverable with `title` on every newly clamped entity value.

## 3. Route and surface inventory

| Route / surface | Scope | Primary UI | Data / permission boundary | Navigation status |
| --- | --- | --- | --- | --- |
| `/hr` | Company | KPI, attention list | `hr:employee:read`, create action uses `hr:employee:create` | Main workspace tab |
| `/hr/employees` | Company / permitted employees | Filtered employee table and cards | server scope clause, create/update/archive permissions | Main workspace tab |
| `/hr/employees/[employeeId]` | Permitted employee | Employee profile, assignment history | target employee scope and field policy | Main workspace + contextual back |
| `/hr/employees/[employeeId]/edit` | Permitted employee | Edit form | `hr:employee:update` at target scope | Main workspace + contextual back |
| `/hr/employees/new` | Company | Create form | `hr:employee:create` | Main workspace + contextual back |
| `/hr/organization` | Company | Units, positions, chart sub-tabs | `hr:employee:read`, manage action uses `hr:organization:manage` | Main workspace tab + sub-tabs |
| `/hr/organization/units` | Redirect | Units sub-tab | Existing redirect | Redirect verified by source |
| `/hr/organization/positions` | Redirect | Positions sub-tab | Existing redirect | Redirect verified by source |
| `/hr/organization/chart` | Redirect | Chart sub-tab | Existing redirect | Redirect verified by source |
| `/hr/organization/managers` | Redirect | Units sub-tab | Existing redirect | Redirect verified by source |
| `/hr/project-assignments` | Company / permitted assignments | Toolbar, table, dialogs, drawer | assignment query capability object | Main workspace tab + contextual create |
| `/hr/contracts` | Redirect | Employee list | Existing redirect | Redirect verified by source |
| `/hr/reports` | Company / permitted assignments | Filters, KPI, charts, detail table, export | `hr:project_assignment:read` | Main workspace tab + contextual export |

Supporting HR surfaces audited: workspace shell/tabs, organization sub-tabs, employee table and detail view, create/edit/transfer forms, assignment table/toolbar/dialogs/drawer, organization tree, organization chart, position management, unit management, reports filters/charts/table, dialogs, empty/loading/access-denied states.

## 4. Navigation before and after

Before, HR had a standalone tab strip with an unused wide area. Each page independently placed its primary action in the header, creating duplicated hierarchy and inconsistent responsive behavior.

After, `HrWorkspaceTabs` is a thin HR route adapter over shared `EnterpriseTabs`:

- Five HR content tabs are left aligned.
- `rightContent` hosts one permission-gated contextual action.
- The action is removed from the matching `HrPageHeader` to prevent duplication.
- Route transition uses the Next router, preserving client navigation rather than full page reloads.
- Existing deep route recognition remains: employee detail/edit/new resolve to Nhân sự; organization sub-routes resolve to Phòng ban & Chức danh.

Implemented right-side actions:

| Surface | Contextual action |
| --- | --- |
| Overview and Employee list | Thêm nhân viên mới, only when create permission allows |
| Organization units | Thêm phòng ban / đơn vị, only when manage permission allows |
| Organization positions | Thêm chức danh mới, only when manage permission allows |
| Project assignments | Tạo điều động, only when capability allows |
| Reports | Export, only when read/export policy exposes it |
| Employee detail/create/edit | Correct contextual back link |

## 5. Header cleanup

`HrPageHeader` now retains title and explanatory context on the reviewed pages. The page action has one visual home in the workspace navigation. No server permission check was moved to the client: existing server-side `checkHrPermission` and capability queries still determine whether `rightContent` exists.

## 6. Entity-name visibility audit and fixes

The following identity-critical fields were found with early one-line truncation and corrected:

| Surface | Before | After |
| --- | --- | --- |
| Employee desktop table | Employee name one line; code consumed visual priority | Employee name clamps at two lines; code is secondary |
| Employee table | Department and position truncated early | Both can use two compact lines with a full-value title |
| Employee mobile card | Name, unit, and position one-line truncated | Identity fields clamp at two lines with titles |
| Employee project cell | Code chip appeared before project name | Project name is primary; code is only secondary detail in the information popup |
| Project assignments table | Employee and source unit truncated early | Two-line name and unit contract; project already uses shared `ProjectName` |
| Employee assignment history | Project and role one-line truncated | Project gets 35% table width, two lines, and secondary code; role gets two lines |
| Organization tree | Unit code preceded the unit name | Unit name is primary and two-line; code moves below as metadata |
| Organization chart | Manager one-line truncated | Manager is two-line and discoverable |
| HR reports charts | Project/unit combined code with name in a narrow line | Name gets two lines; code moves to secondary metadata |
| HR reports detail table | Employee and source unit one-line truncated | Wider, two-line cells with title fallback |
| Employee-create summary | Long name/unit/position prematurely truncated | Values are two-line, right-aligned summary content |
| Dialog titles | Dialog title always one line | Two-line dialog title with `title` fallback |

## 7. Combobox and selector behavior

The shared enterprise combobox now renders `option.name` as its primary label and shows `code` / description separately. This allows long project names to remain primary while preserving code search through the existing search index. HR project and employee assignment options now provide the name as the primary label, with code as metadata.

The report project selector now shows the selected project name rather than `name (code)` in its constrained trigger; its dropdown keeps the code beneath the name and still supports code search.

## 8. Employee table and project assignments

Employee table desktop columns now allocate 21% to employee name, 20% to unit/position, and 29% to current project. Numeric, status, date, and action columns are constrained to the remaining 30%.

Project assignments preserve the existing `UnifiedActionMenu`, pointer, active row behavior, toolbar, dialogs, and capability checks. The change only improves identity hierarchy in the table/cards and project selections.

## 9. Organization, overview, and reports

- Organization sub-tabs retain their independent compact layout because they have no contextual action.
- The overview’s KPI logic and attention logic are untouched.
- HR reports keep their existing filter, chart and export behavior. Project and unit names in charts and tables receive the shared visibility contract.

## 10. Responsive design contract

Source implementation now defines:

| Breakpoint | Navigation behavior |
| --- | --- |
| `xl` and above | Content tabs left, contextual action right in one bar |
| Tablet below `xl` | Contextual action sits in a controlled first row; tabs remain a separate horizontally scrollable row |
| Mobile | The action is reachable first; tabs scroll horizontally without a body-width overflow contract being added |

Data tables retain their existing card transformation at smaller breakpoints where present. No desktop table was reduced to unusably small text.

## 11. Navigation state and RBAC

Source audit confirms the HR workspace tabs retain route-based active state for overview, employees, organization, assignments, and reports. Detail/new/edit pages resolve to the Nhân sự tab. Existing redirects for organization routes and contracts were not changed.

RBAC was not broadened. The new visual actions are supplied only after the pre-existing server-side permission/capability checks. Direct-URL and role runtime verification remains blocked by the unavailable QA login session (section 14).

## 12. Accessibility and interaction

- Workspace tabs are native buttons rendered by the shared component and use visible focus styles.
- Context actions remain semantic links or buttons.
- Combobox options retain `listbox` / `option` keyboard behavior; primary labels can use two lines while secondary codes remain discoverable.
- Newly clamped entity values include `title`; dialogs can expose a full title.

Keyboard and active-menu behavior require authenticated runtime verification.

## 13. Runtime evidence

The local application was opened at `http://localhost:3000/hr`. The server redirected it to:

`http://localhost:3000/login?next=%2Fhr`

The accessible DOM only contained the login screen. No credentials or authenticated browser session were available. Therefore no HR screenshot, DOM geometry, console/network sweep, viewport matrix, menu test, RBAC role test, back/forward test, or long-text runtime evidence is claimed.

## 14. Quality gates

| Check | Result | Evidence |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | Completed with exit code 0 after HR changes |
| `git diff --check` | PASS | No whitespace errors; Git emitted only LF/CRLF warnings |
| Targeted ESLint over HR/shared UI | FAIL, pre-existing HR errors | 32 errors and 21 warnings. Errors are in conditional hooks, create-handler declaration order and unescaped JSX in files/lines not changed by this phase |
| `npm run lint` | FAIL, repository pre-existing | 42 errors and 262 warnings across the repository, including the existing HR errors and unrelated modules |
| `npm run build` | UNVERIFIED | Two build attempts compiled successfully and began TypeScript, but the command runner detached before returning an exit status. No build PASS is asserted. |

No new TypeScript or ESLint failure was reported for `hr-workspace-tabs.tsx`, the HR route-page navigation changes, or `enterprise-combobox.tsx`.

## 15. Screenshot manifest

Not available. Capturing login as HR evidence would be misleading. Required authenticated evidence still includes overview, employee list, organization/positions, project assignments, reports, tablet, mobile, long-name, action menu and browser navigation.

## 16. Remaining defects and risks

1. Authenticated runtime QA is blocked by the lack of a QA session.
2. The whole repository has pre-existing ESLint errors; the HR subset also contains known failures outside this change. This prevents a lint quality gate pass.
3. The build runner did not return a final exit status even though compilation succeeded. Build verification is incomplete.
4. Shared `EnterpriseTabs` and `EnterpriseCombobox` are used by other modules. Static TypeScript passed, but authenticated visual smoke tests of Materials, Projects, Reports, Safety, Supervision, Approvals and Dashboard remain required.

## 17. Files changed in this phase

- `src/components/hr/hr-workspace-tabs.tsx`
- `src/app/hr/page.tsx`
- `src/app/hr/employees/page.tsx`
- `src/app/hr/employees/new/page.tsx`
- `src/app/hr/employees/[employeeId]/page.tsx`
- `src/app/hr/employees/[employeeId]/edit/page.tsx`
- `src/app/hr/organization/page.tsx`
- `src/app/hr/reports/page.tsx`
- `src/components/hr/employee-data-table.tsx`
- `src/components/hr/employee-create-form.tsx`
- `src/components/hr/employee-detail-view.tsx`
- `src/components/hr/hr-dialog-shell.tsx`
- `src/components/hr/organization-tree-view.tsx`
- `src/components/hr/org-chart-view.tsx`
- `src/components/hr/project-assignments/project-assignment-workspace.tsx`
- `src/components/hr/project-assignments/project-assignment-table.tsx`
- `src/components/hr/project-assignments/project-assignment-toolbar.tsx`
- `src/components/hr/project-assignments/create-assignment-dialog.tsx`
- `src/components/hr/reports/hr-report-charts-grid.tsx`
- `src/components/hr/reports/hr-report-detail-table.tsx`
- `src/components/hr/reports/hr-report-filter-bar.tsx`
- `src/components/ui/enterprise-combobox.tsx`
- `HR_NAVIGATION_AND_ENTITY_VISIBILITY_FINAL_RECONCILIATION.md`

## 18. Final verdict

**PARTIAL / RUNTIME UNVERIFIED.**

The source-level HR navigation and entity-visibility reconciliation is implemented and TypeScript-clean. The phase is not 10/10, not full pass, and not production-certified because authenticated desktop/tablet/mobile/RBAC/navigation runtime evidence is unavailable, repository lint is failing, and build exit status was not obtained.
