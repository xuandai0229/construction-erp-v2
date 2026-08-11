# FULL SYSTEM RUNTIME QA MATRIX

## Runtime environment

Target: `http://127.0.0.1:3000`, Next.js 16.2.7 dev server. An existing dev server was found. A second launch attempted port 3001 and reported another dev server already running. Login page loaded, but submitting the available QA admin credentials resulted in `Không thể kết nối đến máy chủ.`

| Module | Route | Tab | Viewport | Load | Console | Network | Action menu | Pointer | Active row | Navigation | RBAC | Screenshot | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth | `/login` | — | default desktop | PASS | no route-specific error observed | login request failed/connection error | N/A | N/A | N/A | redirect surface observed | N/A | capture attempted, browser policy blocked | FAIL |
| Dashboard | `/` | — | default desktop | redirect to login | hydration evidence exists in dev log | backend unavailable after login | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | not captured | UNVERIFIED |
| All protected modules | all 62 protected page surfaces | all discovered tabs | 1920,1600,1366,1024,768,390 | NOT RUN | NOT RUN per route | NOT RUN per route | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | UNVERIFIED |

## Console evidence

Dev log contains React hydration errors: server/client body class mismatch involving `antigravity-scroll-lock`. This is a real console/hydration finding, not a static inference. Repeated warnings were observed while protected navigation was attempted in the existing dev session.

## Network evidence

Login submission displayed a connection failure. Exact request-level status matrix (404/401/403/500) could not be captured through the available browser surface. Therefore network coverage is `UNVERIFIED`, with login/backend connectivity recorded as a defect.

## Viewport and interaction coverage

No required desktop/mobile viewport was runtime verified. No tab was clicked. No action menu was opened. No pointer geometry was measured. No screenshots of open menus exist; this is an explicit coverage gap.

