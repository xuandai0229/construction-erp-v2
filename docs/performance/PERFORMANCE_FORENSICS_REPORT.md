# Construction ERP V2 — Performance Forensics Report

> Phase 1 only: đo lường, quan sát và phân tích. Không có business-code fix, refactor, index, cache change hay architecture change trong cuộc điều tra này.

## 1. Executive Summary

Kết luận hiện tại: **CONDITIONAL GO** cho việc tiếp tục phát triển có kiểm soát; **NO-GO** cho việc mở rộng dữ liệu/traffic lớn trước khi xử lý các bottleneck kiến trúc đã được xác nhận.

Các phát hiện có bằng chứng mạnh nhất:

1. Toàn bộ dashboard route tree bị đặt `force-dynamic`/`revalidate = 0`, nên mỗi navigation server-render lại và chạy lại auth, global project context và page data. Evidence: `src/app/(dashboard)/layout.tsx:1-2`, `src/components/layout/app-shell.tsx:13-22`.
2. App shell dùng chung truy vấn nặng cho mọi màn hình: danh sách project, pending approvals, issue reports, read notification state; riêng sidebar còn chạy bảy phép resolve HR permission song song. Evidence: `src/lib/project-context.ts:51-70,161-210,279`; `src/lib/hr/hr-auth-guard.ts:74-89`.
3. Initial `/` có redirect auth: runtime production 1,189 ms end-to-end, browser TTFB 499 ms; dev cold run 4,534 ms và TTFB 3,437 ms. Đây là hai response/navigation stages, không phải một page render duy nhất.
4. Production build pass nhưng cảnh báo NFT tracing cho `src/lib/storage/local-storage-provider.ts` qua API attachment route: tracing có nguy cơ kéo toàn project vào server function bundle.
5. Có các hard reload và nhiều `router.refresh()` paths. Chúng giải thích được cảm giác F5 ở các context/mutation flows, nhưng chưa chứng minh được chúng tự kích hoạt ở initial `/` trong runtime admin trace. Evidence: `src/components/layout/mobile-project-context-bar.tsx:37`, `src/components/safety/safety-assessment-editor.tsx:1201`, `src/components/documents/document-workspace.tsx:921-1231`.
6. Scale risk lớn nhất là client-heavy feature surfaces và xử lý danh sách/đệ quy theo toàn dataset. Evidence: client component lớn nhất 131,312 bytes/2,868 lines; weekly list filter + slice trên toàn `rows`; weekly file service filter rồi slice; một số action load `take: 100-200`.

Chưa được xác minh trực tiếp: React render count per click, Prisma query count/duration per request, hydration mismatch, long-task duration, memory leak qua route loop và role matrix ngoài admin. Báo cáo không dùng các mục này làm “Confirmed”.

## 2. Current Symptoms

| Symptom | Runtime evidence | Assessment |
|---|---:|---|
| `/` chậm/nháy | Dev cold: 4,534 ms, TTFB 3,437 ms, final `/dashboard`; production: 1,189 ms, TTFB 499 ms, final `/dashboard` | Confirmed redirect + dynamic render path |
| Dashboard route chậm | Dev `/dashboard`: 1,277 ms; production warm: 951 ms | Confirmed server-rendered dynamic route |
| Các module chậm khác nhau | Dev `/projects` 1,807 ms, `/documents` 1,420 ms, `/reports` 1,531 ms, `/hr` 3,409 ms | Confirmed heterogeneous server/page cost |
| Click menu có latency | Production click: `/projects` 799 ms lần đầu, `/documents` 56 ms, `/reports` 58 ms, `/hr` 55 ms, `/settings` 47 ms trong cùng browser context | Confirmed first navigation cost; not every click measured |
| F5-like reload | Static hard reload/refresh paths found | High-risk code evidence; initial-load trigger unverified |

## 3. Architecture Performance Map

