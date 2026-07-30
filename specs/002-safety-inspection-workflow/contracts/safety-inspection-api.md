# Hợp đồng route/action — ATLĐ, PCCC, VSMT

Các route dưới đây là hợp đồng đề xuất, chưa tồn tại. Mọi response lỗi quyền dùng thông báo tiếng Việt an toàn, không tiết lộ resource khác công trình. Mọi mutation yêu cầu session, CSRF/cơ chế có sẵn và `expectedVersion` khi cập nhật bản ghi có cạnh tranh.

| Phương thức và đường dẫn | Ý nghĩa | Quyền server bắt buộc |
|---|---|---|
| `GET /api/safety-inspection/plans` | Danh sách kế hoạch theo kỳ/trạng thái | `safety.plan.view` + scope query |
| `POST /api/safety-inspection/plans` | Tạo kế hoạch nháp | `safety.plan.create` |
| `GET/PATCH /api/safety-inspection/plans/:planId` | Đọc/sửa plan và lịch | View/edit trên plan + mọi `projectId` lịch |
| `POST /api/safety-inspection/plans/:planId/submit` | Trình duyệt | Creator + trạng thái hợp lệ |
| `POST /api/safety-inspection/plans/:planId/approve` | Duyệt/trả lại/khóa | Reviewer theo scope |
| `POST /api/safety-inspection/schedules/:scheduleId/start` | Bắt đầu session | Cán bộ ATLĐ + scope project |
| `GET/PATCH /api/safety-inspection/sessions/:sessionId` | Draft/checklist actual | Inspector/role theo trạng thái + scope |
| `POST /api/safety-inspection/sessions/:sessionId/complete` | Hoàn tất kiểm tra | Inspector; validate result chưa kiểm tra/fail |
| `GET /api/safety-inspection/findings` | Danh sách tồn tại | Scope project + role |
| `POST /api/safety-inspection/findings/:findingId/assign` | Giao khắc phục | Cán bộ ATLĐ/role được giao |
| `POST /api/safety-inspection/findings/:findingId/remediation` | Gửi kết quả khắc phục | BCH/member công trình được giao |
| `POST /api/safety-inspection/findings/:findingId/reinspect` | Kết luận kiểm tra lại | Cán bộ ATLĐ độc lập, không self-approve khi policy cấm |
| `POST /api/safety-inspection/evidence` | Upload bằng chứng | Scope finding/action + mime/size policy |
| `GET /api/safety-inspection/evidence/:evidenceId/download` | Tải bằng chứng | Scope evidence → finding/project, không chỉ document UI |
| `POST /api/safety-inspection/reports` | Tạo báo cáo từ actual | Cán bộ ATLĐ + kỳ hợp lệ |
| `GET/PATCH /api/safety-inspection/reports/:reportId` | Đọc/sửa report draft | Creator/reviewer theo trạng thái |
| `POST /api/safety-inspection/reports/:reportId/submit` | Trình duyệt report | Creator + validation |
| `POST /api/safety-inspection/reports/:reportId/approve` | Duyệt/trả/khóa | Reviewer theo scope |
| `POST /api/safety-inspection/reports/:reportId/export` | Xuất Word/PDF | Read/export + report không locked trái policy |

## Payload tối thiểu có validation

- Plan: `weekStart`, `weekEnd`, `isWeekException`, `weekExceptionReason`, `schedules[]`, `expectedVersion`.
- Schedule: `projectId`, `scheduledAt`, `shift`, `kind`, `plannedContent[]`, `startAt`, `expectedEndAt`; không nhận tên công trình để bỏ qua project lookup.
- Checklist result: `checklistItemId`, `status`, `note?`, `notApplicableReason?`, `clientMutationId`; `FAIL` mang `finding` đầy đủ hoặc finding đã có trong session.
- Finding/action: severity, vị trí, bên chịu trách nhiệm, yêu cầu, hạn, biện pháp tạm thời, cờ đình chỉ; mọi `documentId` được xác minh cùng project.
- Report: kỳ, narrative overrides có `changeReason` khi sửa số liệu/kết luận; entry lấy server-side từ session, không nhận số liệu aggregate tự do.

## Events/thông báo

`PLAN_ASSIGNED`, `SCHEDULE_CHANGED`, `FINDING_CREATED`, `FINDING_SERIOUS`, `FINDING_DUE_SOON`, `FINDING_OVERDUE`, `REMEDIATION_SUBMITTED`, `REINSPECTION_REQUIRED`, `REPORT_SUBMITTED`, `REPORT_REVISION_REQUIRED`, `REPORT_APPROVED`.

Payload notification luôn chứa `projectId`, `targetType`, `targetId`, `actionUrl`; route đích kiểm tra quyền lại trước khi trả nội dung.
