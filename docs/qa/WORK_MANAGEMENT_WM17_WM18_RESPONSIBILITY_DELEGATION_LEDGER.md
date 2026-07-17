# WM-17/WM-18 ResponsibilityDelegation ledger

Canonical ResponsibilityDelegation contract: **NOT FOUND**. Minimal pure delegation foundation is frozen for WM-17/WM-18.

| ID | Status | Evidence |
|---|---|---|
| DG-01 Worktree baseline | DONE | Dirty worktree preserved; no reset, migration, database or service-pipeline change. |
| DG-02 Contract discovery | DONE | Existing legacy permission `DelegationContext` is not a canonical responsibility-register contract. |
| DG-03–DG-08 Foundation, source/snapshot/record/runtime validation | DONE | Explicit ACTIVE source factory, anchored snapshot and fail-closed runtime validators. |
| DG-09–DG-13 REQUEST/ACCEPT/REJECT/REVOKE/EXPIRE | DONE | Named lifecycle tests cover success, actor and temporal denials. |
| DG-14–DG-20 Cardinality/self/chained/generation/status/time/reason | DONE | Exact history and lifecycle matrices pass. |
| DG-21–DG-25 Effectiveness/effects/cloning/immutability | DONE | Accepted-window helper, typed effects and mutable-source tests pass. |
| DG-26–DG-32 Boundaries | DONE | No holder/assignee/implicit delegate/collaboration/mass-assignment behavior. |
| DG-33 Focused tests | DONE | Pre-record-integrity baseline: 35 pass; final integrity closure: 46 pass, 0 fail, 0 skipped. |
| DG-34 WM-15/16 regression | DONE | 39 pass. |
| DG-35 WM-10 regression | DONE | 17 pass. |
| DG-36 WM-11/12 regression | DONE | 26 pass. |
| DG-37 WM-13/14 regression | DONE | 53 pass. |
| DG-38–DG-44 Idempotency/Slices/workflow/registry | DONE | Regression command set exits 0. |
| DG-45 All Work Management | DONE | Pre-record-integrity baseline: 1234 pass; final integrity closure: 1245 pass, 0 fail, 0 skipped. |
| DG-46–DG-49 Lint/TypeScript/diff | DONE | Scoped lint, scoped/global TypeScript and diff check exit 0. |
| DG-50 Final report | DONE | Final report created. |
| DG-51 Frozen baseline | DONE | Frozen baseline created. |
| DG-52 WM-17 closure | DONE | Pure delegation foundation closed. |
| DG-53 WM-18 closure | DONE | Exact delegation verification closed. |
| DG-54 Standalone record validation | DONE | Exported standalone validator no longer fabricates generation-one history. |
| DG-55 Later-generation effectiveness | DONE | Accepted records at generations 1, 2 and 5 validate independently. |
| DG-56 Full source-assignment shape validation | DONE | Factory requires a full runtime-valid ACTIVE ResponsibilityAssignment record. |
| DG-57 requestedBy provenance | DONE | History requires `requestedById === delegatorUserId`. |
| DG-58 REVOKED acceptedAt chronology | DONE | Prior acceptance must be within requested/expires window. |
| DG-59 EXPIRED acceptedAt chronology | DONE | Prior acceptance must be within requested/expires window. |
| DG-60 Exact effect temporal validation | DONE | Time windows, accepted/expired timestamps and cross-type metadata fail closed. |
| DG-61 EXPIRE actor policy documentation | DONE | Actor is trusted audit metadata; service authorization remains deferred. |
| DG-62 Final integrity closure | DONE | Focused 46/46 and all Work Management 1245/1245 pass. |
| Service authorization/scope/persistence-UoW/idempotency/outbox integration | DEFERRED | No canonical service integration contract; no second pipeline created. |
| Scheduled expiration | NOT IMPLEMENTED | Explicit `EXPIRE` behavior exists; no scheduled worker is implemented. |

No foundation item is PENDING or BLOCKED. Schema remains **NO-GO**.
