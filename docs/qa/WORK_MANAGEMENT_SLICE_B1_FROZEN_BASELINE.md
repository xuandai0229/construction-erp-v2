# Work Management Slice B1 frozen baseline

Slice B1 closure gate is frozen after the regression commands recorded in the closure report.

Frozen application/test files: **15**.

| File | Final hash | Purpose | Allowed future changes | Required regression |
|---|---|---|---|---|
| `application/core-task-executor.ts` | `abda3c6e9fabca8d96cb9dfe7952785a0cc9766c` | Shared execution and B1 behavior | May be extended additively for Slice B2/C through the existing shared pipeline. Must not alter Slice A/B1 behavior. | B1, Slice A, registry, all WM |
| `application/core-task-effects.ts` | `9c23e0e52bf254ef714c887066ef591a48c95442` | Typed effect envelopes | May add typed intents/payloads for later actions. Must not weaken or rename existing Slice A/B1 contracts. | B1, Slice A, registry, all WM |
| `application/core-task-idempotency.ts` | `fb2a0801a9f0082a46ba768c3462025ebdd97ca1` | Shared idempotency boundary | May add later-action compatibility. Must preserve normalized identity, fingerprint, replay, conflict, in-progress, begin/complete/abort semantics. | B1, Slice A, registry, all WM |
| `application/core-task-ports.ts` | `88be0e435e702dd41955a43fe14952f2f9ee1be7` | Ports and transaction boundary | May add transaction-scoped ports or typed stores for later actions. Must preserve atomicity and compatibility with existing actions. | B1, Slice A, registry, all WM |
| `application/result-review-invariants.ts` | `7d20301483f7f4231d2082413f04320f70cab994` | Review/completion invariants | Defect-only change | B1 tests |
| `domain/types.ts` | `c5992bd9b29ffad66dbb62e7b0cdb6d5be841d75` | Shared lifecycle, review, submission, completion and task-state contracts | May be extended additively for Slice B2/C state projections and typed fields. Must not weaken existing Slice A/B1 state unions, reinterpret lifecycle/review meanings, remove submission projections or completion metadata, collapse independent state axes, or change APPROVE_RESULT/CONFIRM_COMPLETION semantics. | Workflow, Slice A, B1, registry, all WM, scoped TypeScript, global TypeScript |
| `domain/transition-policies.ts` | `06adb0da841156ad1d6614708f8b617b70f4478b` | Shared policy resolver | May add registered Slice B2/C transitions additively. Must not alter Slice A/B1 transitions or 25-action semantic mapping. | registry, Slice A, B1, all WM |
| `domain/workflow.ts` | `d2f5589bf0e5ffd819d711edb8559d3136e9d0ff` | Lifecycle/review transitions | May add registered Slice B2/C transitions additively. Must not alter Slice A/B1 transitions or 25-action semantic mapping. | registry, Slice A, B1, all WM |
| `validation/schemas.ts` | `4cde0500e366c8c116a6e4598c3b5e8e5605f479` | Strict public commands | May add strict action-specific fields for later registered actions. Must remain strict and must not allow server-owned metadata. | registry, Slice A, B1, all WM |
| `errors/codes.ts` | `b0468538a28312635fe97df02f3b17479489b8b8` | Stable error contract | Additive stable error codes only; existing codes must not be repurposed. | registry, Slice A, B1, all WM |
| `tests/core-task-executor.test.ts` | `50a34beaba40d5adc44663165c1726799aa5694b` | Slice A regression | No semantic weakening | Slice A command |
| `tests/core-task-transition.test.ts` | `4ec5672c625c4a024476e2eab40c5f1471310f10` | Slice A transition regression | No semantic weakening | Slice A command |
| `tests/core-task-idempotency-boundary.test.ts` | `105667c21c1dfaa74b9934876579930e321d2022` | Slice A idempotency regression | No semantic weakening | Slice A command |
| `tests/result-review-executor.test.ts` | `663b98c32014aacf2c44fe615794956e253e2a62` | B1 closure matrix | No semantic weakening | B1 closure command |
| `tests/workflow.test.ts` | `8cddeef7090f74c702d468b386eb810ab57cf10e` | Shared workflow and lifecycle/review transition regression | May add Slice B2/C transition cases. Must not delete existing assertions, weaken exact state assertions, replace exact errors with generic rejection, alter Slice A/B1 expectations, or remove fail-closed cases. | Workflow, registry, Slice A, B1, all WM |

Slice B2 may extend the shared files above only additively; it must not alter B1 semantics unless a B1 regression test exposes a real defect. Every additive shared-file change requires the listed Slice A, B1, registry, and all-Work-Management regressions.
