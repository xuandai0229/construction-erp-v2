# Mandatory execution ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| WM-01 | Worktree baseline | DONE | `docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md` | `git status --short`<br>`git branch --show-current`<br>`git log -1 --oneline`<br>`git diff --stat`<br>`git worktree list` | Branch: `main`.<br>HEAD: `08828aa don_pate35`.<br>37 tracked files modified/deleted and 40 untracked paths at baseline; preserved without reset/clean/stash.<br>Current worktree: `D:/construction-erp-v2 08828aa [main]`. | None |
| WM-02 | Workload calculator redesign | DONE | `src/lib/work-management/domain/workload.ts`<br>`src/lib/work-management/errors/codes.ts`<br>`docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md` | `npx tsx --test src/lib/work-management/tests/workload.test.ts` (exit 0)<br>`npx tsx --test src/lib/work-management/tests/*.test.ts` (exit 0)<br>`npx eslint src/lib/work-management/domain/workload.ts src/lib/work-management/errors/codes.ts src/lib/work-management/application/action-registry.ts src/lib/work-management/events/domain-events.ts src/lib/work-management/validation/schemas.ts src/lib/work-management/tests/workload.test.ts src/lib/work-management/tests/action-registry.test.ts` (exit 0)<br>`npx tsc -p tsconfig.work-management.json` (exit 0) | Missing-estimate capacity semantics hardened: all-open missing estimates yield UNKNOWN/UNAVAILABLE and null usages.<br>Floating full-threshold tolerance added.<br>Zero-capacity policy now uses all assigned work.<br>Closed tasks bypass workload validation by policy.<br>Weighted score remains separate from capacity hours. | None |
| WM-03 | Workload detailed tests | DONE | `src/lib/work-management/tests/workload.test.ts`<br>`docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md` | `npx tsx --test src/lib/work-management/tests/workload.test.ts` (exit 0)<br>`npx tsx --test src/lib/work-management/tests/*.test.ts` (exit 0)<br>`npx tsc -p tsconfig.work-management.json` (exit 0) | Numeric validation converted to 20 actual Node subtests.<br>20 workload top-level tests + 20 subtests; pass 40, fail 0, skipped 0.<br>Semantic cases cover UNKNOWN/PARTIAL basis, floating thresholds, zero paused/blocked capacity, weighted score, exceeded warning, and closed legacy data. | None |
| WM-04 | Action registry | DONE | `src/lib/work-management/application/action-registry.ts`<br>`src/lib/work-management/application/actor-policy.ts`<br>`src/lib/work-management/domain/transition-policies.ts`<br>`src/lib/work-management/validation/schemas.ts`<br>`src/lib/work-management/permissions/contract.ts`<br>`src/lib/work-management/events/domain-events.ts`<br>`src/lib/work-management/events/activity-types.ts`<br>`src/lib/work-management/events/audit-actions.ts`<br>`src/lib/work-management/events/side-effect-map.ts` | `npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts` (exit 0)<br>`npx tsx --test src/lib/work-management/tests/*.test.ts` (exit 0)<br>`npx eslint` scoped action-registry files (exit 0)<br>`npx tsc -p tsconfig.work-management.json` (exit 0)<br>`npx tsc --noEmit` (exit 0) | CREATE_DRAFT actor policy is NOT_APPLICABLE; HANDOVER_RECEIVER and HANDOVER_SCOPE are explicit; ACCEPT/REJECT only allow receiver; EXECUTE supports internal SYSTEM or privileged scope.<br>Permission + scope + relation are modeled separately.<br>Action-specific schemas, resolved transition policies, separate event/activity/audit contracts, and archive/restore invariants are implemented. | None |
| WM-05 | Action registry completeness tests | DONE | `src/lib/work-management/tests/action-registry.test.ts`<br>`src/lib/work-management/tests/action-registry-security.test.ts`<br>`src/lib/work-management/tests/action-registry-semantics.test.ts` | `npx tsx --test src/lib/work-management/tests/action-registry.test.ts src/lib/work-management/tests/action-registry-security.test.ts src/lib/work-management/tests/action-registry-semantics.test.ts` (exit 0)<br>`npx tsx --test src/lib/work-management/tests/*.test.ts` (exit 0) | 10 semantic-registry top-level tests + 604 real Node subtests: 614 pass, 0 fail, 0 skipped.<br>Actor policy, handover receiver, schema mappings, strict malicious payload parsing, independent expectations, transition resolver, event/activity/audit, and fail-closed tests pass. | None |
| WM-06 | Action-specific behavior | PENDING | shared executor/effects and result-review invariants | B1 closure commands (exit 0) | Slice A DONE. Slice B1 Closure Verification Gate DONE for SUBMIT, REQUEST_CHANGES, APPROVE_RESULT and CONFIRM_COMPLETION.<br>Remaining: Slice B2 REOPEN/CANCEL/ARCHIVE/RESTORE; Slice C handover actions. | None |
| WM-07 | Action behavior tests | PENDING | Slice A and result-review tests | `npx tsx --test src/lib/work-management/tests/*.test.ts` (exit 0) | Slice A tests DONE. Slice B1 closure matrices DONE: exact state/effect/error/no-mutation/rollback/replay/immutability.<br>Remaining: Slice B2 tests; Slice C tests. | None |
| WM-08 | Idempotency in-memory behavior | PENDING | | | | |
| WM-09 | Idempotency tests | PENDING | | | | |
| WM-10 | Assignment source of truth | PENDING | | | | |
| WM-11 | Assignment-history aggregate | PENDING | | | | |
| WM-12 | Assignment-history tests | PENDING | | | | |
| WM-13 | Outbox behavior mapping | PENDING | | | | |
| WM-14 | Outbox tests | PENDING | | | | |
| WM-15 | ResponsibilityAssignment behavior | PENDING | | | | |
| WM-16 | ResponsibilityAssignment tests | PENDING | | | | |
| WM-17 | Delegation behavior | PENDING | | | | |
| WM-18 | Delegation tests | PENDING | | | | |
| WM-19 | Collaboration behavior | PENDING | | | | |
| WM-20 | Collaboration tests | PENDING | | | | |
| WM-21 | Mass-assignment protection | PENDING | | | | |
| WM-22 | Mass-assignment tests | PENDING | | | | |
| WM-23 | Scoped lint | PENDING | | | | |
| WM-24 | Scoped TypeScript | PENDING | | | | |
| WM-25 | Global TypeScript | PENDING | | | | |
| WM-26 | Prisma validate/generate | PENDING | | | | |
| WM-27 | Isolated production build | PENDING | | | | |
| WM-28 | Final completeness audit | PENDING | | | | |
| WM-29 | Final implementation report | PENDING | | | | |
