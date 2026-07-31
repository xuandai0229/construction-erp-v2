# BÁO CÁO QA & NGHIỆM THU: BỔ SUNG DÒNG CHẤM VIẾT TAY CHO CÁC TRƯỜNG NỘI DUNG TRỐNG — MẪU 01

**Mã tài liệu:** `QA-SAFETY-003-HANDWRITING-LINES`  
**Ngày thực hiện:** 31/07/2026  
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Phạm vi áp dụng:**  
- `/reports/safety/self-assessments/[reportId]`  
- `/reports/safety/self-assessments/[reportId]/preview`  
- Xuất Word (.docx)  
- Xuất PDF (`/api/.../export?format=pdf`)  
- Bản in HTML / A4 Print (`SafetyPrintButton`)  

---

## I. TỔNG QUAN NGUYÊN NHÂN & MỤC TIÊU NGHIỆP VỤ

### 1. Nguyên nhân hiển thị khoảng trắng trước đây
Trong Báo cáo tự đánh giá Mẫu 01, bốn tiểu mục nội dung tự do ở Phần I và Phần II:
- **Phần I - Mục 1**: *Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng*
- **Phần I - Mục 2**: *Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành*
- **Phần II - Mục 1**: *Bổ sung nhân lực, thiết bị, thay thế đội ngũ yếu kém không đạt về kỹ mỹ thuật, ATLĐ, PCCC, VSMT*
- **Phần II - Mục 2**: *Ý kiến khác*

Khi người dùng không nhập dữ liệu (hoặc khi chứa giá trị rác cũ như `None`), hệ thống trước đây hiển thị một khoảng trắng trống. Điều này sai lệch so với biểu mẫu Word chuẩn của Công ty — nơi mỗi mục trống cần có **4 dòng chấm viết tay** để người dùng có thể in ra giấy, viết bổ sung bằng tay, ký duyệt hoặc ghi chú trực tiếp.

### 2. Nguyên tắc xử lý & Không lưu dữ liệu giả vào Database
- **Dòng chấm viết tay chỉ là thành phần trình bày (Presentation Layer)**:
  - **Không lưu chuỗi dấu chấm `...` vào PostgreSQL database**.
  - **Không gửi dấu chấm từ Client trong payload lưu**.
  - **Không làm autosave phát sinh vì dòng chấm**.
  - **Không hiển thị dấu chấm trong textarea của màn hình chỉnh sửa**.
- Database chỉ lưu dữ liệu thật của người dùng hoặc chuỗi rỗng / `null`.

---

## II. MÔ HÌNH DỮ LIỆU DÙNG CHUNG (SINGLE SOURCE OF TRUTH)

Toàn bộ các kênh xuất dữ liệu (HTML Preview, Word DOCX, PDF, Print) tiêu thụ chung DTO `NarrativeSectionValue` được tạo từ hàm `buildNarrativeSectionValue(value)` trong `assessment-view-model.ts`:

```ts
export type NarrativeSectionValue = {
  text: string;
  isEmpty: boolean;
  handwritingLineCount: number;
};

export function buildNarrativeSectionValue(value: string | null | undefined): NarrativeSectionValue {
  const text = normalizeOptionalReportText(value);
  const isEmpty = text.length === 0;
  return {
    text,
    isEmpty,
    handwritingLineCount: isEmpty ? 4 : 0,
  };
}
```

### Quy tắc Chuẩn hóa Dữ liệu:
- Chuỗi trống, `null`, `undefined`, chuỗi chỉ có khoảng trắng `   `, hoặc các giá trị rác `None`, `none`, `null`, `undefined`, `N/A` được `normalizeOptionalReportText` trả về chuỗi rỗng `""`.
- Khi `isEmpty === true`: `handwritingLineCount = 4`.
- Khi `isEmpty === false`: `handwritingLineCount = 0`, hiển thị nguyên văn nội dung của người dùng.

---

## III. CHI TIẾT CÁCH IMPLEMENT TRÊN CÁC ĐẦU RA

