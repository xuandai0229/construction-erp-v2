# WM-15/WM-16 ResponsibilityAssignment frozen baseline

## Frozen contract

- Registry: `TASK_OWNER` is SINGLE; `TASK_CONTRIBUTOR` is MULTIPLE.
- `TASK_OWNER` is explicit accountability metadata only.
- Operational assignee remains `primaryAssigneeId` only.
- Behavior: ASSIGN / REPLACE / REVOKE.
- Generation: global and contiguous per task register.
- History: runtime-validated immutable snapshots.
- Effects: type-specific trusted metadata.
- Implicit responsibility: forbidden.
- Service integration: DEFERRED; no second pipeline may be inferred.
- Delegation, collaboration and mass assignment: not implemented.
- Schema: NO-GO.

## Final hashes

| File | Final hash | Protected purpose |
|---|---|---|
| `src/lib/work-management/application/responsibility-assignment.ts` | `052ae5bd9625d9df2c6d32e407428097b6f1e923` | Pure foundation behavior and runtime validators. |
| `src/lib/work-management/errors/codes.ts` | `860bcb43473aff848e27938e9332276a6158e666` | Stable responsibility error-code contract. |
| `tests/responsibility-assignment-aggregate.test.ts` | `120bc42e3ed9e2cecd198baa3e449cc452996638` | Exact ASSIGN/REPLACE/REVOKE behavior. |
| `tests/responsibility-assignment-boundaries.test.ts` | `9ac7a51379c6b7036adb981b86e52a73897009d8` | No operational-assignee or implicit-source fallback. |
| `tests/responsibility-assignment-effects.test.ts` | `04e84837359319f0932b5410062d47e2e6ba7aa0` | Typed-effect contract and malformed-effect rejection. |
| `tests/responsibility-assignment-immutability.test.ts` | `1e07547ebf202375e351f176a206a9ecfc90542c` | Source/date/effect cloning and input immutability. |
| `tests/responsibility-assignment-integrity.test.ts` | `8f621d8d387fbc2ec566c695cde784c206522b3b` | Generation, cardinality and supersede history integrity. |
| `tests/responsibility-assignment-runtime-validation.test.ts` | `464e190e27002e68262215867f18cefdd852c9a3` | Runtime registry, command, record, Date, status and reason matrices. |
| `docs/qa/WORK_MANAGEMENT_WM15_WM16_RESPONSIBILITY_ASSIGNMENT_LEDGER.md` | `0265937df99a9c0e6ae999c6deb7f0876a319c82` | Foundation closure ledger. |
| `docs/qa/WORK_MANAGEMENT_WM15_WM16_RESPONSIBILITY_ASSIGNMENT_FINAL_REPORT.md` | `f161a1914d0dd4a94a92ce0ec314029548d4f2a8` | Traceability and verification evidence. |

Required regression command: `npx tsx --test src/lib/work-management/tests/*responsibility-assignment*.test.ts`.
