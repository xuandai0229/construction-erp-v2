# Performance Remediation Report

## 1. Executive Summary

Phase 2 did not ship a performance remediation. It added development/QA-only request and Prisma phase telemetry, closed several evidence gaps, and rejected the first isolated P0 candidate because the required end-user before/after result was not demonstrated.

Verdict: **BLOCKED**. The system must not claim a performance gain from the candidate request-scoped `GlobalProjectContext` cache. The duplicate work is confirmed, but the ten-run browser measurement did not show an improvement and the change was rolled back.

## 2. Phase 1 Baseline Reconciliation

All whole-millisecond metrics in `PERFORMANCE_FORENSICS_REPORT.md` now use `ms` and a comma thousands separator: for example `1,189 ms`, `4,534 ms`, and `3,437 ms`. The Phase 1 baseline commit was `d16acfb` (`main`).

## 3. Instrumentation Added

`PERF_PROFILE=1` enables development/QA-only console events in the form:

```text
[perf] {"requestId":"…","route":"/dashboard","phase":"…","durationMs":…}
```

Instrumentation covers proxy, `getSession`, `requireAuth`, AppShell, global-project-context phases, each HR permission resolution, dashboard page data, root redirect, and Prisma model/operation duration. It deliberately logs neither SQL parameters nor cookies, tokens, passwords, or user data. With `PERF_PROFILE` unset, the Prisma extension is not installed and the timing functions execute the original work only.

## 4. Request Phase Measurements

Confirmed from correlated server traces for authenticated `/dashboard`:

| Phase | Observation | Confidence |
|---|---|---|
| `auth.get-session` | 2 invocations per request | Confirmed |
| `auth.require-auth` | 1 invocation per request | Confirmed |
| `global-project-context` | 2 invocations per request before candidate change | Confirmed |
| `hr-permissions.*` | 7 permission-resolution branches per request | Confirmed |
| `app-shell` | waits for auth, project context, and HR permissions | Confirmed |

A warm trace showed `global-project-context` at `45.83 ms`, HR permission aggregate at `123.62 ms`, AppShell at `182.32 ms`, page data at `276.89 ms`, and dashboard page render at `336.78 ms`. These are individual development traces, not p50/p95 results; server phase percentile collection is therefore **UNVERIFIED**.

## 5. Prisma Measurements

Prisma telemetry confirmed real database hits rather than merely repeated function calls:

- The two `getSession()` calls each emitted `User.findUnique`.
- Each `GlobalProjectContext` invocation emitted project, pending-approval, and issue-report queries.
- HR permission checks emitted seven `User.findUnique` plus seven `UserAccessGrant.findMany` operations in the representative trace.

The first in-memory HTTP collector was removed: Turbopack development module isolation caused it to miss Prisma events even though the correlated console trace was correct. No query-count percentile is reported from that collector. A file-backed or external trace sink is required before accepting request-level Prisma p50/p95 numbers.

## 6. Browser Navigation Measurements

Definition used for the controlled P0 experiment: a fresh Chromium context with the existing admin storage state, navigation to `http://127.0.0.1:3000/dashboard`, assert final pathname is `/dashboard`, and wait for `networkidle`. Each set has 10 samples.

| Condition | Min | p50 | p95 | Max |
|---|---:|---:|---:|---:|
| Development, duplicate context work | 2,639 ms | 2,833 ms | 3,136 ms | 3,136 ms |
| Development, request cache candidate | 2,706 ms | 2,874 ms | 3,591 ms | 3,591 ms |

The candidate was not retained: p50 regressed by `41 ms` (1.4%) and p95 regressed by `455 ms` in this test. Dev-mode variance and `networkidle` make this insufficient to quantify production UX, but it is sufficient to reject a claimed improvement.

Cold/warm/prefetched matrices for all major routes remain **BLOCKED**: an authenticated production-local benchmark runner was not completed in this pass. Phase 1's sequential browser timings must not be reinterpreted as cold-route benchmarks.

## 7. React Profiler Findings

No React Profiler commit-count capture was performed. Render counts for AppShell, Sidebar, Header, ToastProvider, GlobalOverlayProvider, page roots, tables, dialogs, and project changes remain **UNVERIFIED**.

## 8. Main Thread Findings

No Chrome performance trace was captured in this pass. Long tasks, JS execution, rendering, layout, paint, garbage collection, LCP, CLS, and INP remain **UNVERIFIED**. They must not be assigned as root causes.

## 9. Flicker Root Cause

The initial flicker has not been runtime-proven. Code evidence still shows explicit hard-reload/refresh paths in the files identified in Phase 1, but neither a browser video nor a route-trigger trace established that they execute during initial authenticated `/` load.

Result: **UNVERIFIED**. There is no evidence of a browser hard reload in the representative direct `/dashboard` navigation; that does not prove the initial `/` route is free of an RSC/loading transition.

## 10. Root Cause Re-Ranking

