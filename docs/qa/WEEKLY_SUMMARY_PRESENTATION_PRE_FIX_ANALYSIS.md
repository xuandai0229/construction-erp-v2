# BÁO CÁO PHÂN TÍCH HIỆN TRẠNG VÀ PHƯƠNG ÁN SỬA ĐỔI ("TỔNG HỢP BÁO CÁO TUẦN")
**Tài liệu:** `docs/qa/WEEKLY_SUMMARY_PRESENTATION_PRE_FIX_ANALYSIS.md`  
**Thời gian:** 28/07/2026  
**Phạm vi:** `/reports/field/weekly-summary?weekStart=YYYY-MM-DD`

---

## 1. HIỆN TRẠNG HỆ THỐNG
Luồng nghiệp vụ "Tổng hợp báo cáo tuần" đã được đơn giản hóa thành mô hình "Một nút – Một thao tác" trực tiếp tại tab Báo cáo tuần (`/reports/field?tab=weekly`). Dữ liệu được tính toán thời gian thực từ các bản ghi `SiteReport` có `type = 'WEEKLY'`.

Tuy nhiên, về mặt trình bày và hỗ trợ xuất tài liệu/in ấn hiện còn các nhược điểm nghiêm trọng:
1. **Nút "In / Xuất PDF" không hoạt động:** Gắn sự kiện qua thẻ `<script dangerouslySetInnerHTML>` và `onClick={undefined}` trên Server Component, dễ bị ngắt kết nối sự kiện hoặc bị trình duyệt chặn, không có route bản in riêng chuyên biệt.
2. **File Word (`.docx`) khó đọc & thiếu chuẩn mực:** 
   - Font chữ nhỏ (8–9pt), ép tất cả cột vào trang dọc làm vỡ hàng và xuống dòng liên tục.
   - Thiếu tiêu đề hành chính chuẩn Việt Nam (Quốc hiệu, Tiêu ngữ, Tên công ty, Ngày tháng).
   - Chưa phân tách trang dọc (Portrait) cho phần tổng quan/chi tiết và trang ngang (Landscape) cho bảng tổng hợp.
   - Thiếu khu vực ký xác nhận (Người tổng hợp, Ban Điều hành, Giám đốc).
3. **Giao diện Web nhạt & thiếu độ tương phản:**
   - Sử dụng các màu xám nhạt (`text-slate-400`, `text-slate-500`) cho thông tin quan trọng.
   - Thẻ thống kê nhạt nhòa, bảng tổng hợp chưa có sticky header hay phân biệt dòng (zebra striping).
   - Chi tiết từng công trình chưa hỗ trợ thu gọn/mở rộng (Expand/Collapse), khiến trang quá dài khi có hàng chục công trình.

---

## 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### 2.1. Nguyên nhân nút In / Xuất PDF không hoạt động
- **Thiếu Route bản in chuyên dụng:** Trang web cố gắng gọi `window.print()` trực tiếp ngay trên trang dashboard chính vốn chứa toàn bộ thanh điều hướng, sidebar và header ứng dụng.
- **Hydration & Component Misconfiguration:** Nút in được render từ Server Component với handler không hợp lệ (`onClick={undefined}`) và phụ thuộc vào tập lệnh client chèn qua HTML string, bị vô hiệu hóa khi hydration diễn ra.
- **Không có trang in độc lập:** Chưa có route dạng `/print/reports/field/weekly-summary?weekStart=YYYY-MM-DD` hoàn toàn cách ly khỏi App Shell để người dùng/trình duyệt xuất PDF/Print chuẩn A4.

### 2.2. Nguyên nhân file Word (.docx) bị nhỏ và tràn lề
- **Cấu hình khổ trang đơn giản:** Toàn bộ file Word sinh ra trong 1 section trang dọc duy nhất (Portrait), ép 6–7 cột dữ liệu chi tiết vào bề ngang 16cm.
- **Cỡ chữ và định dạng:** Không quy định cụ thể `size` cho từng phần (hiện dùng cỡ chữ mặc định hoặc 20 half-points = 10pt quá nhỏ), padding ô bằng 0 khiến chữ dính sát đường viền.
- **Header/Footer & Tiêu đề:** Chưa áp dụng quy chuẩn văn bản hành chính Việt Nam (thiếu Quốc hiệu, Tiêu ngữ, Tên doanh nghiệp ở đầu trang).

---