### 1. HTML Preview A4 & HTML Renderer (`assessment-html-renderer.ts`)
Khi trường trống (`isEmpty === true`), HTML sinh ra 4 phần tử dòng viết tay bằng CSS viền chấm Dotted:
```html
<div class="handwriting-lines" aria-label="Vùng để viết bổ sung">
  <div class="handwriting-line" aria-hidden="true"></div>
  <div class="handwriting-line" aria-hidden="true"></div>
  <div class="handwriting-line" aria-hidden="true"></div>
  <div class="handwriting-line" aria-hidden="true"></div>
</div>
```
**CSS áp dụng:**
```css
.handwriting-lines {
  margin-top: 4px;
  margin-left: 15px;
  margin-bottom: 10px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.handwriting-line {
  height: 22px;
  border-bottom: 1px dotted #222222;
  width: 100%;
}
@media print {
  .handwriting-line {
    border-bottom: 1px dotted #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

### 2. Xuất File Word DOCX (`assessment-docx-generator.ts`)
Khi trường trống (`isEmpty === true`), thư viện `docx` tạo 4 đoạn văn (`docx.Paragraph`) có viền chấm dưới `BorderStyle.DOTTED`:
```ts
function createHandwritingLines(count = 4): docx.Paragraph[] {
  return Array.from({ length: count }, () =>
    new docx.Paragraph({
      spacing: { before: 0, after: 0, line: 320 },
      indent: { left: 360 },
      border: {
        bottom: { style: docx.BorderStyle.DOTTED, size: 4, color: "222222", space: 1 },
      },
      children: [new docx.TextRun({ text: " ", font: FONT_TIMES, size: 26 })],
    })
  );
}
```

### 3. Xuất PDF & Bản in
Cả API PDF (`/api/.../export?format=pdf`) và Nút In bản PDF (`SafetyPrintButton`) đều sử dụng chung HTML Renderer / DOCX DTO đã có cấu trúc viền chấm chuẩn Dotted với thuộc tính `-webkit-print-color-adjust: exact`, đảm bảo khi in đen trắng hoặc xuất PDF không bị mất dòng, mờ hay bị che lấp bởi khối chữ ký.

---

## IV. MA TRẬN KẾT QUẢ KIỂM TRA 5 TRƯỜNG HỢP QA

| Trường hợp | Nội dung Nhập vào | Kết quả Trên HTML Preview / Word / PDF / Print | Tình trạng |
|---|---|---|---|
| **Trường hợp A** | Cả 4 trường đều trống (hoặc `""`) | Mỗi tiểu mục có đúng 4 dòng chấm. **Tổng cộng 16 dòng chấm**. Không có "None", không có "Không phát sinh". | **PASS** |
| **Trường hợp B** | Mục I.2 có `"OK"`, 3 mục còn lại trống | Mục I.2 hiển thị `"OK"` (không hiện dòng chấm). **3 mục còn lại có 4 dòng chấm mỗi mục (Tổng 12 dòng)**. | **PASS** |
| **Trường hợp C** | Nhập nội dung dài (>20 dòng) | Hiển thị nguyên văn, tự động chuyển trang, không có dòng chấm chèn vào, không mất dữ liệu. | **PASS** |
| **Trường hợp D** | Giá trị rác `None`, `null`, `undefined`, `N/A` | Coi như trống, hiển thị đúng 4 dòng chấm, các từ rác này không xuất hiện trong văn bản. | **PASS** |
| **Trường hợp E** | Nội dung ngắn có xuống dòng (`Đã kiểm tra.\nHạng mục hoàn thành.`) | Giữ đúng 2 dòng văn bản, không nối câu, không sinh dòng chấm giả. | **PASS** |

---

## V. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & FORMATTING

### 1. Vitest Suite (`npx vitest run src/lib/safety-reporting/__tests__/`)
Tất cả 8 test files với 47 test cases đã **PASSED 100%**:

```
 RUN  v4.1.10 D:/construction-erp-v2

 ✓ src/lib/safety-reporting/__tests__/simplified-editor.test.ts (3 tests)
 ✓ src/lib/safety-reporting/__tests__/document-number.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-inspection-content.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-five-column-table.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-preview-parity.test.ts (6 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-handwriting-lines.test.ts (5 tests)
 ✓ src/lib/safety-reporting/__tests__/self-assessment-content-resilience.test.ts (12 tests)
 ✓ src/lib/safety-reporting/__tests__/unicode-formatting.test.ts (6 tests)

 Test Files  8 passed (8)
      Tests  47 passed (47)
```

### 2. TypeScript Typecheck (`npx tsc --noEmit`)
Kết quả: **Exit code 0** — Zero compilation errors.

### 3. Git Diff Formatting Check (`git diff --check`)
Kết quả: **Exit code 0** — Không phát sinh lỗi khoảng trắng / whitespace.

---

## VI. DANH SÁCH TỆP ĐÃ SỬA ĐỔI

1. `src/lib/safety-reporting/assessment-view-model.ts` — Thêm `NarrativeSectionValue` và `buildNarrativeSectionValue`.
2. `src/lib/safety-reporting/assessment-html-renderer.ts` — Cập nhật render 4 phần tử `.handwriting-line` cho HTML preview & PDF.
3. `src/lib/safety-reporting/assessment-docx-generator.ts` — Cập nhật `createHandwritingLines` tạo 4 đoạn văn viền chấm Dotted trong Word.
4. `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/preview/page.tsx` — Cập nhật `renderPreviewNarrativeSection` hiển thị 4 dòng chấm trên UI Preview A4.
5. `src/lib/safety-reporting/__tests__/self-assessment-handwriting-lines.test.ts` — Test suite kiểm thử tự động cho dòng chấm viết tay.

---

## VII. KẾT LUẬN NGHIỆM THU

Tính năng bổ sung 4 dòng chấm viết tay cho các trường nội dung trống trong Báo cáo tự đánh giá Mẫu 01 đã **ĐẠT CHUẨN NGHIỆM THU (PASS 100%)** trên cả 4 kênh xuất dữ liệu (HTML Preview, Word DOCX, PDF và Bản in).
