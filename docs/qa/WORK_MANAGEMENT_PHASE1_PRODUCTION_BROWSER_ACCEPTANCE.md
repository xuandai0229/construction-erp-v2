# Work Management Phase 1 Production Browser Acceptance

## Result

Production QA browser flow: **PASS**.

- Command: `npx tsx scripts/qa/work-management-main-product-phase1-production-e2e.ts`
- Server: production `npm run start -- -p 3107`, QA-only database target (masked).
- Readiness: bounded HTTP probe to `/login` passed.
- Authentication: Manager and Assignee logged in through the real login UI; their browser sessions performed authenticated requests.
- Cleanup: server process tree is runner-owned and stopped in `finally`; fixture cleanup is limited to the run manifest.

## Evidence matrix

| Step | UI/session evidence | API evidence | Persisted/reload evidence |
|---|---|---|---|
| CREATE_DRAFT | Manager opened `/tasks`, entered the real form and saw the created title after reload | `201` from create route | task list reload contains the title |
| ASSIGN | Manager browser session | canonical action route succeeded | current assignee persisted |
| ACCEPT / START / UPDATE_PROGRESS | Assignee browser session and My Tasks route | canonical actions succeeded | progress and version persisted |
| SUBMIT / REQUEST_CHANGES / SUBMIT | Assignee then Manager browser sessions | canonical actions succeeded | submission/review history persisted |
| APPROVE_RESULT / CONFIRM_COMPLETION | Manager browser session | canonical actions succeeded | final aggregate state is `COMPLETED` |
| Project switch | Manager navigated to Project B | scoped list route used | Project A title absent |
| Unauthorized direct access | Outsider browser session | action route returned `403` | no mutation asserted by final persisted count |

Exact action order: `CREATE_DRAFT`, `ASSIGN`, `ACCEPT`, `START`, `UPDATE_PROGRESS`, `SUBMIT`, `REQUEST_CHANGES`, `SUBMIT`, `APPROVE_RESULT`, `CONFIRM_COMPLETION`.

Runner output: 1 browser-flow script, 1 pass, 0 fail, 0 skipped, 20.5 seconds. Final persisted evidence: 10 action records and 43 outbox messages.
