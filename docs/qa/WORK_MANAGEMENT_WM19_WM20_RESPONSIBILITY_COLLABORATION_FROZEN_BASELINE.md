# WM-19/WM-20 ResponsibilityCollaboration frozen baseline

## Frozen contract

- Collaboration is explicit invitation and membership only, from one ACTIVE ResponsibilityAssignment.
- Ownership transfer and operational-assignee changes are forbidden.
- Lifecycle: INVITE / ACCEPT / REJECT / REMOVE / LEAVE.
- Multiple distinct collaborators are allowed; duplicate open membership for one user, self collaboration and chained collaboration are forbidden.
- Generation is global contiguous per source assignment; history snapshots are runtime-validated and immutable.
- REMOVED `acceptedAt`, when present, satisfies `invitedAt <= acceptedAt <= endedAt`.
- Effect actor provenance: INVITE/REMOVE use the owner; ACCEPT/REJECT/LEAVE use the collaborator.
- Effects carry type-specific trusted metadata. Implicit collaborators and delegation inference are forbidden.
- Service integration and outbox are DEFERRED; notification delivery and mass assignment are NOT IMPLEMENTED; schema is NO-GO.
- Patch-scoped diff is required and passing. Full-worktree unrelated whitespace is an external WM-28 warning.

## Final protected hashes

| File | Final hash |
|---|---|
| `src/lib/work-management/application/responsibility-collaboration.ts` | `7ae84ddb584fdf0716c3f4dd8db2f499df7af7d4` |
| `src/lib/work-management/errors/codes.ts` | `3082ff74da5f91bdcc2577b3a5ef827c29f93d98` |
| `src/lib/work-management/tests/responsibility-collaboration-aggregate.test.ts` | `eb2379d8b516b28aac045acde2570af1e8cadc00` |
| `src/lib/work-management/tests/responsibility-collaboration-integrity.test.ts` | `ce18a0f9a46ea8b5478d439e341beac5db22e512` |
| `src/lib/work-management/tests/responsibility-collaboration-verification.test.ts` | `fd5d1639d72bdf72297d9273ceb1c61184edde75` |
| `docs/qa/WORK_MANAGEMENT_WM19_WM20_RESPONSIBILITY_COLLABORATION_LEDGER.md` | `426358cee921073d1771d25b750962c458703350` |
| `docs/qa/WORK_MANAGEMENT_WM19_WM20_RESPONSIBILITY_COLLABORATION_FINAL_REPORT.md` | `13d08323fe38dc77d2b702ec7e4315f4e31f401f` |

Future changes require focused Collaboration and full Work Management regression.
