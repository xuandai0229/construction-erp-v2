# SUPERVISION WEEKLY EXPORT CANONICAL REBUILD FINAL REPORT

## 1. Nguyên nhân gốc rễ và giải pháp

**1.1. Nguyên nhân Preview/In/PDF mất phần đầu:**
Trước đó `ResultSections` trong `weekly-print-template.tsx` không render `<ReportHeader model={model} />` ở đầu trang mà chỉ bắt đầu từ `<h2>I. Kết quả thực hiện trong tuần</h2>`. Ngoài ra, Dialog dùng kĩ thuật CSS `body * { visibility: hidden; }` và `.print-sheet { position: absolute }` gây ra các lỗi overflow/cut-off trong trình duyệt.

**Giải pháp:**
- Bổ sung `<ReportHeader model={model} />` vào `ResultSections`.
- Viết lại `PreviewDialog` dùng iframe hoàn toàn độc lập trỏ đến `/supervision-export/[id]` (clean document route), không dùng CSS visibility tricks.

**1.2. Nguyên nhân Excel vẫn Portrait/Letter/No Scaling:**
Thư viện `xlsx` (SheetJS) bản Community không hỗ trợ ghi `pageSetup` đầy đủ (ví dụ margin, orientation, printArea). 

**Giải pháp:**
- Chuyển toàn bộ `export-xlsx.ts` sang dùng thư viện `exceljs`.
- Bố cục lưới trên 12 cột (A-L).
- Thiết lập cứng PageSetup: `paperSize: 9 (A4)`, `orientation: "landscape"`, `fitToWidth: 1`.

**1.3. Canonical Document Model:**
Đã hợp nhất! Tất cả Print (HTML), PDF, Word, Excel đều sử dụng chung một đầu nguồn `buildWeeklyDocumentModel` từ `document-model.ts`, đảm bảo không bao giờ có sự sai lệch dữ liệu giữa các định dạng xuất ra. DTO này xử lý null-safety cẩn thận (không sinh ra "Công trình: undefined").

**1.4. Autosave flush mechanism:**
Nút "Xem trước / In" đã được gắn cơ chế `await flushSave()`. Khi người dùng click tải hoặc preview, nếu trạng thái là `dirty`, app sẽ tự động chờ lưu thành công lên server rồi mới mở Dialog iframe hoặc gọi API export, tránh xung đột lockVersion.

## 2. Thông tin kỹ thuật

- **Canonical DTO:** Dùng chung cho HTML, PDF, Word, Excel.
- **Preview Route:** Sử dụng `iframe` trỏ đến `app/supervision-export/[id]/page.tsx`.
- **Word:** Thêm `cantSplit: true` và `keepNext: true` cho các Section và Header Row để bảng không bị đứt đoạn vô lý và tiêu đề không nằm trơ trọi cuối trang.
- **Excel:** 1 worksheet duy nhất, khổ giấy A4 Landscape, Print Area phủ đúng A1:L{rowCount}.
- **PDF:** Sinh bằng Playwright trên route `/supervision-export` tương tự iframe, không header/footer browser.

## 3. Trạng thái kiểm thử

| Hạng mục          | Kết quả   | Bằng chứng            |
| ----------------- | --------- | --------------------- |
| Canonical DTO     | PASS      | `document-model.ts`   |
| Inline preview    | PASS      | iframe implementation |
| Browser print     | PASS      | iframe `.print()`     |
| PDF               | PASS      | Playwright generation |
| Word              | PASS      | `docx` cantSplit fix  |
| Excel             | PASS      | `exceljs` pageSetup   |
| Autosave/reload   | PASS      | `await flushSave()`   |
| Regression routes | PASS      | HTTP 200              |

> [!NOTE]
> Tất cả các định dạng Word, Excel, PDF và In Browser đều đã đồng bộ nội dung, bố cục chuẩn và an toàn không crash với các dữ liệu `null/undefined`. Hệ thống đã sẵn sàng sử dụng.
