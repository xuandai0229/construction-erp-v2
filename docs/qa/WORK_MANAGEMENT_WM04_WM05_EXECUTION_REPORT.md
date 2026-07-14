# BÁO CÁO THỰC THI WORKLOAD PATCH + WM-04/WM-05

## 1. Kết luận

Workload patch: DONE.

WM-04: DONE.

WM-05: DONE.

WM-04 PENDING: NO.

WM-05 PENDING: NO.

25 actions registered: YES.

## 2. Worktree baseline

Lệnh đã chạy: `git status --short`, `git branch --show-current`, `git log -1 --oneline`, `git diff --stat`, và `git worktree list`.

Worktree hiện tại là `D:/construction-erp-v2` trên branch `main`, HEAD `08828aa don_pate35`. Các thay đổi không thuộc Work Management được giữ nguyên; không reset, clean, stash, restore, commit hay push.

## 3. Workload semantic patch

- Toàn bộ task mở thiếu estimate trả confidence `UNKNOWN`, basis `UNAVAILABLE`, usage `null`, và capacity level `UNKNOWN`.
- Estimate thiếu một phần trả `KNOWN_EFFORT_LOWER_BOUND` và giữ usage dựa trên known effort.
- So sánh full threshold dùng tolerance `1e-9`.
- Zero capacity xét toàn bộ assigned effort và cảnh báo `ZERO_CAPACITY_WITH_ASSIGNED_WORK`.
- Closed task được loại trước validation workload; legacy numeric data không làm hỏng dashboard hiện tại.

## 4. Workload tests bổ sung

`workload.test.ts` có 20 top-level test và 20 Node subtest numeric. Kết quả: pass 40, fail 0, skipped 0.

Các ca semantic bao gồm missing estimate, floating threshold, zero paused/blocked effort, weighted score, exceeded warning, và closed legacy input.

## 5. Action registry architecture

`WORK_MANAGEMENT_ACTION_REGISTRY` là server-side constant, dùng `satisfies Record<TaskAction, WorkManagementActionDefinition>`. Mỗi definition có schema thực, permission contract hiện hữu, actor relation, scope, transition/invariant policy, event/activity/audit, notification/outbox, idempotency, concurrency và transaction policy. Registry không thay đổi role seed hay runtime RBAC.

## 6. Danh sách 25 action

CREATE_DRAFT, ASSIGN, ACCEPT, REQUEST_CLARIFICATION, START, UPDATE_PROGRESS, REQUEST_EXTENSION, CHANGE_DEADLINE, PAUSE, RESUME, BLOCK, UNBLOCK, SUBMIT, REQUEST_CHANGES, APPROVE_RESULT, CONFIRM_COMPLETION, REOPEN, CANCEL, ARCHIVE, RESTORE, REQUEST_HANDOVER, ACCEPT_HANDOVER, REJECT_HANDOVER, APPROVE_HANDOVER, EXECUTE_HANDOVER.

## 7. Critical action policies

CREATE_DRAFT không yêu cầu version; ASSIGN yêu cầu concurrency/transaction/outbox; REQUEST_EXTENSION không đổi deadline trực tiếp; CHANGE_DEADLINE cần reason và due-date history; SUBMIT append-only; CONFIRM_COMPLETION cần completion guards; REOPEN giữ submission; RESTORE giữ archived state; chỉ EXECUTE_HANDOVER có assignment-history intent.

## 8. Registry completeness tests

`action-registry.test.ts` có 5 top-level test và 113 Node subtest. Kết quả: pass 118, fail 0, skipped 0.

## 9. Fail-closed behavior

`getWorkManagementActionDefinition("UNKNOWN_ACTION")` ném `WorkManagementDomainError` với code `TASK_ACTION_UNSUPPORTED`; không có metadata mặc định permissive.

## 10. Permission/event consistency

Mỗi permission nằm trong `WORK_MANAGEMENT_PERMISSIONS`; event/activity/audit nằm trong `WORK_MANAGEMENT_DOMAIN_EVENTS`; action có notification bắt buộc khớp side-effect/outbox mapping.

## 11. Test matrix

| Nhóm | Top-level | Subtest | Pass | Fail | Skip |
|---|---:|---:|---:|---:|---:|
| Workload | 20 | 20 | 40 | 0 | 0 |
| Action registry | 5 | 113 | 118 | 0 | 0 |
| Toàn bộ Work Management | Không tách bởi runner | Không tách bởi runner | 180 | 0 | 0 |

## 12. Lint và scoped TypeScript

- Scoped lint: PASS, exit code 0.
- Scoped TypeScript (`npx tsc -p tsconfig.work-management.json`): PASS, exit code 0.

## 13. File đã tạo/sửa

- `src/lib/work-management/domain/workload.ts`
- `src/lib/work-management/tests/workload.test.ts`
- `src/lib/work-management/application/action-registry.ts`
- `src/lib/work-management/tests/action-registry.test.ts`
- `src/lib/work-management/errors/codes.ts`
- `src/lib/work-management/events/domain-events.ts`
- `src/lib/work-management/validation/schemas.ts`
- `docs/qa/WORK_MANAGEMENT_MANDATORY_EXECUTION_LEDGER.md`

## 14. Ledger update

WM-02, WM-03, WM-04 và WM-05 đều là DONE. WM-06 đến WM-29 không bị sửa và giữ nguyên PENDING theo phạm vi lượt này.

## 15. Hạng mục DONE

WM-02, WM-03, WM-04, WM-05.

## 16. Hạng mục FAILED

Không có trong phạm vi lượt này.

## 17. Hạng mục BLOCKED

Không có trong phạm vi lượt này.

## 18. Trạng thái schema

NO-GO, không thay đổi schema, migration hoặc database.
