# Báo cáo Triển khai: Documents Phase B1 — Metadata & RBAC

## 1. Mục tiêu đã hoàn thành
Biến hệ thống quản lý tài liệu (Documents) từ "kho lưu trữ file" đơn thuần thành một hệ thống **quản lý hồ sơ** có cấu trúc, với metadata, trạng thái duyệt và phân quyền (RBAC) chi tiết cho từng hành động theo từng chức vụ.

## 2. Chi tiết kỹ thuật đã thực hiện

### A. Core Database & Schema
- Cập nhật `Document` schema trong `schema.prisma`.
- Thêm `DocumentStatus` (DRAFT, SUBMITTED, APPROVED, REJECTED, ARCHIVED, SUPERSEDED).
- Thêm các trường metadata: `displayName`, `documentType`, `metadata` (JSON cho ghi chú linh hoạt), `fileHash` (SHA-256 validation), `status`, và luồng kiểm duyệt (`reviewedById`, `reviewedAt`, `rejectedReason`).

### B. Security & RBAC (`src/lib/documents/permissions.ts`)
Tách logic kiểm tra quyền thao tác trên Documents thành một helper layer độc lập, phân quyền chặt chẽ dựa trên `UserRole` và `Folder`:
- **FULL_ACCESS** (ADMIN, DIRECTOR, DEPUTY_DIRECTOR): Xem, sửa, xóa, duyệt mọi hồ sơ. Đổi tên và xóa Folder.
- **MANAGER / CHIEF_COMMANDER**: Có quyền duyệt (`changeDocumentStatus`). Tương tác chuyên sâu trong thư mục kỹ thuật.
- **ENGINEER**: Có quyền tải lên thư mục kỹ thuật. Chỉ có quyền xoá tệp của chính mình (nếu chưa được duyệt). Sửa metadata của file kỹ thuật.
- **ACCOUNTANT**: Có quyền thao tác trong thư mục kế toán (Hợp đồng, Hóa đơn, Dự toán, Thanh toán).

### C. File Hash Validation
- Bổ sung việc băm file SHA-256 (`crypto.createHash('sha256')`) ngay khi đọc `buffer` trong route upload (`src/app/api/documents/upload/route.ts`).
- Ngăn chặn việc cùng một file được đăng tải nhiều lần ở cùng folder (bắt lỗi Hash trùng).

### D. File Card & Workspace UI
- **Tích hợp RBAC vào client**: Ẩn/hiện nút "Đổi tên", "Xóa", "Upload", "Tạo thư mục" linh động theo sessionUser và `permissions.ts` (không cần reload/redirect).
- **Metadata Viewer**: Giao diện Viewer nay đã hiển thị loại hồ sơ, ghi chú, trạng thái badge màu theo `DocumentStatus` và mã Hash băm.
- **Chỉnh sửa metadata/status**: Đã xây dựng 2 Dialog nhỏ trực tiếp tại `document-workspace.tsx` hỗ trợ đổi trạng thái kèm "Lý do từ chối" và đổi "Loại hồ sơ", "Tên hiển thị", "Ghi chú".
- **Upload Flow nâng cấp**: Preflight upload form hiện nay cho phép nhập ngay tên tài liệu (`displayName`), chọn Loại hồ sơ (`documentType`) và Ghi chú (`note`) để gửi trực tiếp trong form data lên API.

## 3. Các bước tiếp theo (Next Steps)
1. User cung cấp **URL GitHub Private mới** để commit và push code của `construction-erp-v2-clean`.
2. Có thể triển khai test nội bộ, kiểm thử chức năng **Cập nhật trạng thái duyệt** bởi các role khác nhau.
3. Sau khi xác nhận B1 hoạt động chuẩn, có thể chuyển sang chuẩn bị **Phase C** (Storage chuyên nghiệp như AWS S3/MinIO) hoặc tiến tới **Phase B2** (Workflow Approval nâng cao - nếu cần thiết).

**Trạng thái Repository**: Code đang hoàn toàn sạch `storage/`, compiled qua TypeScript thành công và sẵn sàng để commit push!
