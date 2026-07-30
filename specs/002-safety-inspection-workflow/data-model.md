# Mô hình dữ liệu đề xuất (additive)

## Nguyên tắc

- Không đổi hoặc xóa bảng/migration hiện có; mọi bảng mới dùng tiền tố `Safety`.
- Mọi resource theo công trình có `projectId`, index theo `(projectId, trạng thái/thời gian)` và được scope server-side.
- Các mô tả, tên dự án/người ký xuất tài liệu cần snapshot ở thời điểm trình/duyệt để bảo toàn lịch sử.
- Không hard-delete finding, action, evidence, reinspection, approval/audit history; dùng transition hoặc `cancelledAt` có lý do.

## Enums

| Enum | Giá trị |
|---|---|
| `SafetyPlanStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REVISION_REQUIRED`, `LOCKED`, `CANCELLED` |
| `SafetyScheduleStatus` | `PLANNED`, `CHANGED`, `CANCELLED`, `IN_PROGRESS`, `COMPLETED` |
| `SafetyScheduleKind` | `INSPECTION`, `SURPRISE_INSPECTION`, `WORKER_TRAINING`, `REINSPECTION` |
| `SafetyShift` | `MORNING`, `AFTERNOON`, `EVENING` |
| `SafetyInspectionStatus` | `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `SafetyResultStatus` | `PASS`, `FAIL`, `NOT_APPLICABLE`, `NOT_INSPECTED` |
| `SafetySeverity` | `REMINDER`, `MEDIUM`, `SERIOUS`, `IMMEDIATE_DANGER` |
| `SafetyFindingStatus` | `NEW`, `ASSIGNED`, `IN_REMEDIATION`, `WAITING_REINSPECTION`, `COMPLETED`, `REJECTED`, `CANCELLED`; quá hạn là giá trị dẫn xuất, không lưu trong enum |
| `SafetyCorrectiveActionStatus` | `REQUESTED`, `IN_PROGRESS`, `SUBMITTED`, `ACCEPTED`, `REWORK_REQUIRED`, `EXTENDED`, `CANCELLED` |
| `SafetyReinspectionDecision` | `ACCEPT_COMPLETION`, `REJECT_REWORK`, `EXTEND_DUE_DATE`, `ESCALATE_SEVERITY`, `SUSPEND_WORK` |
| `SafetyReportStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REVISION_REQUIRED`, `LOCKED`, `CANCELLED` |
| `SafetyTemplateType` | `WEEKLY_PLAN`, `WEEKLY_SELF_ASSESSMENT_REPORT` |

## Entities và trường cốt lõi

| Entity | Trường chính | Liên kết/validation |
|---|---|---|
| `SafetyInspectionPlan` | `id`, `documentYear`, `sequenceNumber?`, `documentNumber?`, `weekStart`, `weekEnd`, `isWeekException`, `weekExceptionReason`, `createdDate`, `legalBases Json`, `purpose`, `recipients Json`, `status`, `createdById`, `approvedById`, `version` | Unique `(documentYear, sequenceNumber)`; tuần Mon–Sun hoặc cần giải trình; repository chưa có organization/tenant phù hợp nên không tự thêm |
| `SafetyInspectionPlanProject` | `id`, `planId`, `projectId`, `addedAt`, `addedById` | FK thật; unique `(planId, projectId)`; index `(projectId, planId)` để kiểm tra scope |
| `SafetyInspectionSchedule` | `id`, `planId`, `projectId`, `scheduledDate`, `shift`, `kind`, `constructionType`, `location`, `plannedFreeText`, `trainingContent`, `startAt`, `expectedEndAt`, `changeNote`, `status`, `sortOrder`, `version` | Một plan có nhiều project/buổi; nội dung tự do tách khỏi lựa chọn checklist có cấu trúc |
| `SafetyInspectionScheduleCollaborator` | `id`, `scheduleId`, `userId`, `displayNameSnapshot`, `roleSnapshot` | Quan hệ user thật; unique `(scheduleId, userId)`; không lưu ID trong JSON |
| `SafetyInspectionScheduleChecklistItem` | `id`, `scheduleId`, `checklistItemId`, `sortOrder` | Nội dung dự kiến có cấu trúc; unique `(scheduleId, checklistItemId)` |
| `SafetyInspectionSession` | `id`, `scheduleId?`, `planId?`, `projectId`, `checklistTemplateId`, `occurredAt`, `shift`, `location`, `constructionType`, `inspectorId`, `unplannedReason?`, `collaboratorSnapshot Json`, `status`, `startedAt`, `completedAt`, `version` | Có schedule thì plan/project/ngày/loại phải khớp lịch; không có schedule thì lý do và permission kiểm tra đột xuất bắt buộc |
| `SafetyChecklistTemplate` | `id`, `code`, `name`, `version`, `effectiveFrom`, `effectiveTo`, `isActive`, `createdById` | Không sửa template hiệu lực đã dùng; tạo version mới |
| `SafetyChecklistSection` | `id`, `templateId`, `code`, `title`, `sortOrder`, `appliesTo Json` | A–G, construction type/mục áp dụng |
| `SafetyChecklistItem` | `id`, `sectionId`, `code`, `sourceText`, `normalizedLabel?`, `sortOrder`, `requiresFindingWhenFail` | Giữ `sourceText` đúng câu mẫu; label chuẩn hóa chỉ là metadata được duyệt |
| `SafetyInspectionResult` | `id`, `sessionId`, `projectId`, `checklistItemId`, `status`, `note`, `notApplicableReason`, `inspectedAt`, `inspectedById`, `version` | Unique `(sessionId, checklistItemId)`; N/A bắt buộc lý do; một result có nhiều finding; FAIL tạo ít nhất một finding trong cùng transaction |
| `SafetyFinding` | `id`, `projectId`, `sessionId`, `inspectionResultId`, `code`, `description`, `severity`, `violationGroup`, `location`, `workSuspended`, `temporaryMeasure`, `responsibleUnit`, `responsibleUserId?`, `assignedAt`, `dueAt`, `completedAt`, `status`, `createdById` | `code` unique; `completedAt` chỉ set sau reinspection accepted; status computed overdue theo clock |
| `SafetyCorrectiveAction` | `id`, `findingId`, `projectId`, `requestText`, `assigneeUserId?`, `assigneeUnit`, `requestedDueAtSnapshot`, `submittedResult?`, `submittedAt?`, `status`, `createdById`, `version` | Snapshot hạn giao ban đầu là bất biến; hạn hiệu lực chỉ đọc từ finding; policy kiểm tra lại độc lập do server tính |
| `SafetyCorrectiveEvidence` | `id`, `projectId`, `findingId`, `actionId?`, `documentId?`, `kind`, `caption`, `capturedAt`, `geoLat?`, `geoLng?`, `uploadedById`, `cancelledAt?`, `cancelledById?`, `cancelReason?` | Trace evidence/finding/action/document phải cùng project; hủy mềm có lý do và audit, không hard-delete |
| `SafetyReinspection` | `id`, `projectId`, `findingId`, `actionId`, `inspectorId`, `decision`, `conclusion`, `inspectedAt`, `newDueAt?`, `newSeverity?`, `suspensionReason?` | Chỉ actor độc lập có quyền; một quyết định transition tồn tại lịch sử |
| `SafetyWeeklyReport` | `id`, `documentYear`, `sequenceNumber?`, `documentNumber?`, `weekStart`, `weekEnd`, `status`, `createdById`, `approvedById?`, `legalBases Json`, `recipients Json`, `sourceSnapshotAt`, `version` | Unique `(documentYear, sequenceNumber)`; lock sau duyệt |
| `SafetyWeeklyReportProject` | `id`, `reportId`, `projectId` | FK thật; unique `(reportId, projectId)`; đồng bộ từ report entry trong transaction |
| `SafetyWeeklyReportEntry` | `id`, `reportId`, `projectId`, `sessionId`, `inspectionDate`, `shift`, `projectSnapshot`, `content`, `assessment`, `request`, `implementationResult`, `sortOrder` | One actual session/project row; trace tới session |
| `SafetyWeeklyReportNarrative` | `id`, `reportId`, `key`, `systemContent`, `editedContent`, `editedById?`, `editedAt?`, `changeReason?` | Các key bắt buộc: pending prior, reinspected, completed, board recommendation, resources, other |
| `SafetyDocumentTemplate` | `id`, `templateType`, `version`, `documentId?`, `storagePath`, `sha256`, `isActive`, `approvedById?` | File template immutable/hash; không export bằng file không active |
| `SafetyApprovalHistory` | `id`, `projectId?`, `aggregateType`, `aggregateId`, `fromStatus`, `toStatus`, `actorId`, `reason?`, `approvalRequestId?`, `occurredAt` | Append-only transition history |
| `SafetyAuditLog` | `id`, `projectId?`, `entityType`, `entityId`, `action`, `beforeData Json?`, `afterData Json?`, `actorId`, `occurredAt`, `correlationId` | Append-only; log cả lỗi cross-scope/lỗi sync |
| `SafetyIdempotency` | `id`, `actorId`, `aggregateType`, `aggregateId`, `clientMutationId`, `requestHash`, `responseData Json?`, `createdAt` | Unique `(actorId, aggregateType, aggregateId, clientMutationId)`; cùng mutation ID của hai actor không xung đột |

## Luồng trạng thái

```text
Kế hoạch: DRAFT → PENDING_APPROVAL → APPROVED → LOCKED
                  ↘ REVISION_REQUIRED ────────────┘
                  ↘ CANCELLED (có lý do)

