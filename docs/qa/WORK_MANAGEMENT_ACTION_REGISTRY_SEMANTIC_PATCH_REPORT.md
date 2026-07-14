# ACTION REGISTRY SEMANTIC PATCH REPORT

## 1. Kết luận

WM-04: DONE.

WM-05: DONE.

WM-04 PENDING: NO.

WM-05 PENDING: NO.

25 actions registered: YES.

## 2. Worktree baseline

Baseline branch: `main`; HEAD: `08828aa don_pate35`; worktree: `D:/construction-erp-v2`. Lệnh `git status --short`, `git branch --show-current`, `git log -1 --oneline`, `git diff --stat`, và `git worktree list` đã chạy. Không reset, clean, stash, restore, merge, rebase, commit hoặc push.

## 3. Workload file hash verification

| File | Before | After | Match |
|---|---|---|---|
| `domain/workload.ts` | `9b5b126a073c28e13e186c96188be6d032d094f6` | `9b5b126a073c28e13e186c96188be6d032d094f6` | YES |
| `tests/workload.test.ts` | `03d95cfc204a6f0cb7b81f47a0251f00e518974d` | `03d95cfc204a6f0cb7b81f47a0251f00e518974d` | YES |

Workload files modified: NO.

## 4. Semantic defects đã sửa

- CREATE_DRAFT không còn yêu cầu creator relation trước khi aggregate tồn tại.
- ACCEPT_HANDOVER và REJECT_HANDOVER chỉ dùng `HANDOVER_RECEIVER` cùng `HANDOVER_SCOPE`.
- EXECUTE_HANDOVER dùng `SYSTEM_OR_PRIVILEGED_SCOPE` thay vì creator/assigned-by.
- Registry không còn dùng relation array song song với actor policy.
- Các schema bị tái sử dụng sai ngữ nghĩa được tách theo action.

## 5. Actor policy model

`WorkManagementActorPolicy` là discriminated union: `NOT_APPLICABLE`, `RELATION_REQUIRED`, `RELATION_OR_PRIVILEGED_SCOPE`, và `SYSTEM_OR_PRIVILEGED_SCOPE`. `evaluateActorPolicy` là pure evaluator, không đọc database và không là action handler.

## 6. Permission + scope + relation rules

Authorization contract giữ tách biệt permission, allowed scope, actor policy và confidentiality. Privileged scope chỉ có thể thay actor relation ở action có mode `RELATION_OR_PRIVILEGED_SCOPE`; không bypass permission hoặc confidentiality.

## 7. Handover actor semantics

`HANDOVER_RECEIVER` và derived `HANDOVER_SCOPE` được thêm vào contract. ACCEPT_HANDOVER actor: HANDOVER_RECEIVER. REJECT_HANDOVER actor: HANDOVER_RECEIVER. ADMIN/COMPANY scope không thể giả mạo quyết định receiver.

## 8. Execute handover system policy

EXECUTE_HANDOVER policy: SYSTEM_OR_PRIVILEGED_SCOPE. Internal `SYSTEM` context hoặc user có DEPARTMENT/PROJECT/COMPANY scope mới thỏa actor policy; payload client có `actorType` hoặc `systemActor` bị schema strict từ chối.

## 9. Action-specific command schemas

PASS. Có schema riêng: `startTaskSchema`, `resumeTaskSchema`, `blockTaskSchema`, `unblockTaskSchema`, `executeHandoverSchema`, `restoreTaskSchema`. Test xác nhận chúng không phải object reference của schema cũ sai ngữ nghĩa.

## 10. Strict schema security

PASS. Với từng trong 25 action: valid fixture parse PASS; 18 metadata độc hại (`actorId`, `nextStatus`, `actorType`, metadata policy/event/audit, v.v.) đều parse FAIL bằng Node subtest thật.

## 11. Transition policy resolver

PASS. 25 `WorkManagementTransitionPolicyKey` resolve qua pure resolver thành policy có transition intent; deadline, completion, handover transfer và restore-previous-lifecycle intent được kiểm tra độc lập.

## 12. Domain event types

`WorkManagementDomainEvent`/`WORK_MANAGEMENT_DOMAIN_EVENTS` là contract domain event riêng.

## 13. Activity types

`WorkManagementActivityType`/`WORK_MANAGEMENT_ACTIVITY_TYPES` là contract activity riêng, ví dụ `TASK_ASSIGNED`.

## 14. Audit actions

`WorkManagementAuditAction`/`WORK_MANAGEMENT_AUDIT_ACTIONS` là contract audit riêng, ví dụ `TASK_ASSIGN`.

## 15. Archive/restore semantics

ARCHIVE có invariant `ARCHIVE_SOURCE_STATE_REQUIRED`; RESTORE có invariant `RESTORE_PREVIOUS_LIFECYCLE_REQUIRED` và transition policy restore previous lifecycle. Client không gửi lifecycle đích.

## 16. Independent semantic expectation matrix

`action-registry-semantics.test.ts` chứa expectation table độc lập cho 18 action critical, không chỉ so registry với side-effect map.

## 17. Test matrix

| Suite | Top-level | Subtests | Pass | Fail | Skip |
|---|---:|---:|---:|---:|---:|
| Structural registry | 4 | 80 | 84 | 0 | 0 |
| Strict schema security | 1 | 475 | 476 | 0 | 0 |
| Semantic expectation/policy | 5 | 49 | 54 | 0 | 0 |
| Semantic patch subtotal | 10 | 604 | 614 | 0 | 0 |
| All Work Management tests | Runner aggregate | Runner aggregate | 676 | 0 | 0 |

## 18. Scoped lint

PASS, exit code 0.

## 19. Scoped TypeScript

PASS: `npx tsc -p tsconfig.work-management.json`, exit code 0.

## 20. Global TypeScript

PASS: `npx tsc --noEmit`, exit code 0.

## 21. File đã tạo/sửa

- `src/lib/work-management/application/action-registry.ts`
- `src/lib/work-management/application/actor-policy.ts`
- `src/lib/work-management/domain/transition-policies.ts`
- `src/lib/work-management/validation/schemas.ts`
- `src/lib/work-management/permissions/contract.ts`
- `src/lib/work-management/events/activity-types.ts`
- `src/lib/work-management/events/audit-actions.ts`
- `src/lib/work-management/events/side-effect-map.ts`
- `src/lib/work-management/tests/action-registry.test.ts`
- `src/lib/work-management/tests/action-registry-security.test.ts`
- `src/lib/work-management/tests/action-registry-semantics.test.ts`
- `docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md`

## 22. Ledger update

WM-04 và WM-05 được tạm thời chuyển FAILED trước patch do defect semantic, sau đó chuyển lại DONE sau test/lint/typecheck PASS. WM-06 đến WM-09 không bị thay đổi và vẫn PENDING.

## 23. Hạng mục FAILED

Không có sau patch.

## 24. Hạng mục BLOCKED

Không có trong patch code thuần này.

## 25. Trạng thái WM-06

WM-06 started: NO.

## 26. Trạng thái schema

Schema: NO-GO. Không thay đổi schema, migration hoặc database.
