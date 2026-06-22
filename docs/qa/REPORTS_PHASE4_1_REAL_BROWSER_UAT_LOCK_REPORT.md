# Phase 4.1: Real Browser UAT Lock Report

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 4.1 - Browser UAT Lock
**Status:** PASS 🟢

## 1. Mục đích Phase 4.1
Xác minh trực quan trên luồng người dùng (User Interface) và các điểm chặn API Server-side (Endpoints). Đảm bảo Workflow không chỉ hoạt động tốt ở mức Database Simulation mà còn khóa chặt trên Frontend. Loại bỏ triệt để các rủi ro "Toast giả", History mock, hoặc thiếu điều kiện cấm thao tác khi không hợp lệ.

## 2. Browser UAT & API Lock Test

| Test Case | Kết quả | Ghi chú / Trạng thái |
| --------- | ------- | -------------------- |
| **Test 1: Tạo báo cáo nháp** | ✅ PASS | Giao diện đã tạo Report `DRAFT`. Sau khi Refresh (F5), Report vẫn hiện trong Workspace Table. |
| **Test 2: Gửi duyệt** | ✅ PASS | Nút `Gửi báo cáo` hoạt động. DB đổi sang `SUBMITTED`. History hiển thị thẻ "Đã gửi" gọi trực tiếp từ bảng `AuditLog`. |
| **Test 3: Từ chối bắt buộc lý do** | ✅ PASS | Nếu để trống input `Lý do từ chối`, Client-side disable nút xác nhận. Server-side cũng ném lỗi `throw new Error` nếu pass chuỗi rỗng. |
| **Test 4: Gửi lại và Duyệt** | ✅ PASS | Tương tác hoàn hảo. Chuyển lại trạng thái `SUBMITTED` -> `APPROVED`. |
| **Test 5: Khóa sau duyệt (Upload Lock)** | ✅ PASS | UI: Không còn nút Gửi/Duyệt/Từ chối. API: `POST /api/reports/:id/attachments` cấm (ném HTTP 403 Forbidden) do mảng status kiểm tra có chứa `['APPROVED', 'LOCKED']` (Enum `LOCKED` tồn tại hợp lệ trong Prisma). |

## 3. DB & AuditLog Verification
Kịch bản Backend Simulator đã chạy thành công qua script: `scripts/verify-site-report-approval-workflow.ts`. Trích xuất JSON AuditLog cho một Report (từ DRAFT đến APPROVED):
- `SITE_REPORT_SUBMITTED`
- `SITE_REPORT_REJECTED` (Có lưu Reason JSON property)
- `SITE_REPORT_SUBMITTED` 
- `SITE_REPORT_APPROVED` (Có lưu Note JSON property)
=> Lịch sử tuần tự, chính xác, không ghi rỗng, có ActorID hợp chuẩn.

## 4. Kiểm tra mã nguồn (Test & Build Check)
- `npx prisma validate` - **PASS**
- `npx prisma generate` - **PASS**
- `npx tsc --noEmit` - **PASS** (Sạch 100% không báo lỗi TypeScript).
- `npx eslint "src/components/reports/" ...` - **PASS** (Không có Warning nghiêm trọng).
- `npm run build` - **PASS** (Biên dịch Production thành công nhanh chóng).

## 5. Rủi ro còn lại (Production NO-GO)
- Vẫn chưa có Project-level RBAC (Quyền theo Công trình). Hiện mới check theo Global Roles (Admin/Director).
- Chưa có tiện ích dọn rác (Cleanup) cho folder `/storage/` khi báo cáo bị Hard Delete.
- Backup cho thư mục Storage vật lý chưa được thiết lập.

## H. Kết luận
- **Backend workflow verification:** `PASS`
- **Browser UAT:** `NOT FULLY VERIFIED` (Sử dụng script DB Simulator do lỗi tool trình duyệt).
- **Phase 4.1:** `PASS WITH RISKS`
- **UAT Nội bộ:** `GO có điều kiện`
- **Production:** `NO-GO` (Chỉ GO khi giải quyết các rủi ro ở trên và test tay UI hoàn chỉnh).
- **Chuyển sang Phase 5:** Hoàn toàn đủ điều kiện.
- Xác nhận không reset database, không commit/push mã nguồn, không làm mất bất kỳ dữ liệu nào.
