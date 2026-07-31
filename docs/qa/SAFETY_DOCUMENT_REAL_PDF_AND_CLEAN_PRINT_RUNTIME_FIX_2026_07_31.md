# BÁO CÁO NGHIỆM THU: HOÀN THIỆN PIPELINE XEM TRƯỚC - TẢI WORD - TẢI PDF - IN CHO HAI BIỂU MẪU ATLĐ (MẪU 01 & MẪU 02)

**Ngày thực hiện:** 31/07/2026  
**Repository:** `construction-erp-v2`  
**Phân hệ:** Quản lý An toàn Lao động, PCCC, VSMT (Mẫu 01 - Báo cáo tự đánh giá & Mẫu 02 - Kế hoạch kiểm tra)

---

## I. TỔNG QUAN KẾT QUẢ XỬ LÝ

Đã giải quyết triệt để vấn đề in và xuất dữ liệu an toàn lao động bằng cách chuyển đổi hoàn toàn từ `window.print()` trên DOM AppShell sang **Pipeline Standalone PDF Blob**. 

1. **Loại bỏ 100% `window.print()` trực tiếp trên AppShell:**
   - Không còn hiện tượng in nhầm sidebar, topbar, mobile nav, URL `localhost:3000`, tiêu đề trình duyệt hay các phần tử giao diện ERP.
   - Thao tác "In" gửi request tới API export PDF server-side, nhận lại binary Blob `application/pdf`, nạp vào iframe ẩn và kích hoạt lệnh in chỉ duy nhất cho tệp PDF sạch chuẩn A4.

2. **Chuẩn hóa Thanh công cụ (Sticky Preview Toolbar) với 3 nút chức năng riêng biệt:**
   - **Tải Word (.docx):** Tải trực tiếp tệp `.docx` từ `SafetyDocxGenerator` / `SafetyAssessmentDocxGenerator`.
   - **Tải PDF:** Tải tệp PDF `.pdf` chuẩn A4 được render server-side từ Standalone HTML qua Playwright / LibreOffice.
   - **In:** Kích hoạt hộp thoại in tệp PDF sạch thông qua iframe ẩn, đảm bảo bản in 100% khớp với tệp PDF được tải về.

3. **Bảo mật và Kiểm tra dữ liệu PDF Server-side:**
   - Cả 2 API export `/api/reports/safety/plans/[planId]/export` và `/api/reports/safety/self-assessments/[reportId]/export` đều kiểm tra phiên đăng nhập (`getSession()`), trả về HTTP 401/403/404/500 kèm JSON chuẩn nếu có lỗi.
   - `SafetyPdfConverter` kiểm tra Magic Bytes (`%PDF`) và mã lỗi an ninh (đảm bảo tệp không chụp nhầm màn hình đăng nhập).

4. **Đồng bộ tên tệp tải về theo mã hồ sơ chuẩn:**
   - Kế hoạch (Mẫu 02): `Ke-hoach-kiem-tra-ATLD-PCCC-VSMT-[ma-ho-so].pdf` / `.docx`
   - Báo cáo (Mẫu 01): `Bao-cao-tu-danh-gia-ATLD-PCCC-VSMT-[ma-ho-so].pdf` / `.docx`

---

## II. CHI TIẾT CÁC FILE ĐÃ CHỈNH SỬA & GIA CỐ

| File | Nội dung thay đổi chính |
|---|---|
| `src/components/safety/safety-document-preview-shell.tsx` | Tách 3 nút action độc lập (Tải Word, Tải PDF, In). Bổ sung hàm `printPdfBlob` nạp blob PDF vào hidden iframe để in. Bổ sung thông báo lỗi tiếng Việt nếu API trả lỗi. |
| `src/components/safety/safety-document-preview-toolbar.tsx` | Đồng bộ 3 nút action và cơ chế in PDF Blob qua iframe ẩn. |
| `src/components/safety/safety-print-button.tsx` | Cập nhật nút In riêng lẻ chuyển sang gọi `pdfUrl` và nạp vào iframe in thay vì gọi `window.print()`. |
| `src/app/api/reports/safety/plans/[planId]/export/route.ts` | Bổ sung `getSession()` kiểm tra quyền truy cập. Chuẩn hóa tên file theo `Ke-hoach-kiem-tra-ATLD-PCCC-VSMT-[ma].ext`. Trả JSON 401/404/500 khi có lỗi. |
| `src/app/api/reports/safety/self-assessments/[reportId]/export/route.ts` | Bổ sung `getSession()` kiểm tra quyền truy cập. Chuẩn hóa tên file theo `Bao-cao-tu-danh-gia-ATLD-PCCC-VSMT-[ma].ext`. Trả JSON 401/404/500 khi có lỗi. |
| `src/lib/safety-reporting/pdf-converter.ts` | Thêm `await page.evaluate(() => document.fonts.ready)` và cấu hình `displayHeaderFooter: false`. Thêm kiểm tra an ninh PDF content. |
| `src/lib/safety-reporting/__tests__/standalone-pdf-clean-print.test.ts` | Viết bộ kiểm thử tự động xác minh Standalone HTML của Mẫu 01 và Mẫu 02 không chứa bất kỳ chuỗi AppShell nào. |

---

## III. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & RUNTIME BROWSER

### 1. Vitest Unit & Integration Suite
- **Số lượng test pass:** 11/11 test files (54/54 tests passed).
- **TypeScript Verification:** `npx tsc --noEmit` hoàn thành với **0 lỗi**.

```text
 RUN  v4.1.10 D:/construction-erp-v2

 ✓ src/lib/safety-reporting/__tests__/simplified-editor.test.ts (3 tests)
 ✓ src/lib/safety-reporting/__tests__/document-number.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-inspection-content.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-five-column-table.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-preview-parity.test.ts (6 tests)
 ✓ src/lib/safety-reporting/__tests__/standalone-pdf-clean-print.test.ts (3 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-content-resilience.test.ts (12 tests)
 ✓ src/lib/safety-reporting/__tests__/safety-document-unified-preview.test.ts (3 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-handwriting-lines.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/unicode-formatting.test.ts (6 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-pdf-page-count.test.ts (1 test)

 Test Files  11 passed (11)
      Tests  54 passed (54)
```

### 2. Runtime Browser Verification
- Đã chạy `browser_subagent` điều khiển Chromium trên môi trường thực tế (`http://localhost:3000`).
- Xác nhận trên cả Mẫu 01 và Mẫu 02:
  - Thanh công cụ dính trên cùng hiển thị đủ 3 nút **Tải Word (.docx)**, **Tải PDF**, và **In**.
  - Nhấn nút **In** không làm thay đổi URL, không mở tab mới, kích hoạt lệnh in PDF sạch thành công.
  - Tệp PDF xuất ra hoàn toàn sạch rác giao diện ERP, đúng tỷ lệ A4 portrait.

---

## IV. BẢO TRÌ VÀ HƯỚNG DẪN MỞ RỘNG

> [!IMPORTANT]
> **Quy tắc bắt buộc cho các biểu mẫu báo cáo mới:**
> 1. Không bao giờ gọi `window.print()` trên DOM chính của ứng dụng web ERP.
> 2. Mọi biểu mẫu in/xuất đều phải đi qua cặp phương thức: `render[Form]StandaloneHtml` và `SafetyPdfConverter.generate[Form]Pdf`.
> 3. Nút "In" trên UI luôn nạp PDF blob từ API export tương ứng vào iframe ẩn để kích hoạt `iframe.contentWindow.print()`.
