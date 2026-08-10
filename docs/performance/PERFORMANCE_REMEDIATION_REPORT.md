# Performance Remediation Report

> **CURRENT VERDICT:** **CONDITIONAL GO FOR CONTROLLED REMEDIATION.**
>
> **NOT YET SCALE-READY.** The earlier Phase 2 request-scoped context-cache candidate remains **BLOCKED** because it did not prove end-user improvement. Phase 2A.1 closed enough production-local evidence to permit narrow, independently measured remediation only; it did not clear Auth/RBAC, project isolation, query architecture, or scale readiness.

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

---

# Phase 2A.1 — Production Performance Truth

## Production Environment

Measurements in this section use the existing authenticated Admin Playwright storage state against the local **production** build (`next build`, then `next start`) at `http://127.0.0.1:3001`. They do not use the development server, HMR, or a development compiler.

`PERF_PROFILE=1` was set only for the QA production server so that the already-committed phase/Prisma telemetry emitted structured, redacted records. The trace sink was the server process' append-only redirected log, not an in-memory HTTP collector; records were correlated by the proxy-generated `x-perf-request-id`. No cookie, token, password, SQL parameter, or user payload was recorded.

The existing NFT warning was reproduced during both standard and profiling builds and intentionally not addressed in this pass:

```text
src/lib/storage/local-storage-provider.ts
  -> src/app/api/reports/attachments/[attachmentId]/route.ts
```

## Measurement Methodology

Each valid route/mode has ten independent Chromium samples. The primary metric is T3, not `networkidle`.

| Mark | Definition |
|---|---|
| T0 | Immediately before `page.goto()` or the real sidebar/card click. |
| T1 / TTFB | First document response, or first RSC response for client navigation, observed by Playwright. |
| T2 | First visible `h1` inside `[data-app-content]`. |
| T3 / interactive | That heading is visible and no visible page skeleton (`.animate-pulse`) or `[aria-busy="true"]` blocks the primary content. |
| T4 | `networkidle`; recorded only as supplementary information. |

The separate React render capture uses `next build --profile` with a `NEXT_PUBLIC_PERF_PROFILE=1` client-only profiler. It is used only for commit/mount evidence, never for the UX latency matrix, because React profiling itself changes runtime cost.

Percentiles use the nearest-rank method; every value below is `ms` unless stated otherwise.

## Cold Route Matrix

| Route | T1 p50/p95 | T2 p50/p95 | T3 p50/p95 | T4 p50/p95 | Result |
|---|---:|---:|---:|---:|---|
| `/` | 9/151 | 212/515 | 228/534 | 779/1,136 | Redirect route; p95 outlier |
| `/dashboard` | 20/25 | 189/214 | 206/233 | 769/817 | Pass against 1,500 ms initial-route budget |
| `/projects` | 21/22 | 189/194 | 203/213 | 793/815 | Pass |
| `/documents` | 17/20 | 146/191 | 178/205 | 778/789 | Pass |
| `/reports` | 15/17 | 121/185 | 140/203 | 729/761 | Pass |
| `/hr` | 18/21 | 134/178 | 148/193 | 751/762 | Pass |
| `/materials` | 16/20 | 130/188 | 146/202 | 699/710 | Pass |
| `/approvals` | 16/25 | 184/203 | 197/221 | 725/771 | Pass |
| `/settings` | 23/27 | 156/226 | 184/245 | 758/821 | Pass |
| `/supervision/weekly` | 20/25 | 97/116 | 315/348 | 854/885 | Warning: compatibility redirect/client stabilization |

`/supervision/weekly` resolves to the existing `/reports/weekly-inspection` UI route; the table does not invent a project id or a non-existent sidebar destination.

## Warm Route Matrix

The shell-warm sequence first makes `/dashboard` interactive, then directly navigates to the target route in the same browser context.

