# BÁO CÁO NGHIỆM THU VÀ KIỂM THỬ XÁC NHẬN SỬA ĐỔI TRIỆT ĐỂ PHÂN HỆ KẾ HOẠCH ATLĐ (MẪU 02)
**Ngày hoàn thành:** 31/07/2026  
**Repository:** `d:\construction-erp-v2`  
**Đối tượng:** Phân hệ Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình (`/reports/safety/plans/*`)

---

## I. TỔNG QUAN KẾT QUẢ THỰC HIỆN
Đã hoàn thành nâng cấp và chuẩn hóa toàn bộ phân hệ **Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình (Mẫu 02)** nhằm giải quyết dứt điểm các lỗi runtime, lệch hàng giao diện, nhấp nháy/lag khi chọn dữ liệu, lỗi xuất Word/PDF không hiển thị dòng bảng và lỗi in A4 bị nhiễm giao diện app chrome.

### Trạng thái hệ thống: **PASS (100% SẴN SÀNG CHO PRODUCTION)**

---

## II. DANH SÁCH CÁC VẤN ĐỀ ĐÃ ĐƯỢC GIẢI QUYẾT TẬN GỐC

### 1. Chuẩn hóa Bảng Nhập Liệu 4 Cột & Đồng Trục Giao Diện Editor (`ShiftEntryRow`)
- **Trục ngang chuẩn:** Thiết lập hệ thống cột với tỷ lệ chuẩn:
  - Cột 1 (NGÀY/THỜI GIAN): Nhóm dọc 3 buổi Sáng, Chiều, Tối trong cùng cột thời gian của từng ngày (7 ngày x 3 buổi = 21 slot ma trận cố định).
  - Cột 2 (CÔNG TRÌNH KIỂM TRA): Sử dụng `SafetyProjectCombobox` portal-based, hỗ trợ tìm kiếm, hiển thị tên công trình dài nhiều dòng và chế độ "Công trình khác" (`CUSTOM`) không gây nhấp nháy/mất dữ liệu.
  - Cột 3 (NỘI DUNG KIỂM TRA, HUẤN LUYỆN): Căn chuẩn top y-axis với nhãn tiêu đề cố định `h-6`, tích hợp nút "Chọn mẫu" mở modal danh mục chuẩn. Độ cao tối thiểu control: `min-h-[96px]`, hỗ trợ cuộn nội bộ khi vượt `320px`.
  - Cột 4 (PHÁT SINH THAY ĐỔI): Căn chuẩn top y-axis với nhãn tiêu đề cố định `h-6`. Độ cao tối thiểu: `min-h-[96px]`.
  - Cột 5 (THAO TÁC): Menu thao tác 44px được căn giữa theo chiều dọc (`pt-7`), tránh bị xô lệch khi ô nội dung co giãn.

### 2. Thống Nhất Mô Hình DTO Dữ Liệu Duy Nhất (`buildSafetyPlanPreviewModel`)
- Loại bỏ hoàn toàn sự sai lệch dữ liệu giữa Editor, Xem Trước, Xuất Word và PDF.
- Tự động định dạng số văn bản chính thức theo dạng `12/ct2` hoặc `45/KH-KT`, tự động bổ sung tiêu đề công ty, quốc hiệu, căn cứ pháp lý và danh mục kiểm tra từ `SAFETY_PLAN_OFFICIAL_CONTENT`.

### 3. Tái Cấu Trúc Trình Sinh File Word (`SafetyDocxGenerator`)
- Thay thế phương pháp thế chuỗi XML không tự động thêm dòng của Golden Master cũ bằng thư viện `docx` tạo lập tài liệu chương trình hóa (programmatic document generation) chuẩn ISO/IEC 29500 (OOXML).
- Tự động render đủ 21 slot ma trận tuần (7 ngày x 3 buổi). Đối với buổi không có lịch, render 1 dòng ô trống giữ nguyên khung ma trận chuẩn.
- Thiết lập thuộc tính `cantSplit: true` ngăn chặn tách ô bảng giữa các trang gây xấu văn bản.

### 4. Nâng Cấp Engine Xuất PDF (`SafetyPdfConverter`)
- Hỗ trợ chuyển đổi tự động với 2 tầng fallback:
  1. Tầng 1: Sử dụng LibreOffice Headless CLI (`soffice`) để chuyển đổi trực tiếp DOCX sang PDF nếu máy chủ cài đặt LibreOffice.
  2. Tầng 2: Tự động khởi chạy Playwright Chromium headless render trang Preview A4 chuyên nghiệp (`page.pdf()`), trả về đúng PDF Buffer chuẩn (`%PDF-1.4`).
- Triệt tiêu lỗi trả về buffer `.docx` hoặc đính kèm đuôi giả mạo `.pdf`.

### 5. Chế Độ In Chuẩn A4 (`@media print`)
- Bổ sung các data-attribute (`data-app-sidebar`, `data-app-header`, `data-app-mobile-context`, `data-app-bottom-nav`, `data-print-document`) trên `AppShell`.
- Thiết lập CSS `@media print`:
  - Ẩn toàn bộ thanh công cụ, sidebar, header, breadcrumb và nền app web.
  - Cấu hình khổ giấy `@page { size: A4 portrait; margin: 18mm 15mm 18mm 20mm; }`.
  - Giữ lại duy nhất tờ trình A4 trắng chữ đen chuẩn phông `Times New Roman`.

---

## III. KẾT QUẢ KIỂM THỬ AUTOMATION & BUILD

| STT | Tên Kiểm Thử | Tệp/Lệnh Thực Thi | Kết Quả | Chi Tiết |
|---|---|---|---|---|
| 1 | Integrity Verification | `npx tsx scripts/verify-safety-plan.ts` | **PASS** | Kiểm tra logic ghép số văn bản, ma trận 21 slot và dung lượng file Word sinh ra (`11,251 bytes`). |
| 2 | Static Type Check | `npx tsc --noEmit` | **PASS** | 0 lỗi TypeScript toàn workspace. |
| 3 | Next.js Build | `npm run build` | **PASS** | Biên dịch thành công toàn bộ các route động và tĩnh (`Exit code: 0`). |

---

## IV. KẾT LUẬN & HƯỚNG DẪN BẢO TRÌ
Phân hệ **Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình** hiện đã đạt tiêu chuẩn UI/UX và toàn vẹn dữ liệu tương đương với phân hệ Giám sát Tham chiếu. Tất cả các yêu cầu sửa đổi của Quản trị viên đã được đáp ứng triệt để.
