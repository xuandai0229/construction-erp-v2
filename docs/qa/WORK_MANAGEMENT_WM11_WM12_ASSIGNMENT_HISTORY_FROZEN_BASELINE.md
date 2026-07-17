# WM-11/WM-12 Assignment History Frozen Baseline

## Contract

- `primaryAssigneeId` is the current projection and is never derived from history.
- History is append-only evidence; no fallback, normalization or synthetic legacy bootstrap is permitted.
- Only `ASSIGN` and `EXECUTE_HANDOVER` append a record.
- A record must be task-owned, uniquely identified, ordered by generation, chain-continuous, source-valid, and consistent with the current projection.
- Legacy tasks with an existing projection and empty history are valid; the first auditable reassignment is generation one.

## Hashes

| File | Final hash | Required regression |
|---|---|---|
| application/assignment-history.ts | `2df03f86b5a570cbcde1e2c8ee73124da1238dc2` | assignment-history focused |
| application/core-task-executor.ts | `e98bdf3847ff4916496e2b3bc1d6d60b8c5e4263` | Slice A/B1/B2/C/all WM |
| application/core-task-effects.ts | `23db66efd7a067e7d9add15370063bd492661c72` | all WM |
| errors/codes.ts | `67d13bb62111c7ee6b92bc9004ffa767587413d5` | scoped TypeScript/all WM |
| application/assignment-source-of-truth.ts | `c7a9f7518997bf04361dcb259b7cdceb44486aa4` | WM-10 regression |
| tests/assignment-history-aggregate.test.ts | `f1a4923673027c102779272b0cec42253e2c4cd0` | focused |
| tests/assignment-history-integrity.test.ts | `85bcb45cd91455fe675e7601bd666571afe2eba2` | focused |
| tests/core-task-executor.test.ts | `a78f4bd7062d61e017d8c1bb665c8419e0294b64` | Slice A |
| tests/handover-executor.test.ts | `e08bb8cb83e22c242a3f647948341195c92eea25` | Slice C |
| tests/result-review-executor.test.ts | `f7c8d72ddd3b07b860cad50c541920c1a2442731` | Slice B1 |
| tests/closure-lifecycle-executor.test.ts | `876c3ea2baa46cee0782e074d00fc530c91013ae` | Slice B2 |

Future work may extend records additively only with a corresponding invariant and regression proof; it must not alter the frozen writer policy or turn history into a current-assignee fallback.

## Correctness closure additions

- A new record's `previousAssigneeId` must equal the exact current pre-mutation `primaryAssigneeId`, even when legacy history is empty.
- Appended record objects and their `effectiveAt` Dates are cloned. Runtime `reason` is `null` or a string only.
- Concurrent ASSIGN and EXECUTE_HANDOVER operations may commit only one projection and one history generation.
- Finalization rollback preserves assignment history; retry appends once and replay appends nothing.

Closure hashes: `assignment-history.ts` `6159d45ed09f58e8363c5bda3e7e7915854b7ec5`; `errors/codes.ts` `41fbaa7910f9c521d3c5c50734b8d1dec52486d1`; aggregate tests `fb4b085a42754cd742d94f077a72d45419cf7651` and `ec14c54517729e8ca020464474d882a4c01707f9`; handover tests `8e9a3edfe18117a87a251dbd8a0e81b54ae663ad`; idempotency integration `1997aa18f3ecf6406e638c2f4a0ff9897330ef64`.