| Rank | Cause | Before evidence | Confidence | Decision |
|---:|---|---|---|---|
| 1 | Duplicate AppShell/project-context work | 2 global contexts and their queries per dashboard request | Confirmed | Candidate cache rejected pending production proof |
| 2 | Repeated auth/RBAC resolution | 2 real session `User.findUnique` calls; 7 HR branches | Confirmed | Do not change until request-scoped security design and role matrix exist |
| 3 | Dynamic shell blocks every route | AppShell awaits context and permissions before shell | Confirmed | Measure production phase p50/p95 first |
| 4 | Root redirect | `/` invokes auth then redirects to role route | Confirmed | Needs ten-run redirect decomposition |
| 5 | Storage NFT tracing warning | Production build warning with attachment import trace | Confirmed | Isolate and test separately |
| 6 | Hydration, React rerenders, main thread, leak | No profile/trace | Unverified | No remediation authorized |

## 11. P0 Fixes

No P0 fix was retained.

The isolated candidate used React request-scoped caching keyed by user id, role, and explicit project route value. Trace output reduced global context construction from two to one per request. It was rolled back because the required browser measurement did not improve and no production-local before/after was completed.

## 12. P1 Fixes

None implemented. Auth/RBAC, shell decomposition, root redirect, and hard reload paths remain investigation targets. Security checks were not removed, weakened, or cached across requests.

## 13. P2 Fixes

None implemented. No bundle split, table rewrite, query rewrite, index, cache, loading UX change, or storage-tracing change was made.

## 14. Before / After

| Metric | Before | After candidate | Improvement | Pass |
|---|---:|---:|---:|---|
| `/dashboard` dev browser p50 | 2,833 ms | 2,874 ms | +41 ms | Fail |
| `/dashboard` dev browser p95 | 3,136 ms | 3,591 ms | +455 ms | Fail |
| Global project contexts/request | 2 | 1 | -50% work count | Structural only; not a UX pass |

## 15. Role Regression Matrix

| Role | Authenticated route check | Project isolation check | Status |
|---|---|---|---|
| Admin fixture | `/dashboard` reached; status 200 | No changed behavior retained | Pass |
| DIRECTOR, DEPUTY_DIRECTOR, CHIEF_COMMANDER, MANAGER, ENGINEER, STAFF, SUPERVISION_HEAD, CONSTRUCTION_SUPERVISOR | No verified fixture/profile in this pass | Not run | Blocked |

## 16. Security Regression

No authorization behavior was changed. The rolled-back candidate was request scoped and did not cross users, but it is not in the working tree. Admin direct navigation still required the existing session; unauthenticated navigation continued to route to login in the local browser trace. Full role, direct-URL, server-action, API, and project-A/project-B matrix is **BLOCKED** pending fixtures.

## 17. Route Performance Matrix

| Route family | Evidence this pass | Status |
|---|---|---|
| Dashboard | 10 authenticated dev samples; correlated phase/Prisma trace | Warning |
| Root redirect | Single correlated dev trace only | Warning |
| Projects, project detail, documents, reports, materials, approvals, HR, settings, supervision, users/admin | Not measured with the required cold/warm/prefetch matrix | Blocked |

## 18. Database Performance

No database schema, index, query, pagination behavior, or data was changed. Prisma evidence confirms duplicate real queries in shared shell/auth paths. Query plans, database p50/p95, database connection pressure, and high-cardinality pagination validation remain **BLOCKED**.

## 19. Bundle Performance

`npm run build` again produced the existing NFT tracing warning for `src/lib/storage/local-storage-provider.ts` through `src/app/api/reports/attachments/[attachmentId]/route.ts`. It remains a confirmed build/system risk. No bundle remediation was attempted because route-level transfer/parse evidence was not captured.

## 20. Scale Forecast

At S1/S2/S3 the currently confirmed duplicate shell context and repeated auth/RBAC work multiply request database pressure. The highest-confidence next scale pressure remains shared shell queries plus high-cardinality list architecture identified in Phase 1. Quantitative 10x/100x/1000x capacity estimates are **UNVERIFIED** without plans, row counts, and concurrency tests.

## 21. Remaining Bottlenecks

1. Duplicate project context work per authenticated dashboard request.
2. Duplicate session lookup and seven HR permission branches in the shell path.
3. Root redirect adds a second navigation stage.
4. Storage tracing can widen the attachment API bundle.
5. High-volume client/table risks from Phase 1 remain unmeasured at realistic data volumes.

## 22. Technical Debt

The current console telemetry is intentionally minimal and disabled by default. To close Phase 2A, add a QA-safe trace sink that survives Next development module isolation, then automate production-local cold/warm/prefetch, React Profiler, Chrome trace, role fixtures, and query-plan capture. Do not use a process-global HTTP collector as the source of truth in Turbopack development.

## 23. Performance Budget Gate

No budget is passed by this remediation round. The proposed targets remain: authenticated initial route <= `1,500 ms` acceptable; cold route <= `500 ms` acceptable; warm/prefetched navigation <= `200 ms` where architecture permits; simple interaction/modal/dropdown <= `100 ms`; CLS <= `0.10`; LCP <= `2,500 ms`. Production-local evidence is required before assigning pass/fail.

## 24. Final Verdict

**BLOCKED**.

The first remediation was correctly rejected because it did not demonstrate an end-user improvement. Continue with a production-local correlated benchmark and full role/security matrix before changing AppShell, Auth/RBAC, redirect behavior, hard reload paths, caching, queries, or bundles.