| Route | T3 p50/p95 | T4 p50/p95 | Result |
|---|---:|---:|---|
| `/` | 126/135 | 676/694 | Pass |
| `/dashboard` | 123/143 | 667/724 | Pass |
| `/projects` | 130/160 | 721/760 | Pass |
| `/documents` | 121/136 | 715/743 | Pass |
| `/reports` | 84/95 | 663/686 | Pass |
| `/hr` | 95/109 | 699/721 | Pass |
| `/materials` | 93/116 | 643/673 | Pass |
| `/approvals` | 121/279 | 704/849 | Warning: one tail sample |
| `/settings` | 121/155 | 702/737 | Pass |
| `/supervision/weekly` | 261/309 | 776/819 | Warning |

The roughly 640–850 ms T4 values demonstrate why `networkidle` was a misleading previous UX metric: primary UI was interactive hundreds of milliseconds earlier.

## Prefetched Route Matrix

For each sample, the browser loaded the actual source page, waited 1,500 ms for normal Next `Link` prefetch opportunity, then clicked the visible UI link. The runner waits for the target pathname before evaluating T2/T3; an earlier runner that measured the old dashboard heading was discarded and is not represented below.

| Target | T3 min | T3 p50 | T3 p95 | T3 max | Result |
|---|---:|---:|---:|---:|---|
| `/projects` | 90 | 116 | 413 | 413 | First sidebar click: warning tail |
| `/documents` | 84 | 101 | 511 | 511 | Warning tail |
| `/reports` | 67 | 77 | 113 | 113 | Pass |
| `/hr` | 66 | 87 | 924 | 924 | Warning tail |
| `/materials` | 94 | 372 | 432 | 432 | Warning |
| `/approvals` | 98 | 388 | 519 | 519 | Warning |
| `/settings` | 105 | 225 | 895 | 895 | Warning |
| `/reports/weekly-inspection` via weekly UI | 114 | 276 | 685 | 685 | Warning |

The first actual `/projects` sidebar click has **T3 p50 116 ms and p95 413 ms**. This is materially lower than the historical Phase 1 `799 ms` first-click observation, but it also shows that a 1,500 ms prefetch wait does not make every navigation consistently fast. Warm shell, cached chunks/RSC work, and database/server warmth are all present in this mode; this experiment does not attribute the gain to prefetch alone.

## Server Phase p50/p95

The following is a request-id-correlated ten-sample `/dashboard` direct-cold subset. Nested timings overlap and must not be summed as a serial timeline.

| Phase | Invocations/request | p50 | p95 | Evidence |
|---|---:|---:|---:|---|
| `proxy` | 1 | 0.35 | 0.41 | Proxy telemetry |
| `auth.get-session` | 2 | 1.72 per invocation | 2.12 per invocation | Two real calls |
| `auth.require-auth` | 1 | 1.61 | 1.98 | Server auth guard |
| `global-project-context` | 2 | 3.91 per invocation | 5.54 per invocation | Duplicate shared context work |
| `hr-permissions.any` aggregate | 1 | 4.69 | 8.15 | Seven internal permission branches remain intact |
| `app-shell` | 1 | 10.24 | 14.99 | Nested server shell work |
| `page-data.dashboard` | 1 | 14.43 | 26.87 | Dashboard data phase |
| `page.dashboard` | 1 | 20.53 | 34.69 | Dashboard server component phase |

For the same `/dashboard` samples, browser T1 is **20 ms p50 / 25 ms p95**. At the current S0 fixture volume, shared-shell duplicate work is confirmed but is not the dominant p50 end-user wait.

## Prisma p50/p95

Each correlated direct `/dashboard` request executed **43 Prisma operations**. The sum of individual operation durations is **76.17 ms p50 / 124.68 ms p95**. This is database work, not elapsed database critical-path time: several operations overlap, so it cannot be divided by T3 or added to nested server phases.

