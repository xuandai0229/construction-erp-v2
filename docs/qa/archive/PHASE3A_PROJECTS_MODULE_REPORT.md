# Báo Cáo Phase 3A: Module Công Trình (Projects CRUD)

**Ngày giờ thực hiện**: 2026-06-08
**Workspace hiện tại**: `D:\construction-erp-v2`

## 1. Trạng thái kiểm tra an toàn
- Working tree: Đã xác nhận không có file rác chưa commit.
- `.env`: An toàn, không bị Git track.

## 2. Thay đổi Database & Migration
- Nhận thấy lược đồ `Project` chưa có 2 trường tùy chọn theo đặc tả (Chủ đầu tư, Địa điểm). 
- Đã thêm `owner String?` và `location String?` vào mô hình `Project`.
- Đã chạy migration thành công: `20260608025514_add_project_owner_location`.

## 3. Quản lý danh sách công trình (`/projects`)
- Hiển thị danh sách đầy đủ dưới dạng bảng (table).
- Cột dữ liệu: Mã CT, Tên công trình, Chủ đầu tư, Địa điểm, Trạng thái (được gắn Badge màu chuyên nghiệp), Ngày BĐ - Ngày KT, Hành động.
- Tính năng tìm kiếm: Có thể gõ tìm theo Mã, Tên hoặc Chủ đầu tư (sử dụng query mode `insensitive`).
- Tính năng lọc: Có Dropdown cho phép lọc theo Trạng thái dự án.
- Tự động hiển thị thẻ `EmptyState` khi không tìm thấy kết quả hoặc bảng chưa có dữ liệu.

## 4. Server Actions & Validation (Form & Zod)
- **Tệp xử lý**: `src/app/(dashboard)/projects/actions.ts`
- Xác thực form đầu vào bằng `zod`: Yêu cầu Mã và Tên công trình không được bỏ trống.
- **Tạo mới công trình**:
  - Kiểm tra sự trùng lặp của Mã công trình ở mức DB. Nếu trùng sẽ báo lỗi rành mạch tiếng Việt.
  - Sau khi chèn bảng Project, hệ thống dùng Prisma `$transaction` để tự động khởi tạo 08 thư mục mặc định (Hợp đồng, Bản vẽ, Dự toán, Nghiệm thu, Hóa đơn, Thanh toán, Hình ảnh, Báo cáo ngày) vào bảng `DocumentFolder`.
- **Cập nhật công trình**:
  - Không cho phép sửa mã công trình ở giao diện (`readOnly={true}`). 
  - Khóa bắt lỗi ở server phòng trường hợp giả mạo API để đổi mã.
- **Xóa mềm công trình**:
  - `deleteProject(id)` cập nhật trường `deletedAt` với `new Date()`. Không sử dụng lệnh xóa vật lý `delete()`.
  - Trên UI luôn sử dụng `window.confirm` để người dùng xác thực ý định trước khi tiến hành xóa.

## 5. Security & Kiểm soát truy cập (Auth & Permissions)
- Áp dụng Server Action block: Tất cả Action (Create, Update, Delete) đều gọi hàm `getSession()`.
- Chặn Role: Chỉ `ADMIN` hoặc `DIRECTOR` mới được quyền sửa đổi, trả về chuỗi error nếu Role không hợp lệ.

## 6. Truy Vết (Audit Log)
- Áp dụng triệt để hàm `writeAuditLog` có sẵn của Phase 2A để lưu vết vào DB:
  - `CREATE`: Ghi `afterData`.
  - `UPDATE`: Ghi `beforeData` và `afterData`.
  - `SOFT_DELETE`: Ghi `beforeData` (để biết bản ghi trước khi bị xóa) và `afterData` (đã có deletedAt).

## 7. Trang Chi Tiết (`/projects/[id]`)
- Hiển thị thông tin tổng quan, danh sách thư mục đã được khởi tạo tự động.
- Trình bày 4 Dashboard Card đại diện cho 4 phân hệ tương lai:
  - Hạng mục (WBS)
  - Hợp đồng
  - Báo cáo hiện trường
  - Nhật ký hệ thống

## 8. Kết quả QA Cuối Cùng
- `npx prisma validate`: **Passed**.
- `npx tsc --noEmit`: **Passed** (Đã giải quyết toàn bộ xung đột Zod Error Generic và React Slot Type).
- `npm run build`: **Passed** hoàn hảo. Mã HTML build ra không chứa lỗi ẩn, sẵn sàng deploy.

## 9. Đề xuất Phase 3B
Sau khi module Công Trình đạt chuẩn, ta có thể xây dựng:
- **Phase 3B**: Cấu trúc module Hạng Mục (WBS) dạng cây phân cấp (có `parentId`) liên kết trực tiếp với dự án vừa tạo. Hoặc triển khai module Document để nạp file vào các thư mục mặc định.
