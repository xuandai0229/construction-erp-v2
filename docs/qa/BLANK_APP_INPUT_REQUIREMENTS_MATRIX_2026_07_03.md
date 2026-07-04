# BẢNG YÊU CẦU NHẬP LIỆU (BLANK APP INPUT REQUIREMENTS MATRIX)
Ngày tạo: 2026-07-03
Trạng thái: Đã cập nhật đủ 27 phân hệ cho trạng thái App Trắng

*Source evidence: manual baseline + schema/action inspection.*

## 1. Dashboard
- **Route:** `/dashboard`
- **Model DB:** `Project`, `Notification`, `AuditLog`
- **Required fields:** N/A (hiển thị dữ liệu tổng hợp).
- **Minimum data to avoid empty UI:** 1 Project (ACTIVE).
- **Professional demo data:** 5 Projects, biểu đồ tài chính/tiến độ phong phú.
- **Risk if missing:** Màn hình chính trống rỗng, không thể hiện giá trị ERP.

## 2. Projects
- **Route:** `/projects`
- **Model DB:** `Project`
- **Required fields:** `code`, `name`, `status`.
- **Recommended fields:** `startDate`, `endDate`, `budget`, `location`.
- **Minimum data:** 1 ACTIVE Project.
- **Risk if missing:** Không thể sử dụng 90% các module khác.

## 3. Project Members
- **Route:** `/projects/[id]/members`
- **Model DB:** `ProjectMember`, `User`
- **Required fields:** `projectId`, `userId`, `projectRole`.
- **Minimum data:** 1 Manager cho 1 project.

## 4. WBS (Hạng mục công việc)
- **Route:** `/projects/[id]/wbs`
- **Model DB:** `WBSItem`
- **Required fields:** `projectId`, `code`, `name`, `unit`.
- **Relations required first:** `Project`.
- **Minimum data:** 3 items.

## 5. Document Folders
- **Route:** `/documents`
- **Model DB:** `DocumentFolder`
- **Required fields:** `projectId`, `name`.
- **Minimum data:** 1 Folder (VD: Bản vẽ thi công).

## 6. Document Files
- **Route:** `/documents`
- **Model DB:** `Document`
- **Required fields:** `projectId`, `folderId`, `originalName`, `storagePath`.
- **Minimum data:** 1 file PDF mẫu.

## 7. Daily Reports
- **Route:** `/reports`
- **Model DB:** `SiteReport`, `SiteReportLine`
- **Required fields:** `projectId`, `reportDate`, `createdById`, `type=DAILY`.
- **Minimum data:** 1 DRAFT report.

## 8. Weekly Reports
- **Route:** `/reports/weekly`
- **Model DB:** `SiteReport` (type=WEEKLY)
- **Required fields:** `projectId`, `weekStartDate`, `weekEndDate`.
- **Relations required first:** Daily reports.
- **Minimum data:** 1 Báo cáo tuần.

## 9. Report Attachments
- **Route:** `/reports` (Dialog)
- **Model DB:** `SiteReportAttachment`, `SiteReportPhoto`
- **Required fields:** `reportId`, `storagePath`.
- **Minimum data:** 1 Ảnh thi công đính kèm.

## 10. Report Approval Workflow
- **Route:** `/reports`
- **Model DB:** N/A (Dùng status của SiteReport: SUBMITTED -> APPROVED).
- **Required fields:** `status`, `approvedById`.
- **Minimum data:** 1 Report đã APPROVED.

## 11. Materials Catalog
- **Route:** `/materials`
- **Model DB:** `MaterialItem`
- **Required fields:** `code`, `name`, `unit`.
- **Minimum data:** 5 loại vật tư lõi.

## 12. Material Requests
- **Route:** `/materials/requests`
- **Model DB:** `MaterialRequest`, `MaterialRequestItem`
- **Required fields:** `projectId`, `requestNo`, `requestedById`.
- **Minimum data:** 1 Phiếu yêu cầu.

## 13. Material Inventory
- **Route:** `/materials/inventory`
- **Model DB:** `ProjectMaterialStock`, `MaterialMovement`
- **Required fields:** `projectId`, `materialId`, `quantity`.
- **Minimum data:** 1 mã vật tư có số lượng tồn kho.

## 14. Suppliers
- **Route:** `/suppliers`
- **Model DB:** `Supplier`
- **Required fields:** `code`, `name`.
- **Minimum data:** 1 Nhà cung cấp.

## 15. Contracts
- **Route:** `/contracts`
- **Model DB:** `Contract`
- **Required fields:** `projectId`, `contractNo`, `name`, `type`, `value`.
- **Minimum data:** 1 Hợp đồng nội thầu/ngoại thầu.

## 16. Payment Plans
- **Route:** `/payments`
- **Model DB:** `PaymentPlan`
- **Required fields:** `projectId`, `name`, `totalAmount`.
- **Minimum data:** 1 Kế hoạch thanh toán.

## 17. Payment Requests
- **Route:** `/payments`
- **Model DB:** `PaymentRequest`
- **Required fields:** `projectId`, `amount`, `status`.
- **Minimum data:** 1 Đề nghị thanh toán.

## 18. Payment Records
- **Route:** `/payments`
- **Model DB:** `PaymentRecord`
- **Required fields:** `projectId`, `amount`, `date`.
- **Minimum data:** 1 Ghi nhận thanh toán thực tế.

## 19. Approvals
- **Route:** `/approvals`
- **Model DB:** `ApprovalRequest`
- **Required fields:** `code`, `projectId`, `title`, `requesterId`, `type`.
- **Minimum data:** 1 Phiếu trình duyệt.

## 20. Users
- **Route:** `/settings/users`
- **Model DB:** `User`
- **Required fields:** `email`, `password`, `name`, `role`.
- **Minimum data:** 1 ADMIN, 1 MANAGER, 1 ENGINEER.

## 21. Settings
- **Route:** `/settings`
- **Model DB:** `SystemSetting`
- **Required fields:** ID=1.
- **Minimum data:** Mặc định giữ lại.

## 22. Notifications
- **Route:** (Top bar)
- **Model DB:** `Notification`
- **Required fields:** `userId`, `title`, `message`.
- **Minimum data:** (Sinh tự động qua actions).

## 23. Audit Logs
- **Route:** `/settings/audit`
- **Model DB:** `AuditLog`
- **Required fields:** `userId`, `action`, `entity`.
- **Minimum data:** (Sinh tự động).

## 24. Chat
- **Route:** `/chat` (nếu có)
- **Model DB:** `ChatMessage`
- **Required fields:** `roomId`, `senderId`, `content`.
- **Minimum data:** Tùy chọn.

## 25. Upload/Storage
- **Route:** (Global APIs)
- **Model DB:** N/A
- **Minimum data:** Phải test upload avatar và document.

## 26. Search/Filters
- **Route:** (Global Components)
- **Minimum data:** Cần đủ dữ liệu (tên có dấu/không dấu) để test debounce search.

## 27. Print/Export
- **Route:** `/reports/export`
- **Minimum data:** Cần 1 báo cáo đầy đủ để test in PDF không rách form.