| Request-level Prisma signal | Result |
|---|---|
| Query count | 43 on every sampled `/dashboard` request |
| Slowest single query | at most 7.67 ms in the sample set |
| Repeated families | `User.findUnique` ×9; `Project.findMany` ×7; `ApprovalRequest.findMany` ×3; `SiteReport.findMany` ×5; `Project.count` ×2; `UserAccessGrant.findMany` ×7 |
| Session evidence | `getSession()` ×2 corresponds to real `User.findUnique` database operations |

The result closes the distinction between function invocation and database hit. It does **not** authorize an auth/RBAC or context-cache change in this pass.

## Root Redirect Decomposition

| Metric | `/` direct cold | `/dashboard` direct cold | Delta (`/` − `/dashboard`) |
|---|---:|---:|---:|
| T3 p50 | 228 | 206 | +22 |
| T3 p95 | 534 | 233 | +301 |
| T1 p50 | 9 | 20 | -11 |

Browser navigation timing and video capture observe exactly one HTTP redirect: `GET /` returns `307`, followed by `GET /dashboard` `200`. Root trace p50/p95 is `1.50/132.61 ms` for root session resolution and `1.63/132.89 ms` for the role redirect span. The p95 delta is driven by a root-route auth outlier, so `301 ms` is a measured tail difference, not a safe fixed saving estimate.

The redirect has business value: static/runtime inspection confirms root routing is role-dependent (including ADMIN, DIRECTOR, DEPUTY_DIRECTOR and lower operational roles), not an Admin-only shortcut. No redirect bypass was implemented or proposed as behavior-preserving without a role matrix.

## Flicker Video Timeline

An authenticated Chromium context recorded a video and DOM/network timeline from before navigation to `http://127.0.0.1:3001/` through stable dashboard UI. The raw video/frames are QA artifacts and intentionally excluded from version control; the timeline below is derived directly from the capture.

| Elapsed time | Observed state |
|---:|---|
| 0 | Navigation starts at `/`. |
| 17 | `GET /` document response: `307`. |
| 33 | `GET /dashboard` document response: `200`. |
| 36 | URL is `/dashboard`; shell remains present. |
| 57 | Dashboard loading skeleton becomes visible inside the stable shell. |
| 135 | Dashboard heading appears and visible skeleton is gone. |
| 246 | Runner's stable condition is met. |

The first captured frame (3 ms) shows the dark sidebar/header shell and the dashboard skeleton; the next (204 ms) shows dashboard content. There is no shell disappearance/reappearance in the DOM sequence.

### Navigation Type Evidence

| Hypothesis | Result | Evidence |
|---|---|---|
| A. Browser document reload loop / repeated F5 | **NO** | One document redirect chain only (`/` 307 → `/dashboard` 200); no later document request. |
| B. HTTP redirect transition | **YES** | `PerformanceNavigationTiming.redirectCount = 1` and the two document responses above. |
| C. Separate client RSC transition during initial load | **NO observed** | Initial load is an HTTP document redirect followed by dashboard response; no separate client-initiated RSC navigation was captured. |
| D. Suspense/loading replacement | **YES** | Visible loading skeleton at 57 ms is replaced by dashboard content at 135 ms. |
| E. Client remount | **NO observed** | Shell stays mounted in DOM; profiling capture below finds a sidebar mount only at initial load and zero sidebar mounts on navigation. |

Therefore the verified production-local initial "flicker" is **B + D: one role-aware HTTP redirect followed by a dashboard loading/skeleton-to-content swap**. It is not a browser hard-reload loop. Font/CSS flash was not observed in the video.

## React Profile

The production profiling build records the following representative commits. These are component render costs, not server component executions.

