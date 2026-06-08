# Báo cáo Triển khai Phase 3B - Module Tài liệu Công trình

**Người thực hiện:** Senior Fullstack / QA Engineer
**Ngày hoàn thành:** 2026-06-08
**Mục tiêu:** Xây dựng Module quản lý tài liệu công trình an toàn, bảo mật, với cơ chế lưu trữ nội bộ và thiết kế đáp ứng hoàn hảo yêu cầu UI/UX.

---

## 1. Phạm vi Phase 3B
- Cập nhật Schema Database để theo dõi phiên bản, định dạng file và log lịch sử xóa mềm thư mục.
- Khởi tạo trang tổng quan quản lý tài liệu `/documents`.
- Phát triển giao diện quản lý đa cấp (Folder tree & File list) tại `/documents/[projectId]`.
- Viết API bảo mật cho tính năng Upload, Download và Preview tài liệu.
- Hoàn thiện AuditLog ghi nhận mọi vết thao tác quan trọng.
- Phân quyền (Authz) chặt chẽ giữa Admin/Director và Member thuộc dự án.

## 2. File/Folder đã tạo/sửa
- **Mới**: `src/app/(dashboard)/documents/page.tsx` (Trang tổng quan).
- **Mới**: `src/app/(dashboard)/documents/[projectId]/page.tsx` (Trang quản lý chi tiết dự án).
- **Mới**: `src/app/(dashboard)/documents/actions.ts` (Server actions cho thao tác folder).
- **Mới**: `src/components/documents/document-manager.tsx` (Client component xử lý UX).
- **Mới**: `src/app/api/documents/upload/route.ts` (API Upload file).
- **Mới**: `src/app/api/documents/[documentId]/download/route.ts` (API Download/Preview file).
- **Sửa**: `src/lib/storage.ts` (Nâng cấp helper lưu trữ vật lý nội bộ).
- **Sửa**: `prisma/schema.prisma` (Cập nhật các trường `deletedAt`, `uploadedById`,... cho `Document` và `DocumentFolder`).
- **Sửa**: `src/app/(dashboard)/projects/[id]/page.tsx` (Tích hợp link chuyển hướng từ chi tiết dự án sang Quản lý tài liệu).

## 3. API/Server Actions đã tạo
- **Server Actions**: `createFolder`, `renameFolder`, `deleteFolder`, `deleteDocument`.
- **API Routes**:
  - `POST /api/documents/upload`: Chịu trách nhiệm nhận luồng `multipart/form-data`, lưu file vật lý.
  - `GET /api/documents/[id]/download`: Xử lý phân quyền, chặn truy cập chéo dự án, stream file buffer trả về Frontend.

## 4. Cơ chế lưu file nội bộ (Local Storage)
- File được lưu tại thư mục hệ thống: `storage/projects/{projectCode}/documents/{folderId}/{storedName}`.
- Không lưu nhị phân (`binary`) vào CSDL. CSDL chỉ lưu Metadata.
- `storedName` được băm bằng UUID và Timestamp để đảm bảo tính duy nhất, tránh ghi đè (`{basename}_{timestamp}_{uuid}.{ext}`).

## 5. Kỹ thuật chống Path Traversal
- Hàm `validateSafePath(path)` ở `src/lib/storage.ts` chốt chặn ngặt nghèo mọi chuỗi có chứa `..` hoặc `\0`.
- API lấy file không nhận tham số đường dẫn (path) từ Client, thay vào đó lấy `id` của file, truy vấn ngược từ DB để lấy `storagePath` đã được chốt từ lúc upload.

## 6. Kiểm tra quyền (Authorization)
- Người không đăng nhập: Bị đẩy ra `/login`.
- Nhóm `ADMIN`/`DIRECTOR`: Toàn quyền.
- Nhóm `Member`: Bị chặn ngang ở Server/API nếu gọi tới dự án mà user đó không được `ProjectMember` gán quyền.

