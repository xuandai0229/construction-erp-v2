# Tasks: Cán bộ giám sát công trình

## Phase 1: Setup and audit baseline

- [x] T001 Record RBAC inventory and current single-tenant limitation in `docs/qa/CONSTRUCTION_SUPERVISOR_GLOBAL_READONLY_AND_WEEKLY_AUTHOR_RBAC_FINAL_REPORT.md`
- [x] T002 Verify repository ignore/config safety and document QA database guard requirements in `specs/001-construction-supervisor-rbac/quickstart.md`

## Phase 2: Foundational role and centralized policy

- [x] T003 [P] Add failing role/read-vs-manage policy matrix tests in `src/lib/permissions/construction-supervisor-policy.test.ts`
- [x] T004 [P] Add failing weekly ownership/state policy tests in `src/lib/supervision-weekly/permissions.test.ts`
- [x] T005 Add `CONSTRUCTION_SUPERVISOR` enum and additive migration in `prisma/schema.prisma` and `prisma/migrations/20260727120000_add_construction_supervisor_role/migration.sql`
- [x] T006 Register role metadata and user-management assignment support without project memberships in `src/lib/roles/role-registry.ts`, `src/app/(dashboard)/users/actions.ts`, and `src/components/users/user-management-client.tsx`
- [x] T007 Implement centralized operational-read scope separate from management scope in `src/lib/rbac.ts`, `src/lib/rbac-rules.ts`, and `src/lib/permissions/project-scope.ts`
- [x] T008 Extend canonical read permissions while keeping all mutations/downloads denied in `src/lib/permissions/permission-registry.ts` and `src/lib/permissions/evaluate-permission-policy.ts`
- [x] T009 Implement weekly capability/ownership/state policies in `src/lib/supervision-weekly/permissions.ts`

## Phase 3: User Story 1 - All-project operational read-only

**Independent test**: role without memberships sees all projects/tasks/reports/materials/documents/approvals and direct source mutations are denied.

- [x] T010 [US1] Apply all-project read filtering while preserving project mutation denial in `src/app/(dashboard)/projects/page.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, and `src/app/(dashboard)/projects/actions.ts`
- [x] T011 [US1] Apply read-only material and approval policies in `src/lib/materials/materials-permissions.ts` and `src/lib/approvals/approval-permissions.ts`
- [x] T012 [US1] Grant task companywide-read only while denying all task actions in `src/lib/work-management/application/product-composition.ts`, `src/app/api/work-management/tasks/route.ts`, and `src/app/(dashboard)/tasks/page.tsx`
- [x] T013 [US1] Preserve document preview/view and deny download/upload/update/delete in `src/lib/permissions/permission-registry.ts` and document server routes/actions
- [x] T014 [US1] Expose allowed navigation and all-project labels without management controls in `src/lib/navigation-permissions.ts` and relevant server-derived UI permission props

## Phase 4: User Stories 2 and 3 - Own weekly author workflow

**Independent test**: role creates, saves, autosaves, previews, exports and submits own dossier; can edit/resubmit only after revision request.

- [x] T015 [US2] Enforce centralized weekly policies, author-scoped duplicate detection and project/row integrity in `src/app/(dashboard)/supervision/weekly/actions.ts`
- [x] T016 [US2] Enforce own-dossier export and locked denial in `src/app/api/supervision/weekly/[id]/export/route.ts` and print/preview loaders
- [x] T017 [US3] Preserve server-authoritative state/concurrency transitions and deny late autosave/double submit in `src/app/(dashboard)/supervision/weekly/actions.ts`

## Phase 5: User Story 4 - Other-author read-only UI

**Independent test**: role sees another author's dossier and history with read-only banner; edit/delete/export/review/lock actions are absent and denied directly.

- [x] T018 [US4] Return all readable weekly dossiers and server-derived capability flags in weekly page loaders/actions
- [x] T019 [US4] Render other-author and source-data read-only banners and hide mutation menus in `src/components/supervision-weekly/weekly-list-client.tsx`, `src/components/supervision-weekly/weekly-editor.tsx`, and related pages

## Phase 6: Verification and evidence

- [x] T020 [P] Add resolver and existing-role regression coverage in `src/lib/permissions/construction-supervisor-policy.test.ts`
- [x] T021 [P] Add weekly direct-policy, ownership, state, export and row-injection regression coverage in `src/lib/supervision-weekly/permissions.test.ts` and existing weekly tests
- [x] T022 Run Prisma validate/generate, scoped tests/lint, TypeScript and build; capture exact results in `docs/qa/CONSTRUCTION_SUPERVISOR_GLOBAL_READONLY_AND_WEEKLY_AUTHOR_RBAC_FINAL_REPORT.md`
- [x] T023 Evaluate QA database safety fingerprint and either run authenticated runtime/UI/export/revocation/cleanup matrix or record precise BLOCKED evidence in the final report
- [x] T024 Complete the 22-section final report and evidence index in `docs/qa/CONSTRUCTION_SUPERVISOR_GLOBAL_READONLY_AND_WEEKLY_AUTHOR_RBAC_FINAL_REPORT.md`

## Dependencies

- T003-T004 precede their implementations T007-T009.
- T005-T009 block all user-story phases.
- T010-T014 can proceed independently after foundation.
- T015-T017 are sequential because they share weekly server actions.
- T018 precedes T019.
- T020-T024 follow implementation.

## Implementation Strategy

The MVP is US1 plus US2/US3: safe all-project observation and own weekly author workflow. US4 then exposes peer dossiers in read-only mode. Runtime QA is never simulated against the application database; lack of an independent QA environment produces an honest NO-GO/BLOCKED report rather than an unsupported PASS.

## Phase 7: Convergence

- [ ] T025 CRITICAL Introduce or formally approve a deployment/database tenant-boundary contract that can prove same-tenant access and cross-tenant denial per FR-003 and FR-019 (missing)
- [ ] T026 Standardize denied mutation, denied export, stale-write and row-conflict audit events across every affected server entry point per FR-015 (partial)
- [ ] T027 Complete read-only banners/control audit and five-viewport authenticated screenshots for every source module per FR-014 and SC-007 (partial)
- [ ] T028 Run the authenticated QA direct-request, DB before/after, export, revocation, existing-role regression and exact-ID cleanup matrix per FR-019 and SC-002 through SC-006 (missing)
