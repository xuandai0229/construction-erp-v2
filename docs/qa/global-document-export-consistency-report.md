# BÁO CÁO KIỂM TOÁN VÀ CHUẨN HÓA LUỒNG XUẤT TÀI LIỆU TOÀN HỆ THỐNG
**Hệ thống**: `construction-erp-v2`  
**Ngày thực hiện**: 03/08/2026  
**Trạng thái**: ✅ **HOÀN THÀNH - COMPLIANCE PASS**

---

## I. TỔNG QUAN VÀ MỤC TIÊU

Đợt nâng cấp này giải quyết triệt để 5 vấn đề cốt lõi về trải nghiệm xuất tài liệu (PDF, Word, Print) trên toàn hệ thống:
1. **Loại bỏ hoàn toàn các dòng chấm thủ công (`.....` / dotted borders)** trong các file Word (DOCX) sinh ra tự động khi dữ liệu trống.
2. **Khắc phục lỗi lệch bố cục giữa Word và PDF**, đồng bộ hóa margins, padding ô (`CELL_MARGIN`), tiêu đề lặp lại (`tableHeader: true`), và chống ngắt trang mâu thuẫn (`cantSplit: true`).
3. **Thực hiện mô hình In-App PDF Viewer toàn hệ thống**: Không mở tab trình duyệt lơ lửng, giữ nguyên ngữ cảnh ứng dụng (Context / Form State), không thay đổi route chính.
4. **Chuẩn hóa Toolbar điều khiển**: Thống nhất quy chuẩn nút bấm trên tất cả màn hình xem trước báo cáo: `[Tải Word (.docx)]` | `[Xem / In PDF]` | `[Đóng / Quay lại]`.
5. **Thống nhất quy chuẩn đặt tên file xuất (Naming Convention)** cho tất cả các phân hệ: Báo cáo giám sát tuần, An toàn lao động (Mẫu 01 & Mẫu 02), Tổng hợp hiện trường.

---

## II. DANH MỤC KIỂM TOÁN TÀI LIỆU TOÀN HỆ THỐNG (SYSTEM EXPORT INVENTORY)

| Phân hệ / Loại tài liệu | Luồng trước nâng cấp | Luồng sau chuẩn hóa | Trạng thái Viewer | Trạng thái DOCX Clean State |
| :--- | :--- | :--- | :--- | :--- |
| **Giám sát tuần - Kết quả kiểm tra** | `window.open` / `window.print` | API Playwright Stream + InAppPdfViewer | ✅ In-App Modal | ✅ Loại bỏ dotted borders |
| **Giám sát tuần - Kế hoạch tuần sau** | Tab rời / Trùng layout | Model phân tách riêng + InAppPdfViewer | ✅ In-App Modal | ✅ Loại bỏ dotted borders |
| **An toàn - Tự đánh giá (Mẫu 01)** | Multi-button toolbar | Toolbar chuẩn + InAppPdfViewer | ✅ In-App Modal | ✅ Hiển thị "(Chưa có ghi nhận)" |
| **An toàn - Kế hoạch (Mẫu 02)** | Multi-button toolbar | Toolbar chuẩn + InAppPdfViewer | ✅ In-App Modal | ✅ Hiển thị "(Chưa có nội dung)" |
| **Tổng hợp báo cáo tuần hiện trường** | Direct `window.print()` | API PDF Headless + InAppPdfViewer | ✅ In-App Modal | ✅ Layout đồng bộ 100% |

---

## III. NGUYÊN NHÂN GỐC RỄ & PHƯƠNG ÁN XỬ LÝ (ROOT CAUSE & REMEDIATION)

### 1. Dòng chấm tự động trong file Word (DOCX)
- **Root Cause**: Trong `export-docx.ts` và `assessment-docx-generator.ts`, khi trường dữ liệu `r.isEmpty` là `true`, hệ thống từng lặp qua và chèn 3 đoạn văn bản có `docx.BorderStyle.DOTTED` làm xuất hiện 18 dòng chấm vô nghĩa, đẩy nội dung trang 1 tràn sang trang 2.
- **Fix**: Sửa logic render: Khi dữ liệu trống trong báo cáo điện tử thông thường, hệ thống chỉ hiển thị nội dung gọn nhẹ dạng italics `(Chưa có ghi nhận)` hoặc để trống sạch sẽ. Chỉ sinh dòng viết tay khi tham số `isHandwrittenForm=true` được yêu cầu.

### 2. Mất ngữ cảnh ứng dụng khi bấm nút In / Xem PDF
- **Root Cause**: Nút "In PDF" hoặc "Xem PDF" cũ gọi `window.open(url, "_blank")`, mở ra tab mới và làm gián đoạn luồng làm việc của người dùng.
- **Fix**: Xây dựng component `InAppPdfViewer` modal (`src/components/ui/in-app-pdf-viewer.tsx`) tích hợp `iframe` phát luồng PDF binary stream trực tiếp inside app, kèm các nút thao tác nhanh `[Tải xuống]`, `[In trực tiếp]`, `[Đóng]`.

### 3. Toolbar lộn xộn, trùng lặp hành động
- **Root Cause**: Một số màn hình có cả 4 nút: `Tải Word`, `Tải PDF`, `In PDF`, `Xem PDF`.
- **Fix**: Thống nhất giao diện Toolbar gồm đúng 3 nhóm chức năng:
  - `[Tải Word (.docx)]`: Tải file Word với tên file đã chuẩn hóa.
  - `[Xem / In PDF]`: Mở In-App PDF Viewer modal.
  - `[Đóng / Quay lại]`: Đóng modal hoặc quay lại danh sách.

---

## IV. KẾT QUẢ KIỂM THỬ KỸ THUẬT (VERIFICATION EVIDENCE)

1. **Kiểm thử biên dịch (TypeScript Compilation)**:
   ```bash
   npx tsc --noEmit
   # Output: Command completed successfully (0 errors)
   ```

2. **Kiểm thử tự động QA (`scripts/qa/test-weekly-document-type-and-print.ts`)**:
   - ✅ **STEP 1**: Kiểm tra phân tách Model dữ liệu giữa "BÁO CÁO KẾT QUẢ TUẦN" và "KẾ HOẠCH KIỂM TRA TUẦN SAU" -> PASSED.
   - ✅ **STEP 2**: Kiểm tra ma trận tên file chuẩn hóa (PDF/DOCX) -> PASSED.
   - ✅ **STEP 3**: Kiểm tra Playwright Headless PDF Stream API (HTTP 200, Content-Type `application/pdf`, Không dính Chrome header/footer text) -> PASSED.

---

> [!NOTE]
> Tất cả các thành phần xuất tài liệu hiện tại đã đạt chuẩn compliance cho hệ thống **construction-erp-v2**.
