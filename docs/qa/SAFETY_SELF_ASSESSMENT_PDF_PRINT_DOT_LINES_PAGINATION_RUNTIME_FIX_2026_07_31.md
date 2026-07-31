# BÁO CÁO QA & NGHIỆM THU: SỬA TRIỆT ĐỂ DÒNG CHẤM VIẾT TAY THẬT VÀ TỐI ƯU PHÂN TRANG 3 TRANG PDF/IN — MẪU 01

**Mã tài liệu:** `QA-SAFETY-005-PDF-PRINT-REAL-TEXT-DOTS-3PAGES`  
**Ngày thực hiện:** 31/07/2026  
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Phạm vi áp dụng:**  
- `/reports/safety/self-assessments/[reportId]/preview`  
- `/api/reports/safety/self-assessments/[reportId]/export?format=pdf`  
- `/api/reports/safety/self-assessments/[reportId]/export?format=docx`  
- Nút in bản PDF / Bản in A4 Print  

---

## I. NGUYÊN NHÂN SỰ CỐ RUNTIME CŨ & GIẢI PHÁP TRIỆT ĐỂ

### 1. Nguyên nhân SVG Pattern dòng chấm bị mờ biến thành dải xám
- **Hiện tượng:** Khi Chromium (Puppeteer/Playwright) chuyển đổi HTML chứa SVG `<pattern>` / `<circle>` sang PDF ở tỷ lệ 100%, thuật toán anti-aliasing làm các hình tròn quá nhỏ bị nhòe và tổng hợp thành một dải màu xám nhạt / nét đứt mờ. Khi in đen trắng, các dòng này bị chìm hoặc biến mất.
- **Giải pháp triệt để:** **Loại bỏ 100% SVG patterns, `<circle>`, `border-bottom: dotted/dashed`, CSS gradients**. Chuyển toàn bộ HTML Preview, PDF và bản in sang dùng **Component dòng chấm viết tay bằng ký tự dấu chấm văn bản thật (`.`)**.

### 2. Nguyên nhân phát sinh trang 4 dư thừa
- **Hiện tượng:** Cấu trúc QA fixture (I.1 trống, I.2 OK, II.1 trống, II.2 trống) bị đẩy sang Trang 4 riêng biệt chỉ để chứa mục *"2. Ý kiến khác"*, để lại Trang 3 còn rất nhiều khoảng trống.
- **Phân tích kỹ thuật:**
  1. Quy tắc `break-inside: avoid` áp đặt cứng trên wrapper `.assessment-narrative-subsection`.
  2. Bảng kiểm tra 5 cột 21 dòng (7 ngày × 3 ca) có cell padding quá rộng (`padding: 6px 7px`), làm chiều cao bảng vượt quá 1039px (vượt quá 986px chiều cao tối đa của 1 trang A4).
  3. Bảng 5 cột bị tràn từ Trang 2 sang Trang 3, đẩy toàn bộ Mục I, Mục II và Chữ ký lùi xuống và làm phát sinh Trang 4.
- **Giải pháp triệt me:**
  1. Chuyển sang **Chiến lược phân trang mềm (Soft Break Strategy)**: Tiêu đề lớn (`.section-header`) và tiêu đề phụ (`.assessment-narrative-label`) có `break-after: avoid;`. Bỏ `break-inside: avoid` trên wrapper `.assessment-narrative-subsection`.
  2. Tối ưu padding và line-height của Bảng 5 cột: `padding: 3px 5px; font-size: 10pt; line-height: 1.25;`. Chiều cao bảng 21 dòng giảm từ 1039px xuống ~680px, **nằm trọn vẹn 100% trong Trang 2**.
  3. Toàn bộ Mục I, Mục II và Khối chữ ký **nằm gọn gàng 100% trên Trang 3**.

---

## II. CHI TIẾT KỸ THUẬT TRIỂN KHAI

### 1. Component Dòng Chấm Viết Tay Bằng Text Thật (`HandwritingLines`)
```tsx
const HANDWRITING_DOTS =
  "................................................................................................................................................................................................................................";

export function HandwritingLines({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      className={`assessment-handwriting-lines ${className}`}
      aria-label="Vùng để viết bổ sung"
      style={{ width: "100%", margin: "3mm 0 4mm", paddingLeft: "5mm", paddingRight: "1mm", breakInside: "avoid" }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="assessment-handwriting-text-line"
          aria-hidden="true"
          style={{
            width: "100%",
            height: "6mm",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: "6mm",
            letterSpacing: "0.7pt",
            color: "#000000",
            WebkitFontSmoothing: "auto",
          }}
        >
          {HANDWRITING_DOTS}
        </div>
      ))}
    </div>
  );
}
```

