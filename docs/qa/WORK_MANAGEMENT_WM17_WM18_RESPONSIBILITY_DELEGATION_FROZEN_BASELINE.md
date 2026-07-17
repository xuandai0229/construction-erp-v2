# WM-17/WM-18 ResponsibilityDelegation frozen baseline

Delegation is explicit, temporary and time-bounded from one ACTIVE ResponsibilityAssignment. Holder transfer and operational-assignee change are forbidden. Lifecycle is REQUEST / ACCEPT / REJECT / REVOKE / EXPIRE; effectiveness is derived from ACCEPTED plus the time window; one open delegation per source; self/chained delegation forbidden. Service integration is DEFERRED. Scheduled expiration, collaboration and mass assignment are not implemented. Schema is NO-GO.

Record-integrity closure: standalone effectiveness validation has no generation-one assumption; source is a full runtime-valid ACTIVE ResponsibilityAssignment; `requestedById` equals the original holder; when present, `requestedAt <= acceptedAt < expiresAt`; EXPIRE actor is trusted audit metadata and service authorization is deferred. Scheduled expiration worker: not implemented.

| File | Final hash |
|---|---|
| `application/responsibility-delegation.ts` | `d25af6c5669d838cf7dc8bdd6a6ba1217397d5f8` |
| `application/responsibility-assignment.ts` | `052ae5bd9625d9df2c6d32e407428097b6f1e923` |
| `errors/codes.ts` | `c38f5634f7bb74179bbefe948b46e1b5f127d39c` |
| `tests/responsibility-delegation-aggregate.test.ts` | `2ab7a125f7ecfec38a4b8aa599065e0730c740f4` |
| `tests/responsibility-delegation-verification.test.ts` | `b124936e29dfce377b500f1efe769135c49d5efe` |
| `tests/responsibility-delegation-record-integrity.test.ts` | `26a381cda58a6acd458dbb77afc7e3316347d8b4` |
| `docs/qa/WORK_MANAGEMENT_WM17_WM18_RESPONSIBILITY_DELEGATION_LEDGER.md` | `85ef96bd746cc7613b3c6914dbf2c7c4e2819b58` |
| `docs/qa/WORK_MANAGEMENT_WM17_WM18_RESPONSIBILITY_DELEGATION_FINAL_REPORT.md` | `cae8f278461dbfe71fb71c72aed7f0bb04ebb0b2` |