| Flow / boundary | Commits | Mounts | Updates | Total actual duration | Maximum commit duration |
|---|---:|---:|---:|---:|---:|
| `/dashboard` `AppShell` | 7 | 1 | 6 | 58.60 | 33.50 |
| `/dashboard` `Sidebar` | 1 | 1 | 0 | 11.50 | 11.50 |
| `/dashboard` `Header` | 2 | 1 | 1 | 18.00 | 18.00 |
| `/dashboard` `ToastProvider` | 7 | 1 | 6 | 61.30 | 36.00 |
| `/dashboard` `GlobalOverlayProvider` | 7 | 1 | 6 | 61.60 | 36.30 |
| Sidebar click `/projects` `AppShell` | 5 | 0 | 5 | 13.60 | 8.70 |
| Sidebar click `/projects` `Sidebar` | 2 | 0 | 2 | 1.10 | 1.00 |
| Sidebar click `/projects` `Header` | 2 | 0 | 2 | 1.20 | 1.10 |

There are updates, but the measured navigation does not remount the shell, sidebar, header, toast provider, or overlay provider. The `Profiler` wrapper is compiled out unless the explicit `NEXT_PUBLIC_PERF_PROFILE=1` profiling build is made.

## Chrome Main Thread and Web Vitals

A Chrome DevTools trace was captured separately with the normal production build.

