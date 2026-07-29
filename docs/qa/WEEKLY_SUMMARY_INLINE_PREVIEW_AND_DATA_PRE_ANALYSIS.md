# BÁO CÁO PHÂN TÍCH HIỆN TRẠNG & PHƯƠNG ÁN NÂNG CẤP ("TỔNG HỢP BÁO CÁO TUẦN INLINE PREVIEW & STRESS DATA")
**Tài liệu:** `docs/qa/WEEKLY_SUMMARY_INLINE_PREVIEW_AND_DATA_PRE_ANALYSIS.md`  
**Thời gian:** 28/07/2026  
**Phạm vi:** `/reports/field/weekly-summary?weekStart=YYYY-MM-DD`

---

## 1. KHẢO SÁT VÀ ĐÁNH GIÁ HIỆN TRẠNG CÁC THÀNH PHẦN

### 1.1. Luồng xem trước và in hiện tại
- **Cách mở bản xem trước:** Hệ thống mở route bản in `/print/reports/field/weekly-summary` trong tab mới hoặc mở cửa sổ riêng. Người dùng bị điều hướng rời khỏi ứng dụng (App Shell).
- **Hàm in:** Đang dùng `window.print()` trên route HTML.
- **Vấn đề tiêu đề/URL trình duyệt:** Việc in HTML bằng `window.print()` của Chrome sẽ tự động chèn ngày giờ ở góc trên, tên trang web và đường dẫn `http://localhost:3000/...` cùng số trang ở footer nếu người dùng không tắt bỏ tùy chọn "Đầu trang và chân trang" (Headers and Footers).
- **File PDF:** Chưa có endpoint sinh file PDF thực sự độc lập, phụ thuộc hoàn toàn vào chức năng "Save as PDF" của Chrome print dialog.

### 1.2. Logic tổng hợp báo cáo nguồn hiện tại
- **Logic cũ:** Đang thực hiện lọc hoặc sắp xếp ưu tiên theo trạng thái phê duyệt (`APPROVED > SUBMITTED > REVISION_REQUESTED > REJECTED > DRAFT`).
- **Thống kê KPI:** Đang hiển thị bảng/thẻ thống kê 5 loại trạng thái (Đã duyệt, Chờ duyệt, Cần bổ sung, Bị từ chối, Chưa nộp), vi phạm yêu cầu "Tất cả báo cáo tuần đều được tổng hợp, không phụ thuộc trạng thái phê duyệt".
- **Tiêu đề hành chính:** Có chứa mã `BC-BĐH`, `Phạm vi: Toàn bộ công trình`, `Thời điểm tổng hợp: ...` gây rườm rà.
- **Khối chữ ký:** Cuối tài liệu có khối 3 chữ ký (*NGƯỜI LẬP BÁO CÁO*, *BAN ĐIỀU HÀNH*, *GIÁM ĐỐC CÔNG TY*), tạo ra khoảng trống lớn hoặc trang trắng cuối tài liệu.

---

## 2. NGUYÊN NHÂN GỐC RỄ VÀ PHƯƠNG ÁN XỬ LÝ

| Vấn đề | Nguyên nhân gốc rễ | Phương án xử lý mới |
|---|---|---|
| Mở tab/route mới | Điều hướng link hoặc `window.open` tới `/print/...` | **Xem trước Inline Fullscreen Modal:** Mở React Portal Modal toàn màn hình ngay trên trang dashboard, không đổi URL, không mở tab mới. |
| URL/Header thừa khi in/PDF | Trình duyệt tự chèn khi dùng `window.print()` trực tiếp trên trang HTML | **Tạo file PDF thật Server-side:** Tạo endpoint `/api/reports/weekly-summary/export-pdf` xuất file PDF chuẩn A4, không có header/footer của Chrome. |
| Lọc theo trạng thái phê duyệt | Logic query/preferred selecting report cũ | **Loại bỏ lọc status:** Nhận tất cả báo cáo `SiteReport.type = 'WEEKLY'`, bất kể DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED... Chọn phiên bản mới nhất theo `updatedAt`/`createdAt`. |
| Hiển thị status & KPI phê duyệt | UI & Word render badge trạng thái và bảng KPI 5 ô | **Bỏ hoàn toàn KPI và nhãn status:** Xóa bảng thống kê trạng thái, xóa badge status, xóa cột trạng thái ở cả Web, Word và PDF. |
| Dòng thừa đầu văn bản | Hardcode `BC-BĐH`, scope, timestamp | **Chuẩn hóa đầu văn bản:** Giữ Tên công ty, Quốc hiệu, Tiêu ngữ, `Số: ................`, Ngày tháng. Bỏ `BC-BĐH`, scope, timestamp. |
| Khối chữ ký rườm rà | Khối chữ ký 3 cột ở cuối template | **Bỏ hoàn toàn khối chữ ký:** Tài liệu kết thúc ngay sau phần Chi tiết công trình / Nội dung xử lý. |

---

## 3. THAY ĐỔI TRONG VIEW MODEL DÙNG CHUNG (UNIFIED VIEW MODEL)