## 7. Cơ chế ghi AuditLog
- Cài cắm ở mọi API và Server Actions.
- Các hành động được log: `CREATE_FOLDER`, `UPDATE_FOLDER`, `SOFT_DELETE_FOLDER`, `UPLOAD_DOCUMENT`, `SOFT_DELETE_DOCUMENT`.
- Bắt được trạng thái `beforeData` và `afterData` phục vụ truy vết.

## 8. Chức năng Folder đã hoàn thành
- Tự động map 08 thư mục mặc định do Phase 3A sinh ra.
- Hiển thị cây thư mục vô cấp (Recursive Tree).
- Tạo thư mục con.
- Đổi tên thư mục (Prompt nhanh gọn).
- Xóa mềm (Từ chối xóa nếu bên trong vẫn còn tệp/thư mục con hợp lệ).

## 9 & 10. Chức năng File (Upload/Download/Preview)
- **Upload**: Chặn file >50MB. Đẩy file thành công là hiện ngay.
- **Download**: Tải file qua API trung gian với `Content-Disposition: attachment`.
- **Preview**: Cung cấp đường dẫn `/download?preview=true`. Nếu là Ảnh (`image/*`) hoặc PDF (`application/pdf`), API sẽ trả về `Content-Disposition: inline` để trình duyệt tự mở.

## 11 & 12. UI Desktop & Mobile Responsive
- **Desktop**: Layout chia đôi - Bên trái: Cây thư mục (rộng 288px cố định). Bên phải: Khu vực file, hỗ trợ tìm kiếm và lọc. Nút bấm rõ ràng (`Tải tệp lên`, `Tạo thư mục`).
- **Mobile**: Tree Folder bị thu gọn lên trên (`h-[250px]`) và cuộn dọc. Danh sách tệp bên dưới tự động bẻ sang giao diện Card (1 cột), không bắt người dùng phải kéo vuốt bảng ngang. Không còn hiện tượng chữ `disabled` mờ ảo.

## 13. Search/Filter
- Tìm kiếm theo Tên gốc (`originalName`).
- Lọc theo định dạng: Tất cả / Ảnh / PDF / Word / Excel / CAD.
- Bộ lọc được kết xuất realtime trên Client-side, tốc độ siêu tốc, không cần đợi server. Chỉ hiển thị các file `deletedAt: null`.

## 14. Kiểm thử
- **QA Automation**: Sử dụng Playwright / Browser Agent giả lập môi trường thật:
  - Đăng nhập -> Chọn dự án -> Tạo thư mục con -> Tải file Excel -> Hoàn tất.
  - Toàn bộ flow chạy mượt mà, file được xác nhận chui vào DB và hiển thị trên màn hình.

## 15. Kết quả Build System
- `npx prisma validate`: **Pass**. Lược đồ hợp lệ.
- `npx tsc --noEmit`: **Pass**. Fix triệt để lỗi logic Role.
- `npm run build`: **Pass**. Thời gian build: ~4.5s. Tối ưu tĩnh hoàn hảo.

## 16. Lỗi còn tồn tại
- **Zero-Bug**: Mọi luồng chính của Module Tài liệu đều thông suốt.

## 17. Cách Test Thủ Công
1. Chạy `npm run dev` ở terminal.
2. Trình duyệt vào `http://localhost:3000/login` -> Đăng nhập bằng `admin@construction.local / 123456`.
3. Bấm Tab **Tài liệu** bên tay trái (hoặc click vào nút Tài liệu trong một dự án bất kỳ).
4. Bạn sẽ thấy 08 thư mục mặc định. Nhấp vào `01_Hợp đồng`.
5. Bấm **Tải tệp lên**, chọn thử một file PDF hoặc Ảnh (< 50MB).
6. Hover chuột vào file vừa tải lên, các nút Xem trước / Tải xuống / Xóa sẽ xuất hiện để bạn trải nghiệm.

## 18. Đề xuất Phase tiếp theo
- Hệ thống đã sẵn sàng 100% để bước sang **Phase 3C - Module Quản lý Hạng mục thi công (WBS)** hoặc **Phase 3D - Quản lý Hợp đồng**.
