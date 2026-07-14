# WM-06/WM-07 CORE TASK EXECUTION SLICE A REPORT

## 1. Kết luận

Slice A status: DONE.

Actions implemented: 12 / 12.

Actions with success tests: 12 / 12.

Actions with invalid-transition tests: 12 / 12.

## 2. Phạm vi 12 action

CREATE_DRAFT, ASSIGN, ACCEPT, REQUEST_CLARIFICATION, START, UPDATE_PROGRESS, REQUEST_EXTENSION, CHANGE_DEADLINE, PAUSE, RESUME, BLOCK, UNBLOCK.

## 3. Worktree baseline

Branch `main`, HEAD `08828aa don_pate35`, worktree `D:/construction-erp-v2`. Các thay đổi ngoài Work Management được bảo toàn; không reset, clean, stash, restore, commit hoặc push.

## 4. Protected file hashes

| File | Before hash | After hash | Match |
|---|---|---|---|
| workload.ts | `9b5b126a073c28e13e186c96188be6d032d094f6` | `9b5b126a073c28e13e186c96188be6d032d094f6` | YES |
| workload.test.ts | `03d95cfc204a6f0cb7b81f47a0251f00e518974d` | `03d95cfc204a6f0cb7b81f47a0251f00e518974d` | YES |
| action-registry.ts | `58bc84ad5f4207f58d196c6ca03883c7e346afb4` | `58bc84ad5f4207f58d196c6ca03883c7e346afb4` | YES |
| actor-policy.ts | `8cea7fbf204076abaac6607cc20200ed657643d1` | `8cea7fbf204076abaac6607cc20200ed657643d1` | YES |
| transition-policies.ts | `d4235da743c83617f10dfe2777aba34a96113eab` | `d4235da743c83617f10dfe2777aba34a96113eab` | YES |
| action-registry.test.ts | `c72d249975bc7073c9cc9354f8423e727abd9d53` | `c72d249975bc7073c9cc9354f8423e727abd9d53` | YES |
| action-registry-security.test.ts | `266d9c881942c99933d2982da9ea403ba472a7ab` | `266d9c881942c99933d2982da9ea403ba472a7ab` | YES |
| action-registry-semantics.test.ts | `6cf24461a00b1037e9aa22a49f81450e4764d885` | `6cf24461a00b1037e9aa22a49f81450e4764d885` | YES |

Protected foundation files modified: NO.

## 5. Existing code reused

Executor dùng Action Registry, actor policy evaluator, transition resolver và pure workflow evaluator hiện hữu. Không tạo permission/transition registry thứ hai; `services.ts` không bị sửa.

## 6. Application execution pipeline

Raw command → Action Registry → strict Zod parse → idempotency hook → load/create → permission → server scope → actor policy → confidentiality → version → workflow transition → action invariant → next aggregate → typed effects → compare-and-save → stage UoW → idempotency complete.

## 7. Trusted ActorContext

`WorkManagementActorContext` nhận riêng actor ID, permission set, resolved scopes, correlation/causation/request IDs. Command không thể ghi đè actor/audit/version/state.

## 8. Repository/unit-of-work ports

Pure repository port có find/create/compare-and-save. Fake UoW test double theo dõi save, staged effects, commit và rollback. Không có Prisma adapter hay database mutation.

## 9. CREATE_DRAFT behavior

Derive creator từ trusted actor, generate ID injected, initial DRAFT/version 1, create conflict guard và typed event/activity/audit intent.

## 10. ASSIGN behavior

Kiểm tra eligibility; cập nhật primary-assignee projection, assigned-by và acceptance PENDING; tạo assignment intent.

## 11. ACCEPT behavior

Chỉ primary assignee, PENDING → ACCEPTED, không đổi primary assignee.

## 12. REQUEST_CLARIFICATION behavior

Chỉ primary assignee; tạo clarification intent, không đổi deadline hay assignment.

## 13. START behavior

Chỉ assignment đã accepted; chuyển execution phù hợp; không đổi deadline/progress.

## 14. UPDATE_PROGRESS behavior

Schema validate boundary; progress 100 không tự complete lifecycle.

## 15. REQUEST_EXTENSION behavior

Tạo extension request intent; current deadline và deadline-history không đổi.

## 16. CHANGE_DEADLINE behavior

Thay deadline và tạo history intent chứa old/new deadline, reason, actor và clock timestamp.

## 17. PAUSE/RESUME behavior

Pause active task; resume chỉ paused task và giữ deadline/progress.

## 18. BLOCK/UNBLOCK behavior

Block cần reason/open blocker intent; unblock cần resolution/resolved blocker intent.

## 19. Side-effect intents

Mỗi success sinh typed domain event, activity, audit và notification theo Action Registry. Assignment, deadline history, blocker, clarification và extension intent được sinh khi thích hợp.

## 20. Transaction and rollback behavior

Compare-and-save conflict không stage effects. Staging failure rollback fake UoW. Success commit đúng một lần.

## 21. Authorization tests

Authorization test cases: 4 (permission, scope, actor policy, confidentiality), cùng version conflict và inactive assignee invariant. Privileged scope chỉ hoạt động qua policy Registry.

## 22. Behavior test matrix

Success: 12; invalid transition/duplicate: 12; invariant/authorization: 6; state-boundary intents: 3; rollback: 2.

## 23. No-mutation-on-denial evidence

Guard failures xác minh `saves = 0` và `staged effects = 0`; event/activity/audit/notification/history không được stage.

## 24. Idempotency integration boundary

Executor gọi integration port trước load/mutation và complete sau transaction. Không triển khai retry/fingerprint/replay state machine; WM-08 started: NO.

## 25. Test results

Slice top-level tests: 5. Slice subtests: 30. Pass: 35. Fail: 0. Skip: 0.

All Work Management: Pass 711, Fail 0, Skip 0.

## 26. Scoped lint

PASS, exit code 0.

## 27. Scoped TypeScript

PASS, `npx tsc -p tsconfig.work-management.json`, exit code 0.

## 28. Global TypeScript

PASS, `npx tsc --noEmit`, exit code 0.

## 29. Files created/modified

- `src/lib/work-management/application/core-task-executor.ts`
- `src/lib/work-management/tests/core-task-executor.test.ts`
- `docs/qa/WORK_MANAGEMENT_WM06_WM07_SLICE_LEDGER.md`
- `docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md`

## 30. Slice ledger

A-01 through A-27: DONE; no PENDING.

## 31. Main ledger update

WM-06 overall: PENDING — Slice A DONE.

WM-07 overall: PENDING — Slice A DONE.

## 32. Remaining WM-06/WM-07 work

Result/closure actions and handover actions are not part of this locked Slice A and remain represented by WM-06/WM-07 overall PENDING.

## 33. Schema status

Schema: NO-GO. No schema, migration, Prisma adapter, database mutation, API or UI change.