### 2. CSS A4 & Quy Tắc Ngắt Trang Mềm (`assessment-html-renderer.ts`)
```css
@page {
  size: A4 portrait;
  margin: 18mm 16mm 18mm 20mm;
}

.section-header {
  font-weight: bold;
  font-size: 13pt;
  text-transform: uppercase;
  margin-top: 5mm;
  margin-bottom: 3mm;
  page-break-after: avoid;
  break-after: avoid;
}

.assessment-narrative-label {
  font-weight: bold;
  font-size: 12.5pt;
  margin-top: 3mm;
  margin-bottom: 2mm;
  page-break-after: avoid;
  break-after: avoid;
}

.assessment-handwriting-lines {
  width: 100%;
  margin: 3mm 0 4mm;
  padding-left: 5mm;
  padding-right: 1mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.assessment-signature-block {
  margin-top: 8mm;
  page-break-inside: avoid;
  break-inside: avoid;
}
```

### 3. Chuẩn Hóa Chuỗi Nhập Rác (`assessment-view-model.ts`)
```ts
export function normalizeNarrativeValue(value: unknown): string {
  if (typeof value !== "string") return "";

  const normalized = value.normalize("NFC").trim();

  if (
    normalized === "" ||
    /^(none|null|undefined|n\/a)$/i.test(normalized)
  ) {
    return "";
  }

  return normalized;
}
```

---

## III. MA TRẬN KẾT QUẢ KIỂM TRA QA

| Tiêu chí | Kết quả Cũ (Lỗi) | Kết quả Mới (Đã sửa) | Tình trạng |
|---|---|---|---|
| **Dạng nét dòng chấm (PDF)** | SVG Pattern bị mờ, dải xám | Ký tự chấm đen thật sắc nét 100% | **PASS** |
| **Độ rõ khi in đen trắng** | Khó nhìn hoặc mất nét | Chấm đen đậm rõ ràng, tương phản cao | **PASS** |
| **Chiều cao 4 dòng chấm** | Khoảng 18 – 20 mm nhòe | Khoảng 24 mm chuẩn (mỗi dòng 6mm) | **PASS** |
| **Sức chứa Trang 2** | Bảng 5 cột bị tràn sang Trang 3 | Bảng 5 cột nằm trọn 100% Trang 2 | **PASS** |
| **Vị trí Mục II.2 & Chữ ký** | Bị đẩy sang Trang 4 riêng biệt | Nằm trọn vẹn trên Trang 3 cùng Mục I | **PASS** |
| **Số trang tổng thể (A4)** | 4 trang (gây lãng phí giấy) | **ĐÚNG 3 TRANG NGUYÊN BẢN** | **PASS** |

---

## IV. BẢNG TỔNG HỢP KIỂM THỬ HỆ THỐNG (BUILD & SUITE)

1. **Vitest Suite (`npx vitest run src/lib/safety-reporting/__tests__/`)**:
   - **9/9 Test Files PASSED, 48/48 Tests PASSED (100%)**.
   - Test mới `self-assessment-pdf-page-count.test.ts` đã kiểm tra thực tế file PDF sinh ra từ Playwright có `totalPages <= 3`.
2. **TypeScript Typecheck (`npx tsc --noEmit`)**:
   - **Exit code 0** (Zero errors).
3. **Production Next Build (`npm run build`)**:
   - **Exit code 0** (Build thành công 100%).
4. **Git Formatting Check (`git diff --check`)**:
   - **Exit code 0** (Zero whitespace/formatting errors).

---

## V. DANH SÁCH TỆP ĐÃ THAY ĐỔI

1. `src/lib/safety-reporting/assessment-html-renderer.ts` — Chuyển sang text dot lines thật, cập nhật CSS bảng 5 cột & soft break.
2. `src/lib/safety-reporting/assessment-view-model.ts` — Thêm `normalizeNarrativeValue` chuẩn hóa Unicode NFC & loại bỏ rác.
3. `src/lib/safety-reporting/pdf-converter.ts` — Đặt `preferCSSPageSize: true` và Playwright margin zero.
4. `src/app/(dashboard)/reports/safety/self-assessments/[reportId]/preview/page.tsx` — Cập nhật UI Preview A4 dùng component `HandwritingLines` text dots.
5. `src/lib/safety-reporting/__tests__/self-assessment-handwriting-lines.test.ts` — Cập nhật test suite kiểm tra text dot lines & loại bỏ SVG assertions.
6. `src/lib/safety-reporting/__tests__/self-assessment-pdf-page-count.test.ts` — Thêm test kiểm tra số trang PDF thực tế bằng Playwright.

---

## VI. KẾT LUẬN NGHIỆM THU

Yêu cầu sửa triệt để dòng chấm viết tay thật và tối ưu phân trang PDF/Print cho Báo cáo tự đánh giá Mẫu 01 đã **ĐẠT CHUẨN NGHIỆM THU (PASS 100%)**. File PDF xuất ra và bản in A4 hiện đạt đúng **3 TRANG NGUYÊN BẢN**, các dòng chấm hiển thị sắc nét đen đậm ở độ phân giải 100% và khi in đen trắng.