```text
Browser
  -> proxy (HMAC session verification on matched routes)
  -> auth cookie + getSession() -> User query
  -> (dashboard) layout -> AppShell
       -> getSession()
       -> getGlobalProjectContext()
            -> project scope
            -> accessible projects
            -> pending approvals
            -> issue reports
            -> read notifications
       -> checkUserHasAnyHrPermission()
            -> 7 permission resolutions in Promise.all
       -> Sidebar/Header/Mobile context
  -> page server component
       -> Prisma queries / server actions
  -> RSC response + client chunks
  -> hydration/client state/effects
  -> interaction/navigation
```

Root layout providers: `GlobalOverlayProvider`, `ToastProvider`, `DevelopmentCacheReset` at `src/app/layout.tsx:3-25`. Dashboard layout wraps the entire authenticated tree at `src/app/(dashboard)/layout.tsx:1-4`.

## 4. Test Environment

- Repository: `D:\construction-erp-v2`.
- Git before audit: `main...origin/main`, clean working tree.
- OS: Windows; timezone Asia/Bangkok; audit date 2026-08-10.
- Next.js 16.2.7, React/React DOM 19.2.4, Prisma/adapter 7.8.0, TypeScript 5, Webpack dev script, Turbopack production build output.
- Commands from `package.json`: `npm run dev`, `npm run build`, `npm start`, `npm run lint`.
- Browser: headless Chromium via installed Playwright, admin storage state `playwright/.auth/admin.json`.
- Database was reachable through the running Next server, but direct standalone query-count extraction was not completed; exact S0 row counts are therefore UNVERIFIED.

## 5. Development vs Production Comparison

| Metric | Development cold/warm sample | Production local sample | Interpretation |
|---|---:|---:|---|
| `/` end-to-end | 4,534 ms | 1,189 ms | Dev compilation dominates cold path; redirect remains in both |
| `/` browser TTFB | 3,437 ms | 499 ms | Dynamic auth/redirect/server response |
| `/dashboard` end-to-end | 1,277 ms | 951 ms | Production improves, but server work remains |
| `/projects` end-to-end | 1,807 ms | 821 ms | Dynamic page and shell cost |
| `/documents` end-to-end | 1,420 ms | 839 ms | Dynamic page and shell cost |
| `/reports` end-to-end | 1,531 ms | 779 ms | Dynamic page and shell cost |
| `/hr` end-to-end | 3,409 ms | 841 ms | Dev compilation significant; HR server work still heavier |
| lint/build | pass/pass | pass | Build does not prove runtime scale safety |

Build output classified 58 application routes as dynamic, 2 as static (`/_not-found`, `/login`), and showed a warning that storage filesystem tracing may include the whole project for the attachments API.

## 6. Initial Load Analysis

`src/app/page.tsx:6-7` calls `requireAuth()` and redirects to the role default route. `src/proxy.ts:65-85` also checks the session and redirects unauthenticated/auth-page combinations. For an authenticated request to `/`, the browser still follows the root-to-dashboard redirect before rendering the final page. This is the confirmed reason `/` is not a direct dashboard response.

For the admin browser trace, `/` produced 20 production requests including static chunks and final `/dashboard`; `/dashboard` produced 48 requests, `/projects` 58, `/documents` 59, `/reports` 54 and `/hr` 64. These are browser-level requests, mostly static chunks; no `/api/` request was observed for these page loads because the page data is returned through RSC/server-render paths and server actions, not client API fetches.

## 7. Navigation Analysis

Sidebar uses `next/link` (`src/components/layout/sidebar.tsx`) and the tested click transition was:

| Click target | Transition |
|---|---:|
| Công trình | 799 ms, 22 requests |
| Tài liệu | 56 ms, 1 request |
| Báo cáo | 58 ms, 2 requests |
| Quản lý nhân sự | 55 ms, 1 request |
| Cài đặt | 47 ms, 1 request |

The first transition is materially slower; later transitions benefit from the already loaded shell/chunks and Link prefetch. This does not prove all user clicks are slow, but it confirms a cold route transition can be visibly delayed.

