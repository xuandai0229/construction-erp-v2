# WM-08/WM-09 Idempotency Ledger

| ID | Item | Status | Files | Commands | Evidence | Blocker |
|---|---|---|---|---|---|---|
| IDEM-01 | Worktree and frozen baseline | DONE | Slice C baseline | git status/diff/hash-object | Inventory reconciled; dirty worktree preserved. | None |
| IDEM-02 | Existing idempotency contract inspection | DONE | core-task-idempotency/executor/ports | Get-Content/rg | Existing port and four operations reused. | None |
| IDEM-03 | Identity equality model | DONE | core-task-idempotency | state/concurrency tests | One shared equality function compares all seven fields. | None |
| IDEM-04 | Storage-key model | DONE | in-memory-idempotency | state tests | Raw `key` is lookup key; mismatched identity conflicts. | None |
| IDEM-05 | In-memory record state model | DONE | in-memory-idempotency | state tests | Only IN_PROGRESS and COMPLETED records are stored. | None |
| IDEM-06 | Defensive cloning model | DONE | in-memory-idempotency | immutability tests | Requests, results, and replays are cloned. | None |
| IDEM-07 | inspect behavior | DONE | store/tests | state tests | PROCEED, IN_PROGRESS, REPLAY, CONFLICT covered. | None |
| IDEM-08 | begin behavior | DONE | store/tests | state/concurrency tests | Reserves empty key; denies completed/in-progress/conflicts. | None |
| IDEM-09 | complete behavior | DONE | store/transaction stage/tests | finalization tests | Completion is staged transaction-locally and published only after final business commit. | None |
| IDEM-10 | abort behavior | DONE | store/tests | state tests | Matching in-progress reservation releases; completed preserved. | None |
| IDEM-11 | Atomic reservation | DONE | store/tests | concurrency tests | Three concurrent begins yield one owner. | None |
| IDEM-12 | Exact replay | DONE | store/tests | state/executor tests | Exact identity returns cloned stored result. | None |
| IDEM-13 | Identity conflict | DONE | store/tests | concurrency tests | Each single-field mismatch is conflict. | None |
| IDEM-14 | In-progress behavior | DONE | store/tests | state tests | Same reservation reports/throws IN_PROGRESS. | None |
| IDEM-15 | Retry after abort | DONE | store/tests | state/executor tests | Aborted reservation retries with same key. | None |
| IDEM-16 | Completion ownership | DONE | store/tests | state tests | Foreign completion conflicts; missing reservation is stable error. | None |
| IDEM-17 | Abort ownership | DONE | store/tests | state tests | Foreign abort conflicts and cannot delete owner record. | None |
| IDEM-18 | Completed-record immutability | DONE | store/stage/tests | finalization tests | Staged completions discard on rollback; committed completions remain immutable. | None |
| IDEM-19 | Result immutability | DONE | store/tests | immutability tests | Dates, histories, arrays, and effects are independent clones. | None |
| IDEM-20 | Cross-actor isolation | DONE | store/tests | concurrency tests | actorId-only mismatch conflicts. | None |
| IDEM-21 | Cross-company isolation | DONE | store/tests | concurrency tests | companyId-only mismatch conflicts. | None |
| IDEM-22 | Cross-task isolation | DONE | store/tests | concurrency tests | taskId-only mismatch conflicts. | None |
| IDEM-23 | Cross-project isolation | DONE | store/tests | concurrency tests | projectId-only mismatch conflicts. | None |
| IDEM-24 | Cross-action isolation | DONE | store/tests | concurrency tests | action-only mismatch conflicts. | None |
| IDEM-25 | Cross-command fingerprint isolation | DONE | store/tests | concurrency tests | fingerprint-only mismatch conflicts. | None |
| IDEM-26 | Concurrent begin matrix | DONE | concurrency tests | tsx --test | Identical and conflicting contenders covered. | None |
| IDEM-27 | Concurrent inspect/begin matrix | DONE | state/concurrency tests | tsx --test | Reservation becomes IN_PROGRESS before subsequent inspection. | None |
| IDEM-28 | Invalid lifecycle operations | DONE | store/tests | state tests | Missing reservation and duplicate complete fail closed. | None |
| IDEM-29 | Executor integration regression | DONE | executor integration tests | tsx --test | Concrete store proves pre/post-complete failure for A/B1/B2/C. | None |
| IDEM-30 | Slice C regression | DONE | handover tests | tsx --test | 153 pass, 0 fail, 0 skipped. | None |
| IDEM-31 | Slice B2 regression | DONE | closure tests | tsx --test | 134 pass, 0 fail, 0 skipped. | None |
| IDEM-32 | Slice B1 regression | DONE | result review tests | tsx --test | 26 pass, 0 fail, 0 skipped. | None |
| IDEM-33 | Slice A regression | DONE | core task tests | tsx --test | 50 pass, 0 fail, 0 skipped. | None |
| IDEM-34 | Workflow regression | DONE | workflow tests | tsx --test | 12 pass, 0 fail, 0 skipped. | None |
| IDEM-35 | Registry regression | DONE | registry tests | tsx --test | 614 pass, 0 fail, 0 skipped. | None |
| IDEM-36 | All Work Management | DONE | all WM tests | tsx --test | Pre-finalization baseline: 1068 pass. Final frozen result: 1079 pass, 0 fail, 0 skipped. | None |
| IDEM-37 | Scoped lint | DONE | changed source/tests | eslint | Exit 0, no warnings. | None |
| IDEM-38 | Scoped TypeScript | DONE | work-management | tsc -p | Exit 0. | None |
| IDEM-39 | Global TypeScript | DONE | repository | tsc --noEmit | Exit 0. | None |
| IDEM-40 | Final audit | DONE | source/tests/docs | full regression/diff check | Post-complete failure leaves no ghost replay. | None |
| IDEM-41 | Final report | DONE | finalization report | report creation | Exact finalization traceability recorded. | None |
| IDEM-42 | Frozen baseline | DONE | WM08/09 baseline | hash-object | Transaction finalization contract and hashes recorded. | None |
| IDEM-43 | WM-08 closure | DONE | mandatory ledger | full verification | Transaction finalization gate passes. | None |
| IDEM-44 | WM-09 closure | DONE | mandatory ledger | full verification | Post-complete rollback verification passes. | None |
| IDEM-45 | Transaction finalization model | DONE | transaction stage/UoW test adapter | finalization tests | Business state/effects and replay publication finalise together. | None |
| IDEM-46 | Transaction-scoped completion staging | DONE | in-memory-idempotency-transaction | finalization tests | Executor complete call stages only; no early global replay. | None |
| IDEM-47 | Post-complete commit-failure rollback | DONE | integration tests | finalization tests | Aggregate/effects roll back and reservation releases. | None |
| IDEM-48 | Finalization ownership | DONE | stage/store/tests | finalization tests | Stage validates exact IN_PROGRESS owner before publish. | None |
| IDEM-49 | Unrelated-record isolation | DONE | finalization tests | tsx --test | Failed key does not alter other completed key. | None |
| IDEM-50 | Retry after post-complete rollback | DONE | integration tests | tsx --test | Same-key retry commits once, third call replays. | None |
| IDEM-51 | Committed-completion preservation | DONE | stage/store/tests | finalization tests | Abort does not delete committed replay. | None |
| IDEM-52 | Four-slice finalization integration | DONE | integration tests | tsx --test | CREATE_DRAFT, CONFIRM_COMPLETION, ARCHIVE, EXECUTE_HANDOVER pass. | None |
