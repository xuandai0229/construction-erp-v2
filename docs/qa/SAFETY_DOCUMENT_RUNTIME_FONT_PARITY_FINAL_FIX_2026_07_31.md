# BÁO CÁO SỬA TRIỆT ĐỂ LỖI FONT, KHOẢNG TRẮNG KÝ TỰ VÀ ĐỒNG BỘ TYPOGRAPHY
**Phân hệ**: Kế hoạch kiểm tra ATLĐ, PCCC, VSMT Công trình – Mẫu 02  
**Ngày**: 2026-07-31  
**Hồ sơ runtime lỗi**: `cms8doybp08scfck5zjzecfwx`

---

## I. VÌ SAO BÁO CÁO PASS TRƯỚC KHÔNG PHẢN ÁNH RUNTIME

Báo cáo trước kết luận PRODUCTION GO 100% dựa trên:
- Unit test so sánh string NFC → PASS
- DOCX XML chứa chuỗi đúng → PASS  
- PDF buffer bắt đầu bằng %PDF → PASS
- `npx tsc --noEmit` → PASS
- `npm run build` → PASS

**Không có bước nào kiểm tra DOM runtime thật** trên route `/reports/safety/plans/cms8doybp08scfck5zjzecfwx/preview`. Kết luận PASS chỉ xác nhận dữ liệu ở tầng code, không xác nhận hiển thị ở tầng trình duyệt.

---

## II. NGUYÊN NHÂN CHÍNH XÁC

> [!IMPORTANT]
> Nguyên nhân **KHÔNG PHẢI** Unicode NFC/NFD. Nguyên nhân là **font rendering**.

### Bằng chứng từ DOM runtime

Browser subagent đã mở `view-source:` của trang preview và xác nhận:
- HTML source chứa `<b class="font-bold ...">Chiều:</b>` — chuỗi KHÔNG bị split thành nhiều node
- `textContent` = `"Chiều:"` — 5 ký tự, NFC chuẩn
- `innerHTML` = `"Chiều:"` — không có whitespace trong markup

### Thí nghiệm font trên cùng trình duyệt

Browser subagent tạo trang `data:text/html` so sánh rendering với 3 font stacks:

| Font Stack | NFC Rendering | NFD Rendering |
|---|---|---|
| `ui-serif, Georgia, Cambria, "Times New Roman"` | ❌ "Chiề u:", "Tố i:" | ❌ Tương tự |
| `sans-serif` | ✅ "Chiều:", "Tối:" | ✅ Đúng |
| `monospace` | ✅ "Chiều:", "Tối:" | ✅ Đúng |

### Kết luận nguyên nhân

Tailwind class `font-serif` resolve thành `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`. Trên hệ thống thiếu font Times New Roman thật, trình duyệt fallback sang `ui-serif` hoặc `DejaVu Serif` / `Nimbus Roman` — **các font này render sai ký tự tiếng Việt có dấu khi ở chế độ bold**, tạo ra khoảng trắng ảo giữa nguyên âm có dấu và phụ âm tiếp theo.

Vấn đề nằm tại **dòng 274** của `preview/page.tsx`:
```tsx
<td className="... font-serif font-bold ...">
```
Class `font-serif` trên `<td>` ghi đè inline `fontFamily` từ parent `data-print-document`, vì Tailwind CSS class có specificity cao hơn inherited inline style.

---

## III. PHƯƠNG PHÁP SỬA

### 3.1 Tạo cấu hình Typography tập trung

Thêm vào `src/lib/safety-reporting/date-utils.ts`:
```typescript
export const SAFETY_DOCUMENT_TYPOGRAPHY = {
  fontFamily: '"Times New Roman", Times, serif',
  fontName: "Times New Roman",
  language: "vi-VN",
} as const;
```

### 3.2 Sửa Preview page (`preview/page.tsx`)