Tất cả 3 đầu ra (Web UI Dashboard & Modal, DOCX Export, PDF Export) bắt buộc dùng chung **Một View Model duy nhất**:
- `weekRangeFormatted`: "Tuần XX – Từ ngày DD/MM/YYYY đến ngày DD/MM/YYYY"
- `summaryCounts`: `{ totalProjects: number, reportedProjects: number, missingProjects: number }` (Dùng cho 1 dòng text tổng quan ngắn gọn trên Web UI).
- `projects`: Danh sách công trình đã được gộp phiên bản mới nhất:
  - `id`, `code`, `name`, `reporter`
  - `hasReport`: boolean
  - `result`: Nội dung kết quả hoặc `"Chưa có báo cáo tuần."`
  - `incompleteWork`: Công việc chưa hoàn thành / nguyên nhân
  - `issues`: Vướng mắc / khó khăn
  - `quality`: Chất lượng & an toàn
  - `resources`: Nhân lực, vật tư & thiết bị
  - `nextWeekPlan`: Kế hoạch tuần tới
  - `supportNeeded`: Nội dung cần xử lý
- **TUYỆT ĐỐI KHÔNG BỒI ĐƯỜNG TRẠNG THÁI PHÊ DUYỆT (NO APPROVED/PENDING STATUS FIELDS) RA NỘI DUNG TÀI LIỆU.**

---

## 4. QUY MÔ VÀ KẾ HOẠCH DỮ LIỆU QA STRESS TEST

- **Namespace:** `QA-WEEKLY-STRESS-2026`
- **Quy mô:**
  - 12 công trình công trường đa dạng (Dân dụng, Hạ tầng, M&E, San nền...).
  - 6 tuần liên tiếp (Tuần 26 đến Tuần 31 năm 2026).
  - Tối thiểu 72 báo cáo tuần (với đủ các trạng thái DRAFT, SUBMITTED, APPROVED, REJECTED, REVISION_REQUESTED, LOCKED).
  - Tối thiểu 360 - 504 báo cáo ngày tương ứng để khẳng định logic tổng hợp KHÔNG bị lẫn báo cáo ngày (`SiteReport.type = 'DAILY'`).
- **Nội dung dài và phong phú:** Mỗi báo cáo có đầy đủ các mục chi tiết từ 300–1.200 ký tự với thuật ngữ xây dựng chuyên ngành thực tế.
- **Trường hợp biên:** Tên công trình dài, mã dài, công trình không có báo cáo, công trình có 2 phiên bản cùng 1 tuần (chọn bản mới hơn).

---

## 5. DANH SÁCH FILE CẦN TẠO, SỬA VÀ CẤU TRÚC

| STT | File Path | Hành động | Mục đích |
|---|---|---|---|
| 1 | `src/lib/reports/weekly-company-summary.ts` | Refactor | Cập nhật logic query loại bỏ lọc status, chọn bản mới nhất theo updatedAt, bỏ nhãn phê duyệt khỏi View Model. |
| 2 | `src/components/reports/weekly-summary-inline-modal.tsx` | Tạo mới | Inline Fullscreen Modal xem trước ngay trên trang, tích hợp nút Tải Word, Tải PDF, In và Đóng. |
| 3 | `src/app/api/reports/weekly-summary/export-pdf/route.ts` | Tạo mới | Endpoint xuất file PDF sạch chuẩn A4 server-side (dùng PDFKit / HTML-to-PDF). |
| 4 | `src/app/api/reports/weekly-summary/export/route.ts` | Refactor | Cập nhật file Word (.docx) bỏ KPI status, bỏ BC-BĐH, bỏ chữ ký, khớp 100% View Model mới. |
| 5 | `src/components/reports/weekly-summary-client-view.tsx` | Refactor | Cập nhật Web UI bỏ KPI cards, bỏ badge status, chèn nút mở Inline Modal. |
| 6 | `src/app/print/reports/field/weekly-summary/page.tsx` | Refactor | Chuyển route cũ thành endpoint nội bộ cho PDF/automation hoặc redirect về trang chính. |
| 7 | `scripts/qa/assert-safe-weekly-summary-database.ts` | Tạo mới | DB Safety Guard ngăn seed nhầm môi trường production. |
| 8 | `scripts/qa/seed-weekly-summary-stress-data.ts` | Tạo mới | Script seed 12 công trình x 6 tuần x 72 báo cáo tuần + 360 báo cáo ngày. |
| 9 | `scripts/qa/verify-weekly-summary-stress-data.ts` | Tạo mới | Verification script kiểm tra 18 tiêu chuẩn dữ liệu stress QA. |
| 10 | `scripts/qa/cleanup-weekly-summary-stress-data.ts` | Tạo mới | Script dọn dẹp namespace QA stress data. |
| 11 | `src/lib/reports/__tests__/weekly-company-summary.test.ts` | Bổ sung | Vitest kiểm thử logic tổng hợp không lọc status, không lấy DAILY, chọn bản mới nhất. |
| 12 | `tests/weekly-company-summary.spec.ts` | Refactor | Playwright E2E test kiểm thử Inline Modal, Esc key, Tải PDF thật, Tải Word và 0 HTTP 500/Console error. |
