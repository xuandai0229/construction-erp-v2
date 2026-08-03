# Project status, duration and text overflow report

## 1. Root cause

Source projects were assigned `PLANNING` whenever either date was missing. The source also stored duration only in JSON metadata, while the primary project surfaces did not select or render it. Long business text used single-line truncation in key project/document surfaces.

## 2. Changes

- Added `ProjectDurationUnit`, `plannedDurationValue`, `plannedDurationUnit`, and `plannedDurationRaw`.
- Added `backfill-project-duration.ts` with source-set blocker, parser, dry-run, and transactional apply.
- Changed source importer default status to `ACTIVE` and added `status` to field diff.
- Import apply now blocks conflicts, skips `UNCHANGED` updates, and writes project/user/membership backup data.
- Added duration to project create/update form, detail page, list, global selector, and document cards.
- Added `SmartOverflowText` and applied it to project list/detail, selector, and document cards.

## 3. Migrations

- `20260801110000_add_project_external_source_identity`
- `20260801123000_add_project_planned_duration`

Both are additive. No reset or destructive migration was run.

## 4. Data evidence

- Source projects: `21`
- Status after apply: `21 ACTIVE`, `0 PLANNING`
- Duration backfill: first dry-run `UPDATE=21`; after apply `UPDATE=0`, `UNCHANGED=21`
- Importer after apply: `CREATE=0`, `UPDATE=0`, `UNCHANGED=21`, `CONFLICT=0` (source SHA-256 `b6b1bba3c1859796e98224d8565bf1ac643599219a7c064d5ab5f14af963c2ae`)
- Commanders: `11`; assignments: `18`
- Project codes and external source keys unchanged; Đại Mỗ remains two records (`CT-2026-0017`, `CT-2026-0018`)
- No synthetic start/end dates were created.

## 5. Duration rules

`1645 ngày`, `300 ngày`, `12 tháng`, and other source durations are stored as integer plus `DAY`/`MONTH`. Raw values remain in `plannedDurationRaw`; `ngày` produces null value/unit without guessing.

## 6. Overflow inventory

See `docs/qa/system-text-overflow-audit.md`. The shared component recalculates overflow after resize and supports focus/click/tap disclosure. Static audit is complete for the requested class families; full route-by-route runtime verification remains pending.

## 7. Validation

- Prisma generate: PASS
- TypeScript: PASS
- Build: PASS, with existing NFT tracing warning in `next.config.ts`
- Duration dry-run after apply: PASS (`UPDATE=0`, `UNCHANGED=21`)
- Import dry-run after apply: PASS (`CREATE=0`, `UPDATE=0`, `UNCHANGED=21`, `CONFLICT=0`)
- Login runtime matrix: PASS, all 11 commander emails returned HTTP 200 and `success=true`
- Playwright screenshots and full viewport matrix: PENDING
- Backend RBAC probe: PASS for representative assigned/out-of-scope project on `/api/documents/load-more` (200/403) and `/api/work-management/tasks` (200/403)

The focused Playwright run reached the authenticated `/projects` page and produced `artifacts/project-duration-overflow/desktop-projects.png` and `desktop-medium-projects.png`. The full viewport suite is not marked PASS: the repository's shared config requires a missing `playwright/.auth/admin.json`, and the focused assertion suite still needs stabilization for the existing text encoding fixtures before all screenshots can be trusted.

## 8. Conclusion

`UI/DATA PASS — RBAC RUNTIME UNVERIFIED`

The source project data is corrected and duration is first-class. A full-system PASS is not claimed until the remaining Playwright viewport/screenshots and backend cross-project RBAC probes are executed.
