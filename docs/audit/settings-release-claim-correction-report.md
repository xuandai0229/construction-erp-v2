# SETTINGS RELEASE CLAIM CORRECTION REPORT

Generated: 03/08/2026, Asia/Ho_Chi_Minh

## 1. Trạng thái

**NO-GO**

Credential rotation is incomplete, authenticated production/browser evidence is blocked, the audit UI acceptance criteria are incomplete, the upload suite does not test the claimed HTTP pipeline, and accessibility runtime evidence is absent.

## 2. Correction của báo cáo cũ

The historical `GO - PRODUCTION READY` claim in `settings-e2e-final-manifest.md` is withdrawn but retained as history. A timestamped correction notice was added. The phrases “Production Ready” and “all security vulnerabilities” are not current conclusions.

## 3. Credential incident

- Secret locations: path-only inventory at `docs/audit/settings-credential-location-inventory.md`.
- Scan result: 207 working-tree heuristic candidate paths, 81 Git-history path/commit entries and 23 screenshot/trace artefacts requiring review. These include examples and fake sanitizer data; they are not all confirmed secrets.
- Confirmed Settings exposures remediated in source: weak admin password text in the old manifest; DB URL fallbacks in five Settings integration tests; shared fixture password in `seed-settings-e2e-fixtures.ts`; browser screenshot password literal.
- Administrator password: rotated twice; the second rotation used cryptographic RNG and bcrypt verification. The first attempt is explicitly not counted because the PowerShell RNG call failed.
- E2E fixture passwords: 9 accounts rotated with 9 distinct environment-only secrets. `.env.e2e.local` is ignored by the existing `.env*` rule and values were not printed.
- Sessions invalidated: source now binds cookies to `User.updatedAt`; old/mismatched cookies are rejected after deployment. Authenticated runtime proof for the primary administrator is not available.
- Database credential: **not rotated**. The PostgreSQL principal may have consumers outside this checkout/CI; rotating it without an external consumer inventory could break service. This is a release blocker.
- Primary `AUTH_SECRET`: no verified rotation evidence. E2E uses a newly generated isolated secret.
- Secret scan: **FAIL/not clean**. Repository history and legacy scripts/docs still contain candidates. Repository edits cannot scrub Codex transcripts or external CI retention.

## 4. Migration

- Migration file: `prisma/migrations/20260803150000_enforce_system_setting_singleton/migration.sql`.
- Version control: file is present in the worktree but not committed/staged.
- `db push`: the prior claim did not provide production migration evidence; any earlier `db push` is not accepted.
- `migrate deploy`: PASS on `construction_erp_v2_settings_e2e_20260803` only.
- Migration status: 20 migrations, E2E schema up to date.
- Primary database: migration not applied.

## 5. Singleton

- Constraint: non-null `singletonKey`, fixed-value CHECK (`singletonKey = 'DEFAULT_SETTINGS'`) and unique index.
- Preflight: migration raises before schema change when row count is greater than one; it deletes no rows and does not alter `version` or legacy fields.
- Second-row test: PASS on E2E. A transaction attempted `ANOTHER_VALUE`; PostgreSQL rejected it and the transaction was rolled back.
- Application reads: use `findUnique({ singletonKey: 'DEFAULT_SETTINGS' })`, not `findFirst`.
- Rollback: `docs/audit/settings-singleton-rollback.sql`; manual only, never automatically executed.
- Scope: E2E PASS; primary remains NO-GO pending approval.

## 6. UserRole matrix

This is the login/system role matrix. It contains 9 roles, not 17.

| UserRole | Menu/route | Company | Documents | Administration | Runtime direct action/tamper |
|---|---|---|---|---|---|
| ADMIN | Allow | Read/write | Read/write | Read | Not browser-proven |
| DIRECTOR | Allow | Read/write | Read-only | Deny | Static server guard only |
| DEPUTY_DIRECTOR | Allow | Read-only | Read-only | Deny | Static server guard only |
| CHIEF_COMMANDER | Deny | Deny | Deny | Deny | Static only |
| MANAGER | Deny | Deny | Deny | Deny | Static only |
| ENGINEER | Deny | Deny | Deny | Deny | Static only |
| STAFF | Deny | Deny | Deny | Deny | Static only |
| SUPERVISION_HEAD | Deny | Deny | Deny | Deny | Static only |
| CONSTRUCTION_SUPERVISOR | Deny | Deny | Deny | Deny | Static only |

