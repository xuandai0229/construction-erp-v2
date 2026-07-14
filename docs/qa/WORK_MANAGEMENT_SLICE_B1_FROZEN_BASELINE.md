# Work Management Slice B1 frozen baseline

Slice B1 closure gate is frozen after the regression commands recorded in the closure report.

| File | Final hash | Purpose | Allowed future changes | Required regression |
|---|---|---|---|---|
| `application/core-task-executor.ts` | `abda3c6e9fabca8d96cb9dfe7952785a0cc9766c` | Shared execution and B1 behavior | Defect-only change with B1 and Slice A regression | B1, Slice A, all WM |
| `application/core-task-effects.ts` | `9c23e0e52bf254ef714c887066ef591a48c95442` | Typed effect envelopes | Additive defect correction only | B1, registry, all WM |
| `application/core-task-idempotency.ts` | `fb2a0801a9f0082a46ba768c3462025ebdd97ca1` | Shared idempotency boundary | Defect-only change | B1, Slice A, all WM |
| `application/core-task-ports.ts` | `88be0e435e702dd41955a43fe14952f2f9ee1be7` | Ports and transaction boundary | Additive compatibility only | B1 and all WM |
| `application/result-review-invariants.ts` | `7d20301483f7f4231d2082413f04320f70cab994` | Review/completion invariants | Defect-only change | B1 tests |
| `domain/transition-policies.ts` | `06adb0da841156ad1d6614708f8b617b70f4478b` | Shared policy resolver | Defect-only change | registry, Slice A, B1 |
| `domain/workflow.ts` | `d2f5589bf0e5ffd819d711edb8559d3136e9d0ff` | Lifecycle/review transitions | Defect-only change | workflow, B1, Slice A |
| `validation/schemas.ts` | `4cde0500e366c8c116a6e4598c3b5e8e5605f479` | Strict public commands | Additive strict change only | registry and all WM |
| `errors/codes.ts` | `b0468538a28312635fe97df02f3b17479489b8b8` | Stable error contract | Additive stable codes only | all WM |
| `tests/core-task-executor.test.ts` | `50a34beaba40d5adc44663165c1726799aa5694b` | Slice A regression | No semantic weakening | Slice A command |
| `tests/core-task-transition.test.ts` | `4ec5672c625c4a024476e2eab40c5f1471310f10` | Slice A transition regression | No semantic weakening | Slice A command |
| `tests/core-task-idempotency-boundary.test.ts` | `105667c21c1dfaa74b9934876579930e321d2022` | Slice A idempotency regression | No semantic weakening | Slice A command |
| `tests/result-review-executor.test.ts` | `663b98c32014aacf2c44fe615794956e253e2a62` | B1 closure matrix | No semantic weakening | B1 closure command |

Slice B2 must not alter B1 semantics unless a B1 regression test exposes a real defect.
