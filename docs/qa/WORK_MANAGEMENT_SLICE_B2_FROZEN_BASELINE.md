# Slice B2 Frozen Baseline

## Purpose

This baseline freezes the verified Slice A, Slice B1, and Slice B2 semantics before additive Slice C handover work. Shared files may be extended additively for registered later actions; existing Slice A/B1/B2 semantics and frozen test assertions must not change or weaken.

## Baseline hashes

| File | Hash |
|---|---|
| application/core-task-executor.ts | f1f95d5acd67fd15433d3e744ba67a8def8097e4 |
| application/core-task-effects.ts | 111e060933acabbfe0ea39a9774a211a749a8946 |
| application/core-task-idempotency.ts | fb2a0801a9f0082a46ba768c3462025ebdd97ca1 |
| application/core-task-ports.ts | 88be0e435e702dd41955a43fe14952f2f9ee1be7 |
| application/result-review-invariants.ts | 7d20301483f7f4231d2082413f04320f70cab994 |
| application/actor-policy.ts | 8cea7fbf204076abaac6607cc20200ed657643d1 |
| domain/types.ts | a65ef8a23ef235aacf752c505e56ec111fc36977 |
| domain/workflow.ts | 1abe7b582ad3086a3dfd5719b7e1809be035e0c6 |
| domain/transition-policies.ts | ed764e7df74b83bd29fc9b14854bb65387efeda6 |
| validation/schemas.ts | 4cde0500e366c8c116a6e4598c3b5e8e5605f479 |
| errors/codes.ts | 09fc5f1760cbd95984f1eb0c40ed5257fc1b540c |
| tests/core-task-executor.test.ts | 798ab34eb2e03b7d8880b353b9ba93b82da5b504 |
| tests/core-task-transition.test.ts | 4ec5672c625c4a024476e2eab40c5f1471310f10 |
| tests/core-task-idempotency-boundary.test.ts | 105667c21c1dfaa74b9934876579930e321d2022 |
| tests/result-review-executor.test.ts | 8a4217cda2a752af9b58897c9098cfefa266d9ee |
| tests/closure-lifecycle-executor.test.ts | 6406a2837557cfd4d757452f26b91a2a999ecb02 |
| tests/closure-lifecycle-verification-matrix.test.ts | 3dc86c638348801416d51809f1adc1333b3197a2 |
| tests/workflow.test.ts | 715f02bf0ce1274f142d18766e47ae6195983860 |

## Required regression

Run the Slice A, B1, B2, workflow, registry, and all Work Management test commands before accepting any future additive extension.
