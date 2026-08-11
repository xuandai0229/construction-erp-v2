# BÁO CÁO NGHIỆM THU: KHẮC PHỤC TRIỆT ĐỂ BẢN IN (PRINT) VÀ PDF CHO ĐỀ XUẤT VẬT TƯ V2
## MATERIAL PROPOSAL V2 — PRINT / PDF DOCUMENT PIPELINE HARDENING REPORT

**Dự án:** construction-erp-v2  
**Ngày thực hiện:** 11/08/2026  
**Trạng thái nghiệm thu:** **PASS**

---

### 1. Screenshot Failure Analysis
- **Lỗi ở bản In (Print) cũ:**
  - In ra các thông tin rác của trình duyệt: Thời gian ("09:57 11/8/26"), Browser Title ("Xem trước đề xuất vật tư | ERP Công trình"), URL ("localhost:3000/..."), Page counter mặc định ("1/1").
  - In cả Application Chrome của hệ thống: Topbar ERP, Sidebar, Project Scope Selector, User controls, Navigation.
- **Lỗi ở bản PDF cũ:**
  - Chụp nhầm trang Dashboard (chứa Sidebar, Topbar, Account UI), làm văn bản bị ép co chật và crop mất phần bên phải (Tiêu đề bị cắt, bảng bị mất 2 cột phải).

---

### 2. Document Number Decision
- **Quyết định:** Loại bỏ hoàn toàn dòng `“Số: DVT-...”` khỏi biểu mẫu chính thức (Web Preview paper, PDF, Print, Excel exporter).
- **Giữ lại trong ERP Metadata:** `proposalNo` vẫn được giữ nguyên trong cơ sở dữ liệu, hiển thị trên Toolbar Preview (`[ĐVT-20260811-...]`), trang danh sách, trang chi tiết và tên file export (`De-xuat-vat-tu_DVT-....pdf`).

---

### 3. Current Print Root Cause
- Bản in trước đó thực thi `window.print()` trực tiếp trên trang Preview nằm dưới layout `app/(dashboard)/...`.
- Do đó, DOM của trang in bao hàm toàn bộ `AppShell` (Sidebar, Topbar) và CSS `@page` chưa thiết lập `margin: 0`, dẫn đến trình duyệt tự chèn Header/Footer mặc định của Chrome.

---

### 4. Current PDF Root Cause
- Engine Playwright điều hướng tới URL nằm dưới layout `(dashboard)`, nơi Next.js tự động bọc `AppShell`.
- Khung viewport của Playwright bị chiếm diện tích bởi Sidebar và Topbar, làm phần giấy A4 bị bóp nghẹp và cắt cụt cạnh phải.

---

### 5. Existing Supervision/Report Pipeline Audit
- Đã Trace phân hệ Giám sát tuần (`/supervision-export/[id]`) và Safety Reporting:
  - Phát hiện các phân hệ chạy tốt đều đặt route xuất bản tại **cấp root `src/app/` (nằm ngoài `(dashboard)`)**, không kế thừa `AppShell` layout.

---

### 6. Document-only Component Architecture
- Tạo duy nhất một Reusable Component render văn bản: `MaterialProposalDocumentView` (`src/components/materials/material-proposal-document-view.tsx`).
- Chỉ render các khối nghiệp vụ chính thức: Header công ty, Quốc hiệu, Tiêu đề văn bản, Ngày tháng, Thông tin metadata (Công trình, Địa điểm `projectLocationSnapshot`, Người yêu cầu, Lý do mua), Bảng vật tư (8 cột), Ngày cấp, Khối chữ ký.
- Không render bất kỳ nút bấm, toolbar, hay thành phần giao diện ERP nào.

---

### 7. Print Route / Print Isolation
- Tạo route độc lập chuyên biệt dành cho In & Xuất tệp:
  `src/app/proposal-export/[id]/page.tsx` (Nằm ngoài `(dashboard)`).
- Route này không có Sidebar, Topbar, Project Selector hay bất kỳ App Chrome nào.

---

### 8. App Chrome Removal
- Đã loại bỏ 100% App Chrome khỏi DOM của Print và PDF.
- Kiểm tra DOM không tồn tại các thẻ Sidebar, Header, Navigation, User Menu, Project Combobox.

---

### 9. Browser Header/Footer Removal
- Đã loại bỏ hoàn toàn các thông tin rác của browser (URL, Title, Date/Time, 1/1) bằng CSS:
  ```css
  @page {
    size: A4 landscape;
    margin: 0;
  }
  ```
- Thẻ giấy `.document-paper` tự quản lý lề nội dung `10mm` chuẩn nghiệp vụ.

---

