# WM-06/WM-07 Slice B1 ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| B1-01 | Worktree and Slice A baseline | DONE | ledger | git status/hash-object | Existing dirty worktree preserved; Slice A baseline captured. | None |
| B1-02 | Existing result/review code inspection | DONE | registry/workflow/executor | rg/Get-Content | Reused current registry, workflow and one executor. | None |
| B1-03 | Submission state and intent model | DONE | executor/effects/result-review-executor.test.ts | `npx tsx --test src/lib/work-management/tests/*result-review*.test.ts` | `B1 submission and review histories are append-only across resubmission`: immutable submission-1, appended submission-2, link and sequence proved. | None |
| B1-04 | Review decision model | DONE | executor/effects/result-review-executor.test.ts | B1 closure tests | `B1 submission and review histories are append-only across resubmission`: immutable decision-1 and appended decision-2 bound to distinct submissions. | None |
| B1-05 | Completion guard model | DONE | result-review-invariants.ts | B1 tests | Progress/blocker/handover/readiness structured guard. | None |
| B1-06 | Shared executor extension | DONE | core-task-executor.ts | Slice A+B1 tests | Four actions use existing parse/identity/transaction pipeline. | None |
| B1-07 | Executable transition policies | DONE | existing policies/workflow | B1 tests | Policy results drive all four state transitions. | None |
| B1-08 | SUBMIT behavior | DONE | executor/tests | B1 closure tests | `SUBMIT appends immutable submission and does not approve or complete`; exact payload test. | None |
| B1-09 | REQUEST_CHANGES behavior | DONE | executor/tests | B1 closure tests | `REQUEST_CHANGES records append-only review decision and preserves submission`; stale and duty tests. | None |
| B1-10 | APPROVE_RESULT behavior | DONE | executor/workflow/tests | B1 closure tests | `APPROVE_RESULT records approval without completion`: review becomes `RESULT_APPROVED`, no completion intent. | None |
| B1-11 | CONFIRM_COMPLETION behavior | DONE | executor/tests | B1 closure tests | `CONFIRM_COMPLETION completes only current approved submission with readiness`; exact concrete guard matrix. | None |
| B1-12 | Submission append-only proof | DONE | executor/tests | B1 closure tests | `B1 submission and review histories are append-only across resubmission`; `SUBMIT rollback`; `SUBMIT replay`. | None |
| B1-13 | Separation-of-duties proof | DONE | invariants/executor/tests | B1 closure tests | `B1 separation of duties requires reviewer or approver relation and does not allow privileged scope bypass`. | None |
| B1-14 | Typed effects and history intents | DONE | effects/executor/tests | B1 closure tests | `B1 effect payloads carry the exact typed action facts and no confidential preview`. | None |
| B1-15 | Transaction atomicity | DONE | ports/executor/tests | B1 closure tests | Named subtests: `SUBMIT rollback`, `REQUEST_CHANGES rollback`, `APPROVE_RESULT rollback`, `CONFIRM_COMPLETION rollback`. | None |
| B1-16 | Idempotency boundary integration | DONE | idempotency/executor/tests | B1 closure tests | Named subtests for all four replays plus `B1 replay is side-effect free and identity conflicts reject different actor company or command`. | None |
| B1-17 | Authorization test matrix | DONE | B1 tests | B1 closure tests | Exact relation conflict, missing reviewer/approver relation, and COMPANY-scope bypass denial assertions. | None |
| B1-18 | Exact state/effect/error matrix | DONE | B1 tests | B1 closure tests | 4/4 action traceability matrix in closure report; exact test names recorded. | None |
| B1-19 | No-mutation-on-denial matrix | DONE | B1 tests | B1 closure tests | `result-review guards use exact errors and do not mutate`; stale, duty, and readiness tests assert task/effects/begin unchanged. | None |
| B1-20 | Single-clock and immutability | DONE | shared executor/B1 tests | B1 closure tests | `SUBMIT REQUEST_CHANGES APPROVE_RESULT and CONFIRM_COMPLETION each use one clock instant`; named immutability subtests 4/4. | None |
| B1-21 | Slice A regression | DONE | Slice A tests | npx tsx --test core-task*.test.ts | 50 pass, 0 fail, 0 skip. | None |
| B1-22 | Registry regression | DONE | registry tests | npx tsx --test registry tests | PASS. | None |
| B1-23 | Scoped lint | DONE | changed files | npx eslint | Exit 0. | None |
| B1-24 | Scoped TypeScript | DONE | WM scope | npx tsc -p | Exit 0. | None |
| B1-25 | Global TypeScript | DONE | repository | npx tsc --noEmit | Exit 0. | None |
| B1-26 | Final audit | DONE | code/tests | closure, Slice A, registry, all-WM, lint, tsc | Closure 26/26; Slice A 50/50; registry 614/614; all WM 752/752; lint and TypeScript exit 0. | None |
| B1-27 | Final report | DONE | closure report/frozen baseline/B2 handoff | report review | Closure evidence, frozen hashes, and B2 handoff produced. | None |