| Flow | Stable time | EvaluateScript | FunctionCall | Style update | Layout | Paint | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/dashboard` direct cold | 245.12 | 27.24 | 57.24 | 5.90 | 58.60 | 3.76 | 0 |
| `/projects` sidebar click | 60.66 click-to-stable | 29.01* | 53.78* | 4.58* | 59.67* | 3.07* | 0 |

`*` The sidebar trace contains the preceding dashboard load, so only its explicit `60.66 ms` click-to-stable duration is attributed to the click. Chrome trace event totals are overlapping categories and are not additive.

For the ten direct-cold `/dashboard` UX samples: LCP is **168 ms p50 / 232 ms p95**, CLS is **0.00 p50 / 0.00 p95**, and 4 long tasks were observed across all samples (p50 0; p95 one task). No repeated task over 100 ms was captured. Browser console capture across the representative production-local matrix has **0 errors and 0 warnings**; specifically, **HYDRATION MISMATCH NOT OBSERVED**. The Event Timing observer did not produce a representative INP value for these synthetic route clicks, so INP remains unverified. The measured delay is navigation latency, not evidence of a slow click handler.

## Performance Accounting

`/dashboard` direct-cold p50 T3 is 206 ms. T1 occurs at 20 ms, leaving approximately **187 ms (90%) of post-first-byte completion** before primary UI is stable. This remainder can include streamed RSC, route chunks, hydration, JavaScript execution, layout, render, paint, and loading-boundary completion; it is not a claim that every millisecond is client CPU or JavaScript.

| Layer | p50 ms | Share of T3 | Interpretation |
|---|---:|---:|---|
| First response / server wait (T0→T1) | 20 | 10% | Includes proxy, auth, AppShell and initial server response. |
| Post-first-byte completion (T1→T3) | 187 | 90% | Mixed streamed RSC/chunk/hydration/render/paint/loading-boundary completion; not additive client CPU. |
| AppShell server span | 10.24 | Nested | Not additive; contained in request processing. |
| GlobalProjectContext span | 3.91 ×2 | Nested | Confirmed duplicate work, current S0 p50 small. |
| HR permission aggregate | 4.69 | Nested | Security work retained. |
| Prisma summed work | 76.17 | Overlapped | High multiplicity; not wall-clock latency. |
| Unexplained | Not isolated | — | No independent network/CPU bottleneck was observed at p50; sub-phase overlap prevents an exact additive total. |

This accounts for the user-visible wait without falsely adding nested server spans or concurrent Prisma operations.

## Root Cause Re-Ranking

| Rank | Cause | Measured user-visible cost | Confidence | Classification |
|---:|---|---:|---|---|
| 1 | Root HTTP redirect plus dashboard loading-boundary swap | `/` adds 22 ms p50 to `/dashboard`; skeleton visible for ~78 ms in captured root flow | Confirmed | Initial visual flicker |
| 2 | Post-first-byte completion | 187 ms p50 / 208 ms p95 on direct `/dashboard` | High | Main contributor to current T3; mixed layers, not labeled client CPU without a trace |
| 3 | Warm/prefetch navigation tails | `/projects` first-click p95 413 ms; multiple major routes have 383–924 ms p95 tails | Confirmed | User-visible navigation variability |
| 4 | Duplicate Auth/GPC/RBAC/Prisma work | 43 ops/request; two sessions and two contexts; AppShell 10/15 ms | Confirmed | Scale and tail-risk, not current S0 p50 leader |
| 5 | `/supervision/weekly` compatibility path | 315/348 ms direct T3 | Confirmed | Route-specific UX issue |
| 6 | Hydration mismatch, hard-reload loop, long main-thread task | Not observed in representative production flows | High negative evidence | Not a current primary cause |

## Remediation ROI (No Fix Implemented)

| Candidate | Measured ceiling / evidence | Risk | Priority |
|---|---|---|---|
| Stabilize the root/dashboard loading presentation without hiding work | Captured skeleton/content visual window is ~78 ms; can remove the verified visual swap, not necessarily reduce T3 | Medium: must preserve route loading semantics | P0 visual UX |
| Revisit role-aware root entry only after role matrix | Direct root p50 ceiling is 22 ms; p95 delta 301 ms is outlier-influenced | High: default role routing/security | P1 evidence-led |
| Investigate warm/prefetch tail routes individually | `/projects` p95 413 ms; HR p95 924 ms; settings p95 895 ms | Medium | P1 UX latency |
| Decompose/deduplicate AppShell/Auth/GPC after security matrix | Current p50 ceiling is low tens of ms, but 43 Prisma ops/request scales linearly with traffic | High: RBAC/project isolation | P1 scale protection |
| Address weekly compatibility route | Direct route T3 315/348 ms | Medium | P2 route-specific |

The first recommended remediation is the **smallest verified visual surface: the root/dashboard loading-boundary presentation**, with an expected measured ceiling of roughly the captured **78 ms visual-swap window**. It should be measured separately from any redirect, AppShell, auth, cache, or query change. No remediation is included in this pass.

## Exit Gate

| Required answer | Result |
|---|---|
| Production `/dashboard` cold p50/p95 interactive | **206 / 233 ms** |
| Production `/projects` first click p50/p95 interactive | **116 / 413 ms** |
| Root redirect overhead | **+22 ms p50; +301 ms p95 outlier-influenced** |
| AppShell p50/p95 | **10.24 / 14.99 ms** |
| GlobalProjectContext p50/p95 | **3.91 / 5.54 ms per invocation; two invocations/request** |
| HR permission p50/p95 | **4.69 / 8.15 ms** |
| Prisma total/request p50/p95 | **43 operations; 76.17 / 124.68 ms summed operation work** |
| Browser/client contribution | **~187 ms / 90% of `/dashboard` p50 T3 after T1** |
| Initial root hard reload | **No reload loop; one HTTP redirect** |
| Flicker classification | **HTTP redirect + loading/Suspense swap; no client remount observed** |
| Highest-ROI first fix | **Root/dashboard loading presentation; visual ceiling ~78 ms** |

## Phase 2A.1 Verdict

**CONDITIONAL GO — evidence closure only.** The production-local latency and flicker blockers for the representative Admin flow are now measured. No business remediation, auth/RBAC change, cache, index, redirect change, query rewrite, component split, or `router.refresh()` change was made. The system is not cleared for an auth/RBAC remediation until the existing role/project-isolation regression matrix is available; high-volume scaling and route-tail work also remain open.

---

# Phase 2B — Visual Stability & Tail Latency

## Current Verdict Reconciliation

**CONDITIONAL GO FOR CONTROLLED REMEDIATION. NOT YET SCALE-READY.**

The historical Phase 2 request-scoped context-cache candidate remains **BLOCKED**: it changed work count but did not prove an end-user improvement and was rolled back. Phase 2A.1 then supplied sufficient production-local evidence for a deliberately narrow visual remediation. This phase retained that visual remediation, rejected one tail candidate, and did not change Auth/RBAC, project isolation, session caching, `force-dynamic`, redirects, database queries, indexes, or broad navigation architecture.

## Terminology Correction

`T1 → T3` is called **post-first-byte completion** throughout Phase 2B. It can contain streamed RSC work, route chunks, hydration, JavaScript execution, layout, render, paint, and loading-boundary completion. A subpart is called client CPU or render cost only when an appropriate trace proves it.

## Statistical Methodology

Visual measurements use 20 independent fresh authenticated contexts for `/` and `/dashboard`. Tail measurements use 30 independent fresh contexts per route and click condition, with a real UI click after the source route is interactive:

| Condition | Click timing |
|---|---|
| Fast click | 200 ms after source route becomes interactive |
| Normal click | 1,000 ms after source route becomes interactive |
| Prefetched click | 1,500 ms after source route becomes interactive |

The tail matrix has 30 samples per condition, not 50. It satisfies the minimum requested sample size. Percentiles use nearest-rank: at `n=30`, p95 is the 29th ordered value, so p90/p95 below are **30-run tail signals**, not a stable production percentile claim.

Every target navigation records browser response timing, RSC response request IDs, RSC resource counts, long-task observations, console errors/warnings, and—when an RSC request is emitted—server proxy/phase/Prisma telemetry. Background `Link` prefetch is intentionally retained in the observed flow because it is user-facing application behavior.

## Visual Fix Candidate

### Boundary dependency tree

```text
GET / → role-aware 307 → /dashboard
  → src/app/(dashboard)/layout.tsx → AppShell
  → src/app/(dashboard)/dashboard/loading.tsx
  → DashboardPage → ExecutiveDashboard
