# REPORTS PHASE 6: EXPORT PDF / PRINT REPORT

## A. Phương án Export đã chọn
- **Phương án:** HTML Print Route kết hợp CSS `@media print`.
- **Vì sao chọn:** Dễ triển khai, tương thích tốt với mọi trình duyệt, không yêu cầu cài đặt dependency nặng như Puppeteer (Puppeteer thường gặp lỗi font chữ và permission trên môi trường server). Dựa trên layout Next.js app router mới, trang in hiển thị full-screen không bị ảnh hưởng bởi Dashboard Sidebar.

## B. File/Route/Component đã sửa/tạo
1. **Route mới:** `src/app/print/reports/[reportId]/page.tsx`
   - Hiển thị bản in A4 sử dụng HTML/CSS.
   - Load dữ liệu từ DB (Bao gồm Report, lines, attachments, auditLogs).
2. **Component `reports-table.tsx`:** Thay thế chức năng "Tải xuống" thành nút "In / Xuất PDF" bằng icon `Printer` và mở cửa sổ mới đến trang in (`/print/reports/[reportId]`).
3. **Component `report-detail-drawer.tsx`:** Thay thế nút "Tải xuống" giả lập thành nút "In / Xuất PDF", đổi icon sang `Printer`.

## C. Nội dung Report Ngày
Trang in hiển thị đúng các tiêu chuẩn được yêu cầu:
- Header: BÁO CÁO HIỆN TRƯỜNG NGÀY
- Thông tin: Mã báo cáo, Công trình, Thời gian, Người lập, Trạng thái, Thời tiết.
- Bảng công việc chi tiết: STT, Hạng mục, Khu vực, ĐVT, Khối lượng, Ghi chú.
- Các vấn đề & Tài nguyên: Vật tư, Nhân công, Máy móc, Chất lượng, Kiến nghị (Chỉ hiển thị phần có dữ liệu).
- Danh sách file đính kèm.
- Lịch sử duyệt chi tiết với format ngày giờ chuẩn.
- Footer chữ ký: Người lập báo cáo, Chỉ huy trưởng, Người phê duyệt.
- Hình ảnh đính kèm: Render thành thẻ `img` grid 2 cột (sẽ tự động page-break nếu nhiều).

## D. Nội dung Report Tuần
Trang in cho báo cáo tuần:
- Header: BÁO CÁO HIỆN TRƯỜNG TUẦN
- Thông tin: Mã BC, Công trình, Từ ngày - Đến ngày, Người lập, Đánh giá chung.
- Bảng tổng hợp tuần: Tương tự báo cáo ngày nhưng không có cột "Khu vực" (do đã gom nhóm) và đổi tên cột thành "Khối lượng tuần".
- Vấn đề phát sinh tuần & Kế hoạch tuần tiếp theo.
- Lịch sử trạng thái và Chữ ký đầy đủ.
- Ẩn hoàn toàn thông tin Thời tiết do không cần thiết.

## E. RBAC Export
- Trang route in là một route Next.js server component. Có kiểm tra session: Chưa login bị redirect ra ngoài.
- `Admin`/`Director`: Xem/in được toàn bộ báo cáo của hệ thống.
- `Người lập (Creator)`: Chỉ được in báo cáo do mình tạo. 
- **Bảo mật file:** Không expose thư mục hệ thống cho thẻ `<img src="..." />`, sử dụng API Endpoint `/api/reports/attachments/[id]` có kiểm soát authentication thay vì đường dẫn vật lý. 
- *TODO*: Vẫn cần xây dựng cơ chế RBAC phân cấp theo dự án cho Manager để họ xem báo cáo dự án mà họ phụ trách.

## F. UAT Checklist
- [x] Nút "In / Xuất PDF" hoạt động tốt từ bảng Dashboard và Drawer.
- [x] Trang in mở ra tab mới và ẩn header/sidebar dashboard.
- [x] Nhấn Ctrl+P hoặc nút In hiển thị bản xem trước PDF cực chuẩn, khổ A4, không vỡ layout, không tràn bảng.
- [x] Báo cáo ngày hiển thị đủ thời tiết/nhân công.
- [x] Báo cáo tuần không hiển thị rác dữ liệu, gom khối lượng chuẩn xác.
- [x] Tiếng Việt hiển thị bình thường.
- [x] Ảnh hiện trường render đầy đủ ở cuối trang.
- [x] Không còn lỗi ESLint/Typescript sau khi build lại.

## G. Lỗi Runtime và Trạng thái Xử lý (Bổ sung sau Test)
- **Sự cố phát hiện:** Lỗi `Event handlers cannot be passed to Client Component props` do truyền `onClick={...}` vào button bên trong `src/app/print/reports/[reportId]/page.tsx` (mặc định là Server Component).
- **Cách khắc phục:**
  - Giữ nguyên kiến trúc Server Component cho `page.tsx` để tận dụng server auth, Prisma query mà không expose API.
  - Tách block UI chứa nút In/Lưu và nút Đóng thành Client Component riêng biệt tại `src/components/reports/print-report-toolbar.tsx` (có chỉ thị `"use client"`).
  - Component `print-report-toolbar.tsx` sử dụng thuần túy Web API `window.print()` và `window.close()`.
  - Các nút gọi lệnh in tại Table và Drawer đều đã được kiểm tra (do các files này đã có `"use client"`).
- **Kết quả Test lại:** Truy cập thành công, UI render bình thường, luồng export PDF hoạt động trơn tru.

## H. Rủi ro còn lại (Production Risks)
- Dự án còn thiếu cơ chế Sync `FieldProgress`.
- DB Constraint như `reportNo` uniqueness vẫn check ở Application-level.
- Cần dọn rác các file đính kèm nếu báo cáo chưa submit bị xóa bỏ (Soft-deleted hoặc Abandoned Drafts).
- Project-level RBAC cần được xử lý triệt để ở phase tiếp theo.

## K. Go/No-Go & Phase 6.1 Final Verification
- **Xác minh Phase 6.1:** `PASS`. Đã kiểm tra lại trang in, chạy build/tsc/eslint độc lập thành công 100%. Print Export daily & weekly hoàn hảo, không còn lỗi runtime. Ảnh hiện trường tải đầy đủ trong bản in.
- **Phase 6 Tổng quát:** `PASS`
- **UAT nội bộ:** `GO`
- **Production:** `NO-GO` (Chờ xử lý các tính năng bảo mật, cleanup và FieldProgress Sync).

## L. Xác nhận
- Không tạo/xóa dữ liệu DB.
- Không commit/push.
- Sẵn sàng bàn giao tính năng Print PDF.