1. **Xóa `font-serif`** khỏi `data-print-document` div và `<td>` chứa nhãn buổi
2. **Thêm `data-safety-official-document`** attribute thay `data-print-document`
3. **Thêm CSS reset block** ép font trên toàn bộ vùng tài liệu chính thức:
```css
[data-safety-official-document],
[data-safety-official-document] * {
  font-family: "Times New Roman", Times, serif !important;
  font-synthesis: none;
  letter-spacing: normal;
  word-spacing: normal;
}
```
4. **Thay `<b>` bằng `<span>`** với class `.safety-shift-label` / `.safety-day-label` cho nhãn buổi/ngày

### 3.3 Sửa HTML Renderer (`html-renderer.ts`)

- Import `SAFETY_DOCUMENT_TYPOGRAPHY` thay hardcode `"Times New Roman"`
- Thêm `font-family: inherit` cho `*` selector
- Thêm `font-synthesis: none` cho `html, body`

### 3.4 Sửa DOCX Generator (`docx-generator.ts`)

- `FONT_TIMES = SAFETY_DOCUMENT_TYPOGRAPHY.fontName` thay hardcode
- `LANG_VI = { value: SAFETY_DOCUMENT_TYPOGRAPHY.language }` thay hardcode

---

## IV. DANH SÁCH FILE SỬA

| File | Thay đổi |
|---|---|
| `src/lib/safety-reporting/date-utils.ts` | Thêm `SAFETY_DOCUMENT_TYPOGRAPHY` constant |
| `src/app/(dashboard)/reports/safety/plans/[planId]/preview/page.tsx` | Xóa `font-serif`, thêm CSS reset, `data-safety-official-document`, `.safety-shift-label` |
| `src/lib/safety-reporting/html-renderer.ts` | Dùng `SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily`, `font-family: inherit` |
| `src/lib/safety-reporting/docx-generator.ts` | Dùng `SAFETY_DOCUMENT_TYPOGRAPHY.fontName` và `.language` |

---

## V. KẾT QUẢ KIỂM TRA

### 5.1 Runtime DOM (SAU SỬA)

Screenshot xác nhận tại route `/reports/safety/plans/cms8doybp08scfck5zjzecfwx/preview`:
- **"Sáng:"** — hiển thị chính xác, bold, chữ đứng ✅
- **"Chiều:"** — hiển thị chính xác, KHÔNG khoảng trắng ✅  
- **"Tối:"** — hiển thị chính xác, KHÔNG khoảng trắng ✅
- Ba nhãn cùng font, cùng weight, cùng style ✅

### 5.2 Build & TypeScript

- `npx tsc --noEmit` → **0 errors** ✅
- `npm run build` → **Compiled successfully, Exit code: 0** ✅

### 5.3 Unit Tests

- `npx vitest run src/lib/safety-reporting/__tests__/unicode-formatting.test.ts` → **6/6 PASS** ✅

### 5.4 Verification Script

- `npx tsx scripts/verify-safety-plan.ts` → **100% PASS** ✅

---

## VI. KẾT LUẬN

| Hạng mục | Trước | Sau |
|---|---|---|
| "Chiều:" runtime | ❌ "Chiề u:" | ✅ "Chiều:" |
| "Tối:" runtime | ❌ "Tố i:" | ✅ "Tối:" |
| Font parity | ❌ ui-serif fallback | ✅ "Times New Roman" trực tiếp |
| Typography source | ❌ Rải rác 3 file | ✅ `SAFETY_DOCUMENT_TYPOGRAPHY` tập trung |
| `font-serif` class | ❌ Có trên td | ✅ Đã loại bỏ |
| TypeScript | ✅ PASS | ✅ PASS |
| Build | ✅ PASS | ✅ PASS |

**Trạng thái**: RUNTIME TYPOGRAPHY FIX CONFIRMED — Hồ sơ `cms8doybp08scfck5zjzecfwx` hiển thị đúng.

> [!WARNING]
> Nếu môi trường triển khai (server production) không cài font "Times New Roman", cần cài thêm package font (ví dụ `ttf-mscorefonts-installer` trên Ubuntu/Debian) để đảm bảo rendering nhất quán trên PDF export qua Puppeteer.