Every dashboard navigation re-enters a `force-dynamic` layout. `AppShell` awaits session, project context and HR permission before emitting the shell, so a route transition cannot be considered ready until shared shell work completes.

## 8. React Render Analysis

Exact React render counts were not captured; no React Profiler instrumentation was added. Status: **UNVERIFIED**.

Static risk evidence:

- 162 files contain `use client` (including large workspaces, tables, editors and shell controls).
- Root providers are client components. `GlobalOverlayProvider` owns route-change state and global key listener (`src/components/ui/global-overlay-manager.tsx:43-136`); `ToastProvider` creates a new `value` object each render (`src/components/ui/toast-context.tsx:23-70`).
- `GlobalOverlayProvider` runs a pathname effect that updates its state on route changes and dispatches global close events.
- `useClickOutside` and overlay hooks attach document/window listeners while overlays are open; listener cleanup exists, but render frequency was not profiled.

These are render-propagation risks, not runtime-confirmed render counts.

## 9. Authentication / RBAC Analysis

`proxy.ts:19-57` performs HMAC verification for every matched request. It is cryptographic work but measured proxy time was only 4–9 ms in dev server logs for tested page requests; therefore proxy verification is not the primary measured bottleneck.

`getSession()` performs a Prisma `User.findUnique` and checks credential version (`src/lib/auth.ts:20-52`). The dashboard page calls `requireAuth()` (`src/app/(dashboard)/dashboard/page.tsx:15`), while `AppShell` calls `getSession()` again (`src/components/layout/app-shell.tsx:13`). This is confirmed auth-check duplication at the request boundary, although Next/React request memoization may reduce actual DB duplication; query count is not instrumented.

`checkUserHasAnyHrPermission()` resolves seven permission codes with `Promise.all` (`src/lib/hr/hr-auth-guard.ts:74-89`). This is parallel rather than sequential, but it is still seven authorization-resolution branches on every AppShell render. Security checks must not be removed; the finding is duplication/scope, not a recommendation to weaken authorization.

## 10. Server Component Analysis

All dashboard routes are dynamic. The dashboard page has a sequential dependency chain:

```text
requireAuth -> getGlobalProjectContext -> getDashboardData -> render
```

Evidence: `src/app/(dashboard)/dashboard/page.tsx:15-25`.

`getGlobalProjectContext()` itself has sequential phases: resolve access scope, list accessible projects, optionally fetch selected-project overview, fetch approvals, fetch issue reports, then fetch read notification rows (`src/lib/project-context.ts:51-279`). Some phases are logically independent, but current code does not show a common parallel boundary around the whole context computation. This is a **High-confidence architecture risk**; exact query timings remain unverified.

## 11. Client Component Cost Map

Largest client files by source size:

| Component | Bytes | Lines | Risk |
|---|---:|---:|---|
| `src/components/documents/document-workspace.tsx` | 131,312 | 2,868 | High |
| `src/components/users/user-management-client.tsx` | 91,250 | 1,821 | High |
| `src/components/field-progress/daily-entry-table.tsx` | 60,932 | 1,222 | High |
| `src/app/(dashboard)/approvals/components/approval-center-client.tsx` | 58,425 | 1,177 | High |
| `src/components/field-progress/master-table.tsx` | 54,501 | 959 | High |
| `src/components/supervision-weekly/weekly-list-client.tsx` | 53,876 | 1,209 | High |
| `src/components/safety/safety-assessment-editor.tsx` | 53,412 | 1,236 | High |

These files are not all loaded on initial dashboard, but they make route-level JS and interaction cost high when their route is entered. No dynamic import was found in the scanned source for these feature surfaces.

## 12. Request Waterfall

Confirmed sequence at dashboard page level: auth must complete before context; context must complete before dashboard data (`src/app/(dashboard)/dashboard/page.tsx:15-25`). This is a server-side dependency waterfall.