Static policy tests pass for all 9 roles. This is not yet a full runtime RBAC matrix.

## 7. ProjectRole scope matrix

`ProjectRole` is membership context and never becomes a login role.

| ProjectRole | STAFF gains Settings | ADMIN loses Settings | One membership | Multiple memberships |
|---|---:|---:|---|---|
| PROJECT_MANAGER | No | No | Static PASS | Not runtime-proven |
| SITE_COMMANDER | No | No | Static PASS | Not runtime-proven |
| CHIEF_COMMANDER | No | No | Static PASS | Not runtime-proven |
| ASSISTANT_COMMANDER | No | No | Static PASS | Not runtime-proven |
| QA_QC | No | No | Static PASS | Not runtime-proven |
| HSE | No | No | Static PASS | Not runtime-proven |
| SUPERVISOR | No | No | Static PASS | Not runtime-proven |
| VIEWER | No | No | Static PASS | Not runtime-proven |

No project selector is part of the Settings permission definition. Browser/direct-request coverage is incomplete.

## 8. Production runtime

- `npm run build`: PASS.
- `next start`: PASS on port 3100 with E2E database, isolated AUTH secret and E2E storage configuration.
- Unauthenticated direct `/settings`: PASS; redirected to `/login?next=%2Fsettings`.
- Real authenticated login: **BLOCKED**. The in-app browser cannot securely receive the generated environment-only password; no auth bypass or secret logging was used.
- Company/documents save, audit view, Director, Deputy, conflict and expired-session browser scenarios: not proven.
- Server start log: `docs/audit/settings-release-runtime-evidence/production-server-stdout.log`.

## 9. Audit browser E2E

**FAIL/unproven.** Source supports actor snapshot and Vietnamese labels for new audit payloads, but browser evidence does not prove before/after detail, batch expansion, actor-deleted state, QA filter controls, pagination/load-more, empty/error states or Director/Deputy denial. The current UI implementation also lacks several of those requested controls.

## 10. Multipart evidence matrix

The existing test named “True Raw HTTP Upload” is not a raw HTTP route test. It calls policy/storage/Prisma helpers directly.

| Tiêu chí | Existing test | HTTP route | Auth | DB asserted | Storage asserted | Audit asserted | Cleanup |
|---|---|---:|---:|---:|---:|---:|---:|
| Dưới giới hạn | Policy function | No | No | No | No | No | N/A |
| Đúng giới hạn | Policy function | No | No | No | No | No | N/A |
| Vượt giới hạn | Policy function | No | No | No | No | No | N/A |
| Vượt trong stream | Missing | No | No | No | No | No | No |
| Extension hợp lệ | Policy function | No | No | No | No | No | N/A |
| Extension nguy hiểm | Policy function | No | No | No | No | No | N/A |
| MIME spoof | Missing | No | No | No | No | No | No |
| Magic bytes | Local buffer comparison | No | No | No | No | No | N/A |
| Traversal | Policy/provider helper | No | No | No | Partial | No | Direct |
| Unicode | Provider direct | No | No | No | Yes | No | Direct delete |
| Auto-version bật | Manual Prisma calculation | No | No | Yes | No | No | Direct DB delete |
| Auto-version tắt | Constant assertion | No | No | No | No | No | N/A |
| Hai upload đồng thời | Provider direct | No | No | No | Yes | No | Direct delete |
| Interrupted stream | Manual temp-file create/delete | No | No | No | No pipeline | No | Test deletes itself |
| Partial cleanup | Manual unlink | No | No | No | No pipeline | No | Test deletes itself |
| Không có Document khi fail | Count only | No | No | Yes | No | No | N/A |
| Audit reject | Policy result only | No | No | No | No | No | N/A |
| Download | Provider `readFile` | No | No | No | Yes | No | Direct delete |
| SHA-256 | Provider direct | No | No | No | Yes | No | Direct delete |

Full pipeline status: **FAIL/unproven**.

## 11. Accessibility

No authenticated Settings axe desktop/mobile report exists. Keyboard-only, focus after validation/conflict, toast live region, contrast and touch-target runtime evidence are absent. Status: **FAIL/unproven**. No severity counts can honestly be reported.

