# BUSINESS DATA WIPE DRY-RUN REPORT (2026-08-01)

> **TRẠNG THÁI: NO-GO (DỪNG CHỜ PHÊ DUYỆT CỔNG PHÁ HỦY)**  
> **MANIFEST HASH SHA-256:** `a30891c3cd8c96c73de86dffd8939396c3369c86f34dd00d12d2de9f34741049`

## I. THÔNG TIN MÔI TRƯỜNG VÀ ADMIN

- **Môi trường:** `qa_sandbox`
- **Database Connection:** `postgresql://postgres:***@127.0.0.1:5432/construction_erp_v2_qa?schema=public`
- **Admin được chỉ định giữ lại:**
  - **ID:** `cmroatu6r0000mowklk61sv56`
  - **Email:** `da***@gmail.com`
  - **Name:** XĐ
  - **Role:** ADMIN
  - **Trạng thái:** Active (Valid password hash)

## II. DANH SÁCH TÀI KHOẢN ADMIN HIỆN CÓ (1)

| User ID | Email đã che | Tên | Role | Trạng thái | Hành động wipe |
|---|---|---|---|---|---|
| cmroatu6r0000mowklk61sv56 | da***@gmail.com | XĐ | ADMIN | Active | **GIỮ LẠI (PRESERVED)** |

## III. THỐNG KÊ INVENTORY DATABASE SCHEMA (TOTAL 63 TABLES)

| Model/Table | Tổng bản ghi | Số dự kiến xóa | Số giữ lại | Lý do giữ |
|---|---:|---:|---:|---|
| User | 1 | 0 | 1 | Giữ đúng 01 tài khoản Admin duy nhất ID: cmroatu6r0000mowklk61sv56 |
| SystemSetting | 1 | 0 | 1 | Cấu hình hệ thống bắt buộc, không phải dữ liệu nghiệp vụ |
| siteReportAttachment | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| siteReportPhoto | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| siteReportLine | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| siteReport | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyAttachment | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyRevision | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyObservation | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyProgress | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyTransition | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyQuantity | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyEntry | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyShiftSelection | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyDossier | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionInspectionSchedule | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWorkflowHistory | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionAttachment | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionFinding | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionPlanItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionProgressAssessment | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionQuantityVerification | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionRecommendation | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionTransitionCheck | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionVisit | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionWeeklyPackage | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionScopeProject | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| supervisionScope | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyReportApprovalHistory | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyReportAuditLog | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyReportPlanEntry | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetySelfAssessmentEntry | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyReportPlan | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetySelfAssessmentReport | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyWeeklyFile | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetyReportPlanSequence | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| safetySelfAssessmentSequence | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| workTaskAction | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| workTaskOutboxMessage | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| workTaskIdempotency | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| workTask | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldProgressItemAssignment | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldProgressItemLocation | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldProgressEntry | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldMaterialRequestItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldMaterialRequest | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldProgressItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| fieldProgressTemplate | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| projectLocationNode | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| materialMovement | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| projectMaterialStock | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| materialRequestItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| materialRequest | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| materialItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| document | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| documentFolder | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| wBSItem | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| chatMessage | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| auditLog | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| notification | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| approvalRequest | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| projectMember | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |
| project | 0 | 0 | 0 | Dữ liệu nghiệp vụ / con cần xóa trắng |

## IV. THỐNG KÊ FILE STORAGE NGƯỜI DÙNG TẢI LÊN

- **Provider:** Local Disk Storage
- **Thư mục:** `storage/`
- **Tổng số file người dùng tải lên:** 0
- **Dung lượng ước tính:** 0.00 MB (0 bytes)
- **File hệ thống / template được bảo vệ:** Font, Logo, Icon, Public App Assets.

## V. THỨ TỰ XÓA RÀNG BUỘC KHÓA NGOẠI (FOREIGN KEY EXECUTION ORDER)

1. Attachments & Photos (SiteReportAttachment, SiteReportPhoto, SupervisionWeeklyAttachment, SupervisionAttachment)
2. Comments, History & Audit Logs (SafetyReportApprovalHistory, SafetyReportAuditLog, SupervisionWorkflowHistory, SupervisionWeeklyRevision, WorkTaskAction, WorkTaskOutboxMessage, WorkTaskIdempotency, AuditLog, ChatMessage)
3. Notifications & Delivery (Notification)
4. Approvals (ApprovalRequest)
5. Child Business Entries & Tasks (WorkTask, SafetyReportPlanEntry, SafetySelfAssessmentEntry, FieldProgressItemAssignment, FieldProgressItemLocation, FieldProgressEntry, FieldMaterialRequestItem, FieldMaterialRequest, SupervisionWeekly*)
6. Parent Reports & Dossiers (SiteReportLine, SiteReport, SafetyReportPlan, SafetySelfAssessmentReport, SafetyWeeklyFile, SupervisionWeeklyDossier, SupervisionWeeklyPackage)
7. Progress, Templates, Locations, WBS, Documents (FieldProgressItem, FieldProgressTemplate, ProjectLocationNode, WBSItem, Document)
8. Materials & Inventory (MaterialMovement, ProjectMaterialStock, MaterialRequestItem, MaterialRequest, MaterialItem)
9. Folder Hierarchy (DocumentFolder)
10. Project Members & Scope (ProjectMember, SupervisionScopeProject, SupervisionScope)
11. Projects (Project)
12. Safety Sequences (SafetyReportPlanSequence, SafetySelfAssessmentSequence)
13. User Accounts (User WHERE id != 'cmroatu6r0000mowklk61sv56')

## VI. CỔNG PHÊ DUYỆT PHÁ HỦY CẦN THIẾT KHI EXECUTE WIPE

Để tiến hành xóa thực tế, bắt buộc phải cung cấp đủ các biến môi trường sau:
```bash
DRY_RUN=false
WIPE_APPROVED=true
WIPE_MANIFEST_HASH=a30891c3cd8c96c73de86dffd8939396c3369c86f34dd00d12d2de9f34741049
PRESERVED_ADMIN_ID=cmroatu6r0000mowklk61sv56
CONFIRM_PHRASE=DELETE_ALL_BUSINESS_DATA_KEEP_ONE_ADMIN
```