Shared shell work includes project and notification queries even on routes whose primary content may not need every item (`src/components/layout/app-shell.tsx:20-21`, `src/lib/project-context.ts:70,161,200,279`). Client API waterfalls were not observed for tested initial loads; data is primarily RSC/server action based.

## 13. Database / Prisma Analysis

Confirmed static findings:

- `getSession()` performs a user lookup per call (`src/lib/auth.ts:20-52`).
- `getGlobalProjectContext()` reads up to 50 accessible projects, then approvals up to 5 and issue reports up to 20 (`src/lib/project-context.ts:70-90,161-210`).
- Projects page performs five concurrent counts plus a paged list (`src/app/(dashboard)/projects/page.tsx:63-77`). This is parallel but still five count operations per page request.
- Documents have multiple paged lists/counts and separate ancestor/folder/file queries (`src/app/(dashboard)/documents/[projectId]/page.tsx:54-177`).
- The schema has extensive single-column indexes, but query-plan verification was not run; no index change is proposed.

Potential scale risks:

- Offset pagination is used broadly (`skip` + `take`) in project, report, HR and document flows.
- `supervision-weekly` server actions cap several loads at 100–200 rows, while `weekly-list-client.tsx:351-401` filters and slices the full `rows` array in the browser.
- `weekly-file-service.ts:230-254` filters in memory and then slices, and `:417,445` searches nested arrays with `.find()`.

N+1 and actual query durations are **UNVERIFIED** because Prisma query logging/DB trace was not enabled.

## 14. Bundle Analysis

Production `.next/static/chunks` contains large emitted assets, including JS chunks of 299,090, 227,651, 177,256 and 173,605 bytes, and a CSS chunk of 191,959 bytes. These are raw emitted bytes, not compressed transfer bytes.

The source imports `lucide-react` across shell and many feature components. `exceljs` and `docx` appear in export/report code; a server-only import was not proven to enter the initial client bundle. No `next/dynamic` split was found in the scanned route/component code. Exact per-route compressed JS transfer and parse/execute cost is **UNVERIFIED**.

Build warning: `src/lib/storage/local-storage-provider.ts` is in the import trace for `src/app/api/reports/attachments/[attachmentId]/route.ts`, and Turbopack reported that a whole-project trace may have been unintentionally included. This is a confirmed build artifact warning and a P1 server bundle/deployment risk.

## 15. Browser Main Thread

The browser trace collected DOM counts but did not expose long-task entries (`performance.getEntriesByType('longtask')` was not recorded in the final run) and no CPU profile was captured. Status: **UNVERIFIED**.

Static risk: large client workspaces, tables, inline row menus, date formatting and in-memory filtering exist. The heaviest source is the documents workspace at 2,868 lines and 131 KB.

## 16. Hydration Analysis

The tested production/admin routes emitted no browser console errors in the captured samples. This is evidence against an immediately visible hydration error on those routes, not proof across all routes.

Potential mismatch sources found statically include client-only `window`/`localStorage`/responsive checks and time-based initialization in client components. A browser console warning inventory across all 59 pages was not completed. Status: **UNVERIFIED**, not P0-confirmed.

## 17. Loading / Suspense Analysis

Inventory: 12 `loading.tsx` files, 11 `error.tsx` files and route-level loading/skeleton components. The root app itself has no `loading.tsx`, while dashboard module groups do.

The source contains `animate-pulse`, `animate-in`, `transition-all` and route-level skeletons. The report cannot attribute perceived delay to animation without a trace of transition timing. Artificial UX latency is therefore **UNVERIFIED**.

## 18. Route Performance Matrix

Admin role, production local, headless Chromium. `Requests` includes browser static/RSC requests; API column was zero for initial page loads because the app used RSC/server actions.