Tồn tại: NEW → ASSIGNED → IN_REMEDIATION → WAITING_REINSPECTION
                                           ├→ COMPLETED (chỉ khi ACCEPT_COMPLETION)
                                           ├→ REJECT_REWORK → IN_REMEDIATION
                                           ├→ Quá hạn (selector `isSafetyFindingOverdue`, không phải transition)
                                           └→ CANCELLED (có lý do)

Báo cáo: DRAFT → PENDING_APPROVAL → APPROVED → LOCKED
                 ↘ REVISION_REQUIRED → DRAFT
                 ↘ CANCELLED (có lý do)
```

## Bất biến bắt buộc

1. Không result `NOT_APPLICABLE` nếu thiếu `notApplicableReason`.
2. Không finding `COMPLETED` nếu không có reinspection `ACCEPT_COMPLETION`.
3. `dueAt` có thể thay đổi chỉ bằng reinspection extension/lịch sử, không update im lặng.
4. Một result/finding/action/evidence phải có cùng `projectId` với session nguồn và document nguồn.
5. Mutation thực địa có `clientMutationId` + expected version để retry offline không tạo finding lặp.
6. Báo cáo locked/document template approved chỉ đọc; tạo bản revision mới thay vì sửa nội dung lịch sử.
7. Partial unique index bảo đảm một checklist active theo `code` và một document template active theo `templateType`.
8. Check constraint bảo vệ kỳ tuần, sequence dương, GPS, hạn hiệu lực, N/A reason và `completedAt`/status.
