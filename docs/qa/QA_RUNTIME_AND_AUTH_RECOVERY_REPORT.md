# QA RUNTIME AND AUTH RECOVERY REPORT

Ngày: 2026-08-11  |  Phase: A  |  Repository: `construction-erp-v2`

## 1. Initial Git State

Git dirty state đã tồn tại trước Phase A: 17 tracked source/schema/migration files modified và nhiều untracked reports/feature artifacts. Không reset, clean, checkout hoặc restore hàng loạt.

## 2. Runtime Process Inventory

Ban đầu không có server usable được xác minh trên 3000/3001. Đã khởi động đúng repository bằng `npm run dev`; Next.js 16.2.7 chạy từ `D:\construction-erp-v2`, port 3000. Process chain được xác minh bằng process metadata: `cmd.exe /c npm run dev` → Next CLI từ `D:\construction-erp-v2\node_modules\next\dist\bin\next`.

## 3. Actual Server Used

Active runtime cuối cùng dùng `DATABASE_URL` được inject trong process bằng giá trị `QA_DATABASE_URL` từ `.env.local` (database `construction_erp_v2_qa`), cùng `AUTH_SECRET` từ `.env.local`. Không sửa file env. Đây là schema-aligned QA runtime; không dùng `construction_erp_v2_hr_qa` vì thiếu column Prisma bắt buộc.

## 4. Environment Resolution

| Variable | Result |
|---|---|
| `DATABASE_URL` | PASS in active process; explicitly pointed to schema-aligned QA DB |
| `QA_DATABASE_URL` | PASS; source `.env.local` DB reachable |
| `AUTH_SECRET` | PASS; present and used in active process |
| QA account variables | Present in env files; known fixture account used for active runtime |
| `.env.e2e.local` connection | FAIL: PostgreSQL `28P01` |

Secret values are intentionally omitted.

## 5. Database Connectivity

PASS for active QA DB: PostgreSQL reachable, 72 public tables, `User`, `Project`, `ProjectMember` exist, and `ProjectMember.canApproveMaterialProposalTechnical` exists.

FAIL/BLOCKED for HR-QA DB: database reachable but required column missing. The error was reproduced by bootstrap and protected route runtime. No migration was applied because Phase A explicitly forbids business-schema migration.

## 6. Login Flow Trace

| Step | Result | Evidence |
|---|---|---|
| Login UI `/login` | PASS | Browser DOM loaded |
| Submit handler | PASS | `fetch('/api/auth/login', { method: 'POST' })` in `src/app/login/page.tsx` |
| API route | PASS | `src/app/api/auth/login/route.ts` received request |
| Credential validation | PASS | Active fixture `qa_admin@fixture.local` returned HTTP 200 |
| Prisma lookup | PASS | Active DB schema/account matched |
| Session creation | PASS | response contained `auth_session` cookie |
| Redirect | PASS | browser redirected to `/dashboard` |

## 7. Login Failure Root Cause

Original message “Không thể kết nối đến máy chủ” was caused by no usable server process at the time of the first audit. After starting the correct server, the request reached the API and returned deterministic 401 for wrong/stale credentials rather than connection failure.

A second environment error was proven: `.env.hr-qa.local` places the HR-QA database under `QA_DATABASE_URL` while app Prisma reads `DATABASE_URL`; using that file without process override made the app read the dev DB. When `DATABASE_URL` was pointed to HR-QA, login succeeded but protected routes hit schema drift. Active runtime was therefore switched to the schema-aligned `.env.local` QA DB without editing files.

## 8. Files Changed

- No application source, CSS, Prisma schema, or migration file was changed by Phase A.
- `tsconfig.json` was transiently modified by Next dev tooling to add `.next/dev/dev/types/**/*.ts`; the exact generated line was removed and final `git diff -- tsconfig.json` is empty.
- Audit reports created: this report and `QA_RUNTIME_BASELINE_INVENTORY.md`.
- Temporary read-only inspection helper and generated plaintext credential artifact were removed after use.

## 9. Fix Applied

Runtime-only recovery:

1. stopped stale/non-usable server attempts;
2. started one server from the correct repository;
3. injected `DATABASE_URL := .env.local QA_DATABASE_URL` and `AUTH_SECRET` in process memory;
4. used existing fixture account `qa_admin@fixture.local` with repository-provided test credential.

No application-code or schema fix was applied.

## 10. Authenticated Browser Evidence

Clean browser session after clearing the previous DB cookie:

- Login: PASS, `/login` → `/dashboard`.
- Dashboard DOM rendered authenticated account and navigation.
- Required smoke routes `/dashboard`, `/users`, `/projects`, `/materials`, `/hr/employees`, `/reports`, `/reports/weekly-inspection`, `/approvals`, `/settings`: 9/9 loaded with `main`, no forced login redirect, no fatal page text, and zero browser console error/warn entries in the clean run.

Direct HTTP verification with the same active runtime returned HTTP 200 for all 9 routes with the session cookie.

## 11. Session Persistence

PASS in clean session: reload `/dashboard` retained authenticated state, then all 9 protected smoke routes remained accessible. A prior failure was isolated to reusing a cookie minted against a different database; clearing `reason=session_expired` and re-login removed that cross-DB contamination.

## 12. QA Role Availability

PASS: 8/8 available fixture roles returned HTTP 200 from login using the repository QA test credential. Required groups are covered:

| Required group | Fixture evidence |
|---|---|
| ADMIN/high-level | `qa_admin@fixture.local` |
| DIRECTOR/high-level business | `qa_director@fixture.local` |
| Project-assigned normal user | `qa_engineer@fixture.local`, `qa_chief_commander@fixture.local` |
| Read-only/lower-role | `qa_staff@fixture.local` |

No full RBAC behavior audit was performed in Phase A.

## 13. Hydration Investigation

Repository-wide search found zero source occurrence of `antigravity-scroll-lock`. A clean page load at `/login?reason=session_expired`, with no menu/modal opened, produced body class `antialiased`, `hasInjectedClass: false`, and zero console warnings/errors. Existing historical reports identify the class as browser/test harness injection.

## 14. Hydration Classification

**EXTERNAL / TEST-HARNESS INDUCED — VERIFIED for clean-load Phase A context.** No source fix applied. The earlier dev-log mismatch remains historical evidence from a contaminated browser/tool context, not an app hydration defect in the clean reproduction.

## 15. Remaining Runtime Risks

- `construction_erp_v2_hr_qa` remains schema-drifted and must not be used until separately approved migration/refresh.
- `.env.e2e.local` credentials remain invalid (`28P01`).
- QA DB roles are elevated enough for the safety guard to reject bootstrap mutation; do not bypass the guard.
- Full action-menu/pointer/mobile/RBAC audit remains Phase B work.

## 16. Git Diff After Fix

Tracked source/schema/migration dirty state remains the same pre-existing state recorded at baseline. No new source or Prisma diff was introduced. `tsconfig.json` has no final diff. Only Phase A report artifacts are new from this phase.

## 17. FINAL VERDICT

**PHASE A PASS — authenticated runtime restored on the schema-aligned QA database.**

Gate summary:

- LOGIN: PASS
- DB active runtime: PASS
- SESSION: PASS
- PROTECTED ROUTE SMOKE: 9/9 PASS
- CORRECT SERVER PROCESS: VERIFIED
- QA ROLE ACCOUNTS: 4/4 required groups available
- HYDRATION: EXTERNAL / TEST-HARNESS ISSUE VERIFIED
- APPLICATION SOURCE CHANGED: 0

This PASS applies only to Phase A runtime recovery. It is not a PASS for the full system action-menu/pointer re-audit.