## 3. THÀNH PHẦN TÁI SỬ DỤNG TỪ MẪU BÁO CÁO TUẦN HỆ THỐNG

Chúng ta có thể tái sử dụng quy chuẩn từ `ReportPrintTemplate` (`src/components/reports/report-print-template.tsx`) và `print/reports/[reportId]`:
1. **Đầu văn bản hành chính (Corporate Header):**
   - Bên trái: Tên Công ty / Đơn vị thi công + Số văn bản.
   - Bên phải: Quốc hiệu "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" / "Độc lập - Tự do - Hạnh phúc" + Địa danh, ngày tháng.
2. **Chuẩn định dạng ngày tháng tiếng Việt:** `Ngày DD tháng MM năm YYYY` và `DD/MM/YYYY`.
3. **Khối chữ ký xác nhận (Signatures):** 3 cột (Người tổng hợp, Ban Điều hành / Trưởng phòng, Giám đốc) kèm khoảng trống ký và họ tên.
4. **Cấu trúc dữ liệu dùng chung (Unified View Model):** Đảm bảo cả 3 đầu ra (Web UI, File Word `.docx`, Bản in/PDF) dùng chung 1 nguồn dữ liệu và logic format duy nhất (`WeeklyCompanySummary`).

---

## 4. DANH SÁCH FILE DỰ KIẾN TẠO MỚI VÀ CHỈNH SỬA

| STT | Đường dẫn file | Hành động | Mục đích |
|---|---|---|---|
| 1 | `src/lib/reports/weekly-company-summary.ts` | Chỉnh sửa | Chuẩn hóa View Model dùng chung cho Web, Word và PDF (format date, null-checks, label tiếng Việt). |
| 2 | `src/app/api/reports/weekly-summary/export/route.ts` | Tái cấu trúc | Thiết kế lại DOCX chuyên nghiệp: A4 Portrait + Section Landscape cho Bảng tổng hợp + Signatures + Font chuẩn 11.5-12pt. |
| 3 | `src/app/print/reports/field/weekly-summary/page.tsx` | Tạo mới | Route bản in chuyên dụng (A4, không sidebar, có toolbar in, gọi `window.print()` an toàn). |
| 4 | `src/components/reports/weekly-summary-print-toolbar.tsx` | Tạo mới | Toolbar client component hỗ trợ nút In / Lưu PDF và Quay lại. |
| 5 | `src/app/(dashboard)/reports/field/weekly-summary/page.tsx` | Tái cấu trúc | Nâng cấp UI/UX: Độ tương phản cao, nút in gọi route in mới, hỗ trợ Thu gọn/Mở rộng chi tiết công trình (Client Wrapper). |
| 6 | `src/components/reports/weekly-summary-client-view.tsx` | Tạo mới | Client component quản lý tương tác UI (Expand/Collapse all, Quick Nav, Filter status). |
| 7 | `src/lib/reports/__tests__/weekly-company-summary.test.ts` | Bổ sung | Thêm Vitest test cases cho View Model dùng chung, DOCX payload và định dạng tiếng Việt. |
| 8 | `tests/weekly-company-summary.spec.ts` | Bổ sung | Playwright E2E test thực sự tải file Word, mở route bản in và tạo PDF artifact thật. |

---

## 5. RỦI RO HỒI QUY VÀ BIỆN PHÁP PHÒNG NGỪA

1. **Rủi ro:** Sửa đổi logic tổng hợp làm thay đổi số liệu thống kê.  
   *Biện pháp:* Giữ nguyên logic query Prisma thời gian thực trong `getWeeklyCompanySummary`, chỉ chuẩn hóa View Model trình bày.

2. **Rủi ro:** File Word `.docx` bị lỗi khi mở trên Microsoft Word hoặc LibreOffice do sai cấu trúc Section.  
   *Biện pháp:* Kiểm tra kỹ cấu trúc `sections` trong `docx` library (chỉ đổi orientation ở level `section`, sử dụng đúng `PageOrientation.LANDSCAPE` và `PageOrientation.PORTRAIT`).

3. **Rủi ro:** Trình duyệt chặn Popup/New Tab khi người dùng bấm "In / Xuất PDF".  
   *Biện pháp:* Điều hướng trực tiếp đến route `/print/reports/field/weekly-summary?weekStart=YYYY-MM-DD` hoặc mở trong tab mới qua liên kết chuẩn `<a target="_blank">`.