## 12. Primary DB before/after

Both manifests were collected with read-only queries.

| Metric | Before | After | Result |
|---|---:|---:|---|
| SystemSetting count | 1 | 1 | Unchanged |
| SystemSetting ID | `cmrncs18n000050wkc0qa340z` | same | Unchanged |
| SystemSetting version | 10 | 10 | Unchanged |
| SystemSetting updatedAt | `2026-08-03T00:04:56.254Z` | same | Unchanged |
| Settings fixture users | 0 | 0 | Unchanged |
| Run-marker documents | 0 | 0 | Unchanged |
| Run-marker projects | 0 | 0 | Unchanged |
| AUTOMATED_TEST audits | 0 | 0 | Unchanged |
| Total AuditLog | 299 | 299 | Unchanged |

The intended administrator password rotation changed that User credential only; it is outside the above Settings/run-marker manifest and is disclosed as an authorized security mutation.

## 13. Cleanup

| Resource | Baseline fixture | Created by this run | Removed | Remaining |
|---|---:|---:|---:|---:|
| E2E SystemSetting | 1 | 0 | 0 | 1 |
| E2E fixture users | 9 | 0 | 0 | 9 |
| E2E fixture projects | 1 | 0 | 0 | 1 |
| Run-marker documents | 0 | 0 | 0 | 0 |
| AUTOMATED_TEST audits | 0 | 0 | 0 | 0 |
| `storage_e2e` files | 1 marker | 0 | 0 | 1 marker |
| `storage_e2e_unit_test` files | 1 marker | 0 | 0 | 1 marker |
| `storage_e2e_release` files | 0 | 0 | 0 | 0 |

Baseline fixtures were intentionally retained and are not described as residual test data.

## 14. Prisma validate

PASS. Prisma Client was regenerated after the schema change.

## 15. TypeScript

PASS after Prisma Client regeneration.

## 16. ESLint

All changed TypeScript/TSX files: PASS with 0 errors and 0 warnings (`--no-warn-ignored`). Global lint outside the changed-file set was not rerun in this correction cycle.

## 17. Unit

Static/unit subset: 98 tests PASS plus 22 session/RBAC tests PASS and 7 QA guard tests PASS. These results do not substitute for runtime evidence.

## 18. Integration

- Singleton database integration: PASS on E2E.
- Settings audit/database and upload suites: not accepted as complete end-to-end evidence due missing HTTP/auth/pipeline assertions.

## 19. Browser E2E

Unauthenticated direct-route redirect PASS. Authenticated Settings browser E2E BLOCKED by secure secret handoff and therefore incomplete.

## 20. Build

PASS. Next.js 16.2.7 production build completed. Five broad NFT tracing warnings remain in report/print storage paths outside Settings.

## 21. Console/network

No authenticated Settings console/network run exists. Production server started without fatal error; `production-server-stderr.log` is empty. Status: incomplete.

## 22. Screenshot/trace

Unauthenticated route-guard evidence: `docs/audit/settings-release-runtime-evidence/unauthenticated-settings-redirect.png`. Production server logs are stored in the same directory. No authenticated Settings screenshot/trace or axe report exists. Existing older screenshots are not reused as proof for this release claim.

## 23. Blocker còn lại

1. Rotate the disclosed PostgreSQL credential across the database principal and every application/CI consumer.
2. Prove primary session invalidation after deployment or rotate the primary AUTH secret with coordinated rollout.
3. Complete authenticated production browser E2E for Admin, Director, Deputy and denied roles.
4. Implement/prove the missing audit detail/filter/pagination/error requirements.
5. Replace helper-level upload tests with authenticated HTTP route + DB + storage + audit + cleanup assertions.
6. Run axe desktop/mobile and keyboard/focus tests on authenticated Settings.
7. Classify/remediate the remaining working-tree and Git-history credential candidates and external log retention.
8. Obtain approval before applying the singleton migration to the primary database.

## 24. Kết luận cuối

**NO-GO.** The most serious false claims have been corrected, the administrator and E2E fixture passwords have been rotated, and the singleton guarantee now has a real E2E-deployed migration. Release readiness is still blocked by database credential rotation, authenticated browser/accessibility evidence, the incomplete audit UI acceptance surface and the missing true upload pipeline test.
