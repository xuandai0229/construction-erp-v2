# Báo cáo domain kernel Work Management

Ngày: 2026-07-14. Domain kernel được triển khai không dùng Prisma Client, không mutation database và không tạo UI/mock data. State model đã được tách thành lifecycle, acceptance, execution condition, review, handover và waiting reason; `REOPENED`/`HANDOVER_IN_PROGRESS`/waiting không còn là lifecycle dài hạn.

## File đã thêm

- `src/lib/work-management/domain/types.ts`: enum/type cho task status, deadline, participant, confidentiality, priority, handover, delegation, responsibility, review, dependency và action.
- `src/lib/work-management/domain/workflow.ts`: action-aware evaluator trả allow/deny, next state, error code, required event, side-effect intent và permission; `OVERDUE` được tính riêng, không phải task status.
- `src/lib/work-management/domain/invariants.ts`: guard cho primary assignee, reviewer độc lập, progress, date/deadline reason, handover, cycle, completion, history submission và hard-delete.
- `src/lib/work-management/permissions/contract.ts`: 61 permission action-level và 8 scope contract yêu cầu.
- `src/lib/work-management/permissions/scope-evaluator.ts`: evaluator thuần cho creator/assigner/participant/reviewer/approver/watcher/project/delegation/confidentiality.
- `src/lib/work-management/validation/schemas.ts`: Zod schemas riêng cho create/assign/accept/clarify/progress/extension/submission/review/approve/changes/complete/reopen/pause/cancel/subtask/dependency/handover accept-reject-approve/delegation/revoke/responsibility assignment.
- `src/lib/work-management/errors/codes.ts`: error code ổn định để UI map tiếng Việt sau này.
- `src/lib/work-management/tests/*.test.ts`: 22 unit tests tách theo workflow, deadline, invariant, permission, validation và application service.

Permission metadata mới là contract độc lập; chưa đăng ký/cấp rộng cho role hiện hữu vì schema/service/UI chưa sẵn sàng.

## Kết quả kiểm thử thật

| Lệnh | Kết quả |
|---|---|
| `npx tsx --test src/lib/work-management/tests/*.test.ts` | PASS, 22/22 test; 0 fail, 0 skipped |
| `npx eslint src/lib/work-management` | PASS, exit 0 |
| Typecheck cô lập `src/lib/work-management/domain-kernel.test.ts` | PASS, exit 0 |
| `npx tsc --noEmit` | PASS, exit 0 ở lần kiểm tra cuối |
| `npm run build` | BLOCKED bởi lock của một tiến trình `next build` đang chạy; không dừng tiến trình không thuộc phạm vi. |

Các schema client hỗ trợ kiểm tra đầu vào nhưng không thay thế server validation/permission/scope/transaction khi Phase D được phép triển khai.
