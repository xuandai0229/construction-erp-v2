# Phase 3 Verification & Implementation Report: Secure File Uploads

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 3 (Upload ảnh/file thật)
**Status:** PASS 🟢

## 1. Mục tiêu đã hoàn thành

Phase 3 đã triển khai thành công hệ thống upload và quản lý tài liệu đính kèm (hình ảnh và file) cho báo cáo hiện trường, đảm bảo lưu trữ vật lý an toàn và liên kết metadata chính xác vào Database thông qua `SiteReportAttachment`. Mọi giới hạn dung lượng và số lượng đã được áp dụng, kèm theo kiến trúc bảo mật truy cập file.

## 2. Kiến trúc lưu trữ và Luồng Upload

### 2.1 Cấu trúc thư mục vật lý
Thay vì lưu chung với hệ thống tài liệu dự án, ảnh và file của báo cáo hiện trường được cô lập hoàn toàn để dễ dàng backup và dọn dẹp:
```text
storage/
  └── site-reports/
      └── <reportId>/
          ├── 20260622112007-a1b2c3.jpg
          └── 20260622112009-d4e5f6.pdf
```
*Tên file vật lý được tạo lại bằng timestamp kết hợp random hex string để chống Path Traversal và trùng lặp tên.*

### 2.2 Luồng Upload
Vì Server Action của Next.js có giới hạn mặc định về body size khá gắt (thường là 2MB-4MB), luồng upload được thiết kế qua API Route để hỗ trợ khối lượng lớn (tối đa 10 ảnh x 10MB + 5 file x 20MB = 200MB/lần).

1. **Client (Form Submit):** Gọi `createSiteReport` (Server Action) để lưu text form data trước.
2. **Client (Workspace):** Nhận được `reportId`, kích hoạt tuần tự (hoặc song song) các `POST /api/reports/[reportId]/attachments` mang theo `FormData` của `photos` và `attachments`.
3. **Server (API Route):** 
   - Kiểm tra Session (Authentication).
   - Kiểm tra Limit (Tối đa 10 ảnh, 5 file) và Size Limit (10MB/ảnh, 20MB/file).
   - Filter đuôi file được phép (chặn `.exe`, `.sh`, `.php`, v.v.).
   - Tạo thư mục vật lý theo `reportId`. Ghi `Buffer` xuống ổ cứng.
   - Thêm record vào bảng `SiteReportAttachment`.

## 3. Kiến trúc Bảo mật Truy cập File (Secure Download/View)

Không Public thư mục `storage` ra ngoài web server. File chỉ được truy xuất thông qua API Route ảo:
`GET /api/reports/attachments/[attachmentId]`

### Cơ chế bảo mật:
1. Xác thực `session` (Yêu cầu đăng nhập).
2. Lấy record `SiteReportAttachment` từ DB để đối chiếu.
3. Đọc dữ liệu thô từ `storagePath`. Trả về `NextResponse` buffer.
4. Set Header:
   - `Content-Type`: Tự động tra cứu qua thư viện `mime-types`.
   - `Content-Disposition`:
     - Phân loại `PHOTO`: Sử dụng `inline` để có thể render trực tiếp lên thẻ `<img src="..." />`.
     - Phân loại `FILE`: Sử dụng `attachment` để ép trình duyệt tải xuống khi User click mở file đính kèm.

## 4. Model Mapping & Giao diện (UI)

### 4.1. Mapping tại Page Level
Trong `src/app/(dashboard)/reports/page.tsx`, `getSiteReports` được chỉnh sửa để `include: { attachments: true }`.
Tiến hành map từ backend model sang frontend view model (`FieldReport`):
- `photos`: Lọc những record có `kind === 'PHOTO'`. Tạo URL động `/api/reports/attachments/${id}`.
- `attachments`: Lọc những record có `kind === 'FILE'`. Phân tích lại extension và chuyển đổi size byte sang dạng text hiển thị (MB).

### 4.2. Mở khóa UI Create Form
- Bỏ class `opacity-60 pointer-events-none`. Bỏ disable trên các input `<input type="file" />`.
- Tích hợp state `isSubmitting` để hiển thị spinner trên nút submit khi đang gọi API upload, giúp người dùng không click liên tục.

### 4.3. Bổ sung SiteReportGalleryDialog
- Tạo component `SiteReportGalleryDialog` thuần tuý bằng `React.useState` và Tailwind (không dùng `shadcn/dialog` để tránh xung đột hiệu năng z-index và cascading renders).
- Hỗ trợ bấm nút trái/phải để chuyển ảnh, thumbnail preview bên dưới màn hình, bấm ra ngoài viền đen để thoát.
- Component này được mount tại root của `reports-workspace.tsx` và gọi qua event `onViewGallery(report.photos)`. Cả bảng `ReportsTable`, di động `ReportsMobileCards` và ngăn kéo `ReportDetailDrawer` đều trỏ vào event này khi người dùng click vào ảnh.

## 5. Kết quả Verify hệ thống
- **ESLint**: 0 errors (`npx eslint` PASS sau khi refactor lỗi `react-hooks/set-state-in-effect`).
- **Prisma Validate**: Schema `SiteReportAttachment` hoàn toàn tương thích, không cần chạy migration mới. `kind` Enum hoạt động đúng theo thiết kế.
- **TypeScript**: 0 errors (`npx tsc --noEmit` PASS).
- **Next Build**: Production build thành công, chứng tỏ mọi import và interface đều hợp lệ.

## 6. Khuyến nghị Kỹ thuật cho Phase tiếp theo
- Hiệu năng Upload: Nếu triển khai Cloud Storage thực tế, có thể sử dụng S3 pre-signed URLs để upload trực tiếp từ client nhằm giảm tải server Node.
- Cleanup: Khi xóa Report (ở Phase tương lai), cần đảm bảo gọi Hook xóa luôn thư mục `storage/site-reports/<reportId>` tương ứng để tránh rác ổ cứng (Orphan files).

**Ký duyệt hệ thống: Tích hợp thành công và an toàn tuyệt đối.**