```

The confirmed fallback is the dashboard route's `loading.tsx`, not the role-aware root redirect. The placeholder existed for about 76–78 ms at p50. It has a structural layout aligned with the dashboard, but every block used Tailwind `animate-pulse`.

Candidates considered:

| Candidate | Decision | Reason |
|---|---|---|
| Structural placeholder | Already present | Geometry was already stable; no layout-shift evidence. |
| Non-animated placeholder | **Retained** | Removes the verified pulse animation while preserving loading geometry and semantics. |
| Delayed indicator | Rejected | Would require client timing/state machinery and could hide or delay valid loading work. |
| Preserve previous content | Not applicable on direct initial entry | There is no previous route content without risking a stale-data illusion. |

The retained change is confined to `src/app/(dashboard)/dashboard/loading.tsx`: it removes `animate-pulse` and adds `data-dashboard-loading` solely for deterministic QA observation. It neither changes data fetches nor delays content.

## Visual Before/After

| Route | Build | T1 p50 | T2 p50 | T3 p50 | Loading visible p50 | CLS p50 | Console events | Shell removals |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | Before | 12 | 242 | 258 | 76.4 animated | 0.00 | 0 | 0 |
| `/` | After | 10 | 233 | 249 | 77.6 static | 0.00 | 0 | 0 |
| `/dashboard` | Before | 30 | 222 | 243 | 77.6 animated | 0.00 | 0 | 0 |
| `/dashboard` | After | 20 | 215 | 231 | 79.4 static | 0.00 | 0 | 0 |

The root video after the change still shows the correct one-document redirect chain and then `shell → static placeholder → content`; it shows no browser reload loop, shell disappearance, or console warning. The placeholder's lifetime did not need to be extended; only the visible pulse was removed.

Visual acceptance: **PASS**. T3 did not regress (root -3.7%; dashboard -5.1% in these separate 20-run samples), CLS remains zero, and no hydration warning or shell remount was observed. This is a visual-stability result, not a claim of a large latency-speed improvement.

## 50-Run Tail Matrix

The requested section name is retained for continuity; the completed, valid matrix is the 30-run minimum described above. Values are T3 interactive `p50 / p95` in `ms`.

| Route | Fast click | Normal click | Prefetched click | Notes |
|---|---:|---:|---:|---|
| `/projects` | 110 / 414 | 112 / 132 | 108 / 399 | Fast/prefetch tail signal; normal condition stable. |
| `/documents` | 79 / 417 | 83 / 95 | 89 / 122 | Normal/prefetched stable. |
| `/hr` | 61 / 82 | 61 / 92 | 76 / 262 | One fast max 841 ms; correlated below. |
| `/materials` | 87 / 362 | 94 / 409 | 360 / 389 | One fast max 1,059 ms; one normal max 879 ms. |
| `/approvals` | 95 / 114 | 81 / 378 | 81 / 369 | Bimodal normal/prefetch completion, no sample ≥500 ms. |
| `/settings` | 368 / 511 | 84 / 837 | 78 / 479 | Five samples ≥500 ms; highest repeatable tail signal. |
| `/reports/weekly-inspection` via weekly UI | 74 / 88 | 78 / 98 | 74 / 88 | Compatibility UI flow stable. |

Selected normal-click distribution detail (`p50 / p75 / p90 / p95 / max`, `ms`):

| Route | Distribution |
|---|---|
| Projects | 112 / 119 / 130 / 132 / 144 |
| Documents | 83 / 90 / 93 / 95 / 124 |
| HR | 61 / 70 / 84 / 92 / 112 |
| Materials | 94 / 363 / 377 / 409 / 879 |
| Approvals | 81 / 97 / 360 / 378 / 408 |
| Settings | 84 / 360 / 378 / 837 / 853 |
| Weekly | 78 / 87 / 90 / 98 / 116 |

## Slow Sample Correlation

### HR fast click — 841 ms

The initial `/hr` RSC response began at 26 ms, so this is not a first-byte server wait. The browser then observed 23 RSC responses before T3, including `/hr/reports`, `/hr/project-assignments`, `/hr/organization`, repeated `/hr/employees`, `/settings`, and `/dashboard`. One 51 ms long task was observed.

The target `/hr` request (`410af940fac4`) also had 14 Prisma operations with 612.50 ms summed operation duration: three `Employee.count` calls and an `EmployeeProjectAssignment.groupBy` each took about 143 ms. The RSC response can stream its first byte before those later phases finish, which explains why T1 is low while T3 is high.

Classification: **mixed streamed server/database tail plus route/link prefetch fan-out**. It is specifically not evidence that the seven AppShell HR permission branches caused the tail.

### Settings — five samples from 511 to 868 ms

For four settings tails, the target `/settings` response began in 25–45 ms and had only three Prisma operations with 2.73–6.65 ms summed duration. Their T3 delay was 379–827 ms after the first observed byte. Response timelines show concurrent background `/dashboard` or `/dashboard/projects-status` RSC activity after the settings response; one sample had a 56 ms long task and the others had none.

Classification: **post-first-byte completion with navigation prefetch contention**. The evidence rules out settings database work as the primary cause. It does not yet isolate an individual browser scheduling/chunk/render phase, so no settings code was changed.

### Materials — 1,059 ms fast and 879 ms normal samples

The fast outlier did not receive its first observed RSC byte until 608 ms, then collected 20 RSC responses across dashboard/sidebar destinations before T3. The target materials RSC arrived at 652 ms, and a 50 ms long task occurred. The normal outlier received its target materials RSC at 45 ms with only six Prisma operations and 9.47 ms summed query duration, but remained in post-first-byte completion for 834 ms while dashboard RSC work occurred.

Classification: **global navigation prefetch fan-out / post-first-byte contention**, with one fast-click server/RSC waiting tail. The materials query path is not the confirmed dominant cause.

## Route Tail Classification

| Route | Classification | Confidence | Remediation status |
|---|---|---|---|
| Settings | Post-first-byte navigation prefetch contention | High | Measure-only; no isolated component identified yet. |
| Materials | Global prefetch contention; one fast RSC wait | High | Measure-only. |
| HR | Mixed late streamed database work and HR/global prefetch fan-out | High | Candidate tested and rolled back. |
| Projects/Documents | Fast/prefetch tail signals, normal stable | Medium | No confirmed bottleneck. |
| Approvals | Bimodal post-first-byte signal below 500 ms | Medium | No confirmed bottleneck. |
| Weekly | No tail evidence in 30-run matrix | High | No change. |

The common code evidence is the default-prefetch `Link` architecture in `src/components/layout/sidebar.tsx`, supplemented by route-local links such as HR workspace/table links. A broad prefetch change would affect many user flows and was deliberately not made in this phase.

## Retained Remediation

| Change | Before | After | Result |
|---|---|---|---|
| Static dashboard loading placeholder | 76–78 ms animated pulse fallback | Same structural fallback without `animate-pulse` | **Retained**: visual stability improved; no T3/CLS/hydration regression. |

## Rolled Back Candidates

| Candidate | Before | After | Decision |
|---|---|---|---|
| `prefetch={false}` on HR workspace tabs | HR fast p50/p95 61/82; max 841 | HR fast p50/p95 59/88; max 1,272 | **Rolled back.** It did not remove global sidebar/employee-link fan-out and worsened the worst observed fast sample. |

No Tail/Auth/RBAC/database remediation was retained.

## Security Fixture Inventory

| Role / fixture | Inventory result | Status |
|---|---|---|
| ADMIN | Existing authenticated `playwright/.auth/admin.json` | Available for this pass |
| DIRECTOR, DEPUTY_DIRECTOR, CHIEF_COMMANDER | Development seed definitions exist, including two QA project assignments for CHIEF_COMMANDER | No authenticated QA storage state verified |
| MANAGER, ENGINEER, STAFF, SUPERVISION_HEAD, CONSTRUCTION_SUPERVISOR | Role/policy definitions and some feature fixtures exist | No safe authenticated fixture verified |
| Project A vs Project B | Development seed defines QA projects | No safe non-Admin browser fixture verified |

The role/project security matrix is therefore **BLOCKED**. No users, credentials, projects, assignments, permissions, or production-like records were created or changed. No password or credential was logged in this report.

## Concurrency Probe

**BLOCKED.** The available environment is the same local database used for authenticated feature QA, without an explicitly isolated concurrency/load-test database or resource telemetry agreement. A 1/5/10/25 concurrency probe could alter timing while the matrix is in progress and has not been run. No denial-of-service-like load was sent.

## Remaining Scale Risks

The Phase 2A.1 evidence remains: `/dashboard` executes 43 Prisma operations per request, including duplicate session/context work. This phase did not deduplicate it. At 10 requests that is approximately 430 operations and at 100 requests approximately 4,300 operations before considering overlap, caching, row growth, or concurrency. It remains a scale-pressure signal, not the current S0 p50 root cause.

The tail evidence adds a separate risk: broad default Link prefetch can issue many RSC requests after a primary navigation begins. The next investigation must quantify the UX trade-off of a narrowly scoped global/sidebar prefetch policy with role/project regression coverage; it must not simply disable all prefetch everywhere.

## Next Recommended Fix

Do not make a further remediation in this pass. First create safe role/project browser fixtures and then isolate **global sidebar Link prefetch scheduling** in one controlled candidate. Measure source-route click latency, target route T3, prefetch request count, background RSC count, and permissions for Admin plus at least one scoped project role. Retain only if it reduces the confirmed Settings/Materials post-first-byte tail without regressing normal navigation.