| Route | Role | Initial Load | Requests | DB Queries | JS/DOM | Status |
|---|---|---:|---:|---:|---:|---|
| `/` -> `/dashboard` | ADMIN | 1,189 ms | 20 | Unverified | 1,054 DOM | WARNING |
| `/dashboard` | ADMIN | 951 ms | 48 | Unverified | 664 DOM | WARNING |
| `/projects` | ADMIN | 821 ms | 58 | Unverified | 1,112 DOM | WARNING |
| `/documents` | ADMIN | 839 ms | 59 | Unverified | 906 DOM | WARNING |
| `/reports` | ADMIN | 779 ms | 54 | Unverified | 327 DOM | WARNING |
| `/hr` | ADMIN | 841 ms | 64 | Unverified | 394 DOM | WARNING |
| `/materials` | ADMIN | Not run | — | — | — | BLOCKED |
| `/approvals` | ADMIN | Not run | — | — | — | BLOCKED |
| `/users` | ADMIN | Not run | — | — | — | BLOCKED |
| `/settings` | ADMIN | Not run | — | — | — | BLOCKED |
| `/reports/safety` | ADMIN | Not run | — | — | — | BLOCKED |
| `/supervision/weekly` | ADMIN | Not run | — | — | — | BLOCKED |

Static inventory covers 59 page routes, 23 API route handlers, 4 layouts, 12 loading boundaries and 11 error boundaries. The remaining route families are listed by build output in Section 27; they are not marked PASS without runtime evidence.

## 19. Role Performance Matrix

Schema roles: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, `MANAGER`, `ENGINEER`, `STAFF`, `SUPERVISION_HEAD`, `CONSTRUCTION_SUPERVISOR` (`prisma/schema.prisma:11-21`).

| Role | Sidebar/query path | Runtime measured | Status |
|---|---|---|---|
| ADMIN | Tested; company-wide dashboard and HR permission resolution | Yes | WARNING |
| DIRECTOR | Role exists; route/session state not loaded in test | No | BLOCKED |
| DEPUTY_DIRECTOR | Role exists; route/session state not loaded in test | No | BLOCKED |
| CHIEF_COMMANDER | Project-scoped behavior exists | No | BLOCKED |
| MANAGER | Project/HR scope behavior exists | No | BLOCKED |
| ENGINEER | Project-scoped behavior exists | No | BLOCKED |
| STAFF | Project-scoped behavior exists | No | BLOCKED |
| SUPERVISION_HEAD | Supervision scope queries exist | No | BLOCKED |
| CONSTRUCTION_SUPERVISOR | Operational read scope exists | No | BLOCKED |

No security check is recommended for removal. Non-admin role performance must be measured with valid role fixtures before a release gate.

## 20. Scalability Analysis

| Scale | Main risk | Evidence | Forecast |
|---|---|---|---|
| S0 current | Shared shell overhead independent of page | AppShell + project context + HR permissions | Already visible |
| S1: 100 users/20 projects/10k records | Context lists, counts, offset pages, client filtering | `take:50`, repeated counts, client `filter/slice` | Warning |
| S2: 500 users/100 projects/100k records | Report/document/history volume and offset scans | report/document pagination and nested includes | High |
| S3: 2k users/500 projects/1m records | Audit/history, document lists, in-memory weekly aggregation, concurrent users | no query-plan/load test evidence; several in-memory phases | Fail risk |

Expected first failures by growth factor:

- 10x: shared project context and count-heavy pages; larger client tables.
- 100x: document/report/weekly list payloads and offset pagination; browser filtering/sorting.
- 1000x: audit/history and high-cardinality relational queries, connection/query concurrency, and any unbounded in-memory aggregation.

## 21. Root Cause Ranking

