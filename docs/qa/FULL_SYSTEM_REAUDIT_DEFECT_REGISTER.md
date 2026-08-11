# FULL SYSTEM RE-AUDIT DEFECT REGISTER

Evidence is split into runtime evidence and source evidence. No fix was applied.

| ID | Severity | Module | Route/tab | Component | Runtime evidence | Source evidence | Root cause known? | Recommended fix (report only) | Risk | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| RA-001 | P1 | Runtime/Auth | `/login` | auth login flow | Submit displayed “Không thể kết nối đến máy chủ” | API login route exists; backend availability not established | No | Restore/verify QA backend connectivity, then rerun crawl | blocks all protected QA | P1 |
| RA-002 | P1 | Hydration | protected navigation observed in dev log | root layout/body | React hydration error with body class mismatch (`antialiased` vs `antialiased antigravity-scroll-lock`) | dev log stack points to root layout boundary; exact owner not fully isolated | Partial | Reproduce in clean browser and trace scroll-lock lifecycle | hydration/runtime correctness | P1 |
| RA-003 | P2 | Coverage | all protected routes/tabs | full system | 0 protected routes and 0 tabs runtime tested | 64 page files and 26 tab surfaces statically present | Yes: auth/backend block | Provide working QA session/backend and rerun matrix | false PASS risk | P2 |
| RA-004 | P2 | Action menus | 33 static locations | UnifiedActionMenu consumers/wrappers | no menu interaction evidence | 17 concrete UnifiedActionMenu instances; 28 custom candidates | No | Runtime test first/middle/last rows and pointer gates | UX/navigation regression | P2 |
| RA-005 | P2 | RBAC/IDOR | `/users`, `/hr`, project surfaces | permission branches | no role session available | role conditions exist in source | No | Crawl ADMIN, DIRECTOR, assigned user, read-only and cross-project read scope | authorization regression | P2 |
| RA-006 | P3 | Evidence | representative screens | screenshot manifest | screenshot action blocked by browser policy | no open-menu screenshot artifact produced | Yes | Capture required representative open-menu screenshots in a permitted runtime | audit traceability | P3 |
| RA-007 | P2 | Static quality | repository-wide | ESLint | not runtime | `npm run lint` failed with 44 errors and 256 warnings; examples include `UnifiedActionMenu`, materials proposal page, HR organization tree, safety editor and reporting service | Partial | Triage lint failures after audit sign-off | build/maintainability risk | P2 |

No P0 defect was proven by this audit. P1/P2 findings above include a blocker and audit incompleteness; they are not code-fix claims.