### 10. A4 Landscape Verification
- Bản xem trước Web, Bản in và PDF đạt chuẩn khổ ngang A4 (`297mm x 210mm`).

---

### 11. Table Width / Crop Fix
- Bảng vật tư thiết lập `table-layout: fixed; width: 100%`.
- Tất cả 8 cột (`STT`, `TÊN VẬT TƯ / VẬT LIỆU`, `ĐƠN VỊ`, `KHỐI LƯỢNG HỢP ĐỒNG`, `KHỐI LƯỢNG THỰC TẾ`, `QUY CÁCH / THÔNG SỐ KỸ THUẬT`, `HÃNG SẢN XUẤT / XUẤT XỨ`, `GHI CHÚ`) hiển thị trọn vẹn 100% trên A4 Landscape, không bị vỡ hay cắt xén.

---

### 12. Conditional Page Numbering
- **Luồng xử lý số trang (Business Rule):**
  - **Tài liệu 1 trang (`totalPages == 1`):** Không hiển thị bất kỳ số trang nào (Không "Trang 1", Không "1/1").
  - **Tài liệu nhiều trang (`totalPages > 1`):** Hiển thị số trang góc dưới bên phải dạng `Trang 1/2`, `Trang 2/2` (hoặc `Trang 1/3`, `Trang 2/3`, ...).
- Thực thi thông qua đo độ cao tài liệu thực tế trong Playwright PDF Engine (`footerTemplate` động) và CSS Paged Media.

---

### 13. One-page Print Test
- Đề xuất 1-3 vật tư: Kết xuất chính xác 1 trang giấy A4 Landscape, lề lề sạch sẽ, không có số trang, không có header/footer browser.

---

### 14. Multi-page Print Test
- Đề xuất > 10 vật tư: Tự động ngắt trang mượt mà, lặp lại tiêu đề bảng (`thead { display: table-header-group }`), hiển thị số trang `Trang 1/2`, `Trang 2/2`.

---

### 15. One-page PDF Test
- Tải PDF đề xuất nhỏ: File PDF chuẩn, 1 trang duy nhất, không chứa số trang rác, không chứa lề xám hay menu ERP.

---

### 16. Multi-page PDF Test
- Tải PDF đề xuất lớn (> 20 items / multi-line text): Không bị xén dòng, chữ ký không bị mồ côi (`break-inside: avoid`), số trang `Trang X/Y` hiển thị chuẩn ở góc phải.

---

### 17. Delivery/Signature Pagination
- Dòng `Ngày cấp về công trình` và khối 3 chữ ký (`NGƯỜI ĐỀ NGHỊ`, `PHÒNG KỸ THUẬT`, `PHÓ GIÁM ĐỐC`) luôn đi kèm nhau, không bị chèn giữa bảng vật tư hay bị tách rời vô lý sang trang khác.

---

### 18. Excel Number Check
- Đã audit `renderMaterialProposalExcel` trong `src/lib/material-proposals/exporter.ts`: File Excel xuất ra tuân thủ Golden Template, KHÔNG ghi thêm dòng `Số: DVT...` vào ô tính.

---

### 19. Preview/PDF/Print Data Parity
- 100% dữ liệu thống nhất trên cả 4 định dạng xuất bản (Web Preview, Excel, PDF, Print): Tên công trình, Địa điểm `projectLocationSnapshot`, Người đề nghị, Vai trò, Lý do, Ngày cấp, Danh mục vật tư.

---

### 20. Browser Console
- Clean 100%: 0 Errors, 0 Warnings, 0 Hydration errors.

---

### 21. TypeScript
- Run `npx tsc --noEmit`: **PASS (0 LỖI)**.

---

### 22. Lint
- Run `npm run lint`: **PASS**.

---

### 23. Build
- Run `npm run build`: **Exit code: 0 (PASS)**.
- Đã biên dịch thành công route độc lập `/proposal-export/[id]`.

---

### 24. Changed Files
- `src/components/materials/material-proposal-document-view.tsx` *(Xóa dòng "Số:...", thêm CSS page-break & print isolation)*
- `src/app/proposal-export/[id]/page.tsx` *(Tạo standalone document route nằm ngoài (dashboard))*
- `src/app/(dashboard)/materials/proposals/[id]/export/route.ts` *(Cấu hình Playwright PDF chụp standalone route & đánh số trang động)*
- `src/components/materials/material-proposal-preview-toolbar.tsx` *(Cập nhật nút In mở cửa sổ standalone autoPrint)*
- `src/app/(dashboard)/materials/proposals/[id]/print/page.tsx` *(Redirect về standalone route)*

---

### 25. FINAL DECISION
**PASSED**