| Rank | Root Cause | Severity | Evidence | System Impact | Scale Risk | Confidence |
|---:|---|---|---|---|---|---|
| 1 | Authenticated dashboard tree is fully dynamic and shared shell blocks every route | P0 Critical | `src/app/(dashboard)/layout.tsx:1-2`; production timings; AppShell awaits | Repeated server work on every route transition | 10x–1000x | Confirmed |
| 2 | Global project context performs broad shared queries before page render | P1 High | `src/lib/project-context.ts:51-279`; dashboard sequence | Adds latency to unrelated screens | 10x–1000x | High |
| 3 | Auth/RBAC resolution repeated at proxy, page, shell and HR permission layer | P1 High | `src/proxy.ts:19-65`; `src/lib/auth.ts:20`; `AppShell:13-21`; HR guard | Adds fixed per-request work and DB pressure | 10x concurrent users | High |
| 4 | Hard reload/refresh paths create F5-like UX after context or mutations | P0 Critical when triggered | `mobile-project-context-bar.tsx:37`; safety editor `:1201`; many refresh calls | Full document reload or RSC refresh; visible flicker | All scales | High code evidence; runtime trigger unverified |
| 5 | Client-heavy monolithic workspaces/tables | P1 High | 131 KB/2,868-line document workspace; 162 client files; bundle sizes | JS parse/render/interaction cost | 100x records | High |
| 6 | In-memory filter/slice and bounded-but-large data loads | P1 High | weekly list `:351-401`; weekly service `:230-254`; actions `take:100-200` | CPU/memory and payload growth | 100x–1000x | High |
| 7 | NFT tracing may include whole project in attachment API bundle | P1 High | production build warning import trace | Deployment/serverless cold start and bundle size | Traffic/cold starts | Confirmed build warning |
| 8 | Hydration/animation/Strict Mode as primary cause | P2 | No console errors in sample; no profiler | Could amplify flicker if found | Unknown | Hypothesis / Unverified |

## 22. Performance Baseline

Measured:

- Initial response/navigation: `/` production 1,189 ms; `/dashboard` 951 ms; representative modules 779–841 ms.
- TTFB: `/` 499 ms; warm module pages 19–45 ms except `/` redirect.
- FCP: `/dashboard` 308 ms, `/projects` 132 ms, `/documents` 92 ms, `/reports` 100 ms, `/hr` 84 ms in production browser samples.
- Browser request count: 20–64 by representative route.
- DOM count: 327–1,112 elements on representative pages.
- Dev server log: proxy 4–9 ms; application code 200–714 ms after compilation; Next compilation dominated first dev requests.

Not measured: CLS, INP, exact LCP, hydration duration, JS executed CPU time, compressed JS bytes per route, long-task duration, React render counts, Prisma query count/duration, memory growth and all-role timings.

## 23. Performance Budget Proposal

Targets for a production-like local/low-latency environment, measured after warm-up and p95 over 10 runs:

| Area | Excellent | Acceptable | Fail |
|---|---:|---:|---:|
| Authenticated initial route | ≤800 ms | ≤1,500 ms | >1,500 ms |
| Route transition | ≤250 ms | ≤500 ms | >500 ms |
| Simple interaction | ≤50 ms | ≤100 ms | >100 ms |
| Modal/dropdown open | ≤50 ms | ≤100 ms | >100 ms |
| Filter/search submit | ≤300 ms | ≤800 ms | >800 ms |
| Table pagination | ≤500 ms | ≤1,000 ms | >1,000 ms |
| API/server action p95 | ≤300 ms | ≤800 ms | >800 ms |
| DB single-query p95 | ≤100 ms | ≤300 ms | >300 ms |
| Long task | none >50 ms | rare ≤100 ms | repeated >100 ms |
| CLS | ≤0.05 | ≤0.10 | >0.10 |
| LCP | ≤2.0 s | ≤2.5 s | >2.5 s |

These are proposed gates, not current pass/fail claims. The current measured `/` and first `/projects` navigation exceed the acceptable transition/initial target.

## 24. Recommended Remediation Architecture

Direction only; not implemented in Phase 1:

1. Separate auth/session verification from page data and establish a request-scoped session/access context.
2. Reduce AppShell to genuinely global data; move project-specific overview/notification reads to the smallest relevant surfaces.
3. Make server data dependencies explicit and parallel where independent, while preserving security checks.
4. Replace full-page refresh/reload flows with scoped state/RSC invalidation after confirming correctness.
5. Split feature client boundaries and lazy-load editors, viewers, export UI and unopened dialogs.
6. Enforce server pagination/filter/sort with query plans and bounded projections; avoid client filtering of unbounded datasets.
7. Add Prisma query timing/request correlation and production browser tracing before changes are accepted.
8. Resolve filesystem tracing boundary for storage code before serverless scale-up.

## 25. Proposed Fix Phases

- **P0:** instrument request ID, server phase timing, Prisma query timing, browser navigation and React profiler; reproduce `/` and one click with clean browser state.
- **P1:** remove unnecessary full reload/refresh triggers after evidence confirms their triggers; preserve auth/RBAC semantics.
- **P1:** narrow shared AppShell/project context work and parallelize only independent reads.
- **P2:** split large client workspaces and lazy-load modal/editor/export surfaces.
- **P2:** verify every list with server-side pagination, select projection, query plan and volume test.
- **P3:** load-test concurrent roles and scale tiers S1–S3; set CI performance budgets and regression traces.

No phase above was implemented in this audit.

## 26. Risks

- Optimizing auth/RBAC without preserving defense-in-depth could create a security defect; this report does not recommend removing checks.
- Moving data out of the shell can change navigation/context semantics and must be tested with all roles.
- Changing pagination or cache behavior can affect document security, stale data and report correctness.
- Build tracing changes can affect storage paths and deployment packaging.
- Current role, DB query and browser-profiler evidence is incomplete; remediation decisions should not rely on unmeasured assumptions.

## 27. Final Verdict

**CONDITIONAL GO.** The system is functional and production build/lint pass. It is not performance-ready for 10x/100x/1000x growth because shared dynamic server work, broad global context reads, client-heavy feature boundaries and in-memory list processing create confirmed/high-confidence bottlenecks.

Answers to the five required questions:

1. **Why does `/` flash/load repeatedly?** Confirmed root redirect (`/` -> role default route) plus dynamic dashboard rendering. F5-like hard reload/refresh code exists and is a high-confidence contributor when those flows trigger, but its initial-load activation was not proven in the admin trace.
2. **Why do clicks feel slow?** Every authenticated dashboard route traverses a dynamic layout and waits for shared session/context/HR permission work; first navigation also loads route chunks. Production first click to `/projects` measured 799 ms.
3. **Where is the main bottleneck?** Primary: architecture/request pipeline; secondary: backend/server component shared work; then client bundle/component weight. Proxy crypto was measured at only 4–9 ms and is not the primary bottleneck. Database query duration is not yet proven as primary.
4. **Why is it slow with little data?** Fixed per-request work exists regardless of business row count: redirect, session lookup, access resolution, global project query, notifications, HR permission checks, dynamic RSC render and client chunk/hydration work.
5. **What dies first at 10x/100x/1000x?** First shared context/count and client list surfaces; next document/report/weekly filtering and offset pagination; at 1000x audit/history, relational query concurrency and unbounded in-memory aggregation.

The correct next gate is instrumentation-led Phase 2 review, not speculative optimization.

### Appendix A — Route inventory

Repository/build inventory: 59 page routes, 23 API route handlers, 4 layouts, 12 loading boundaries and 11 error boundaries. Route families include dashboard, projects and project field-progress/material requests, documents, reports/field/safety/weekly inspection, supervision weekly, materials, approvals, audit, users, settings, HR employees/organization/project assignments/reports, login, print/export and API auth/documents/reports/supervision handlers. The production build route table is the authoritative generated inventory used for this report.

### Appendix B — Audit integrity

- Git state was checked before work and was clean.
- No source file was edited.
- No migration, schema index, cache policy, UI behavior or business logic was changed.
- Generated `.next` output was rebuilt as required for the production measurement; it is build output, not a source fix.
- No temporary profiling source file was added to the repository.
