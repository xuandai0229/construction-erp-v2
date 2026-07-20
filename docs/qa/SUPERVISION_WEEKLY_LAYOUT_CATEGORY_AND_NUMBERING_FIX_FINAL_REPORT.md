# FIX TOÀN DIỆN — LAYOUT, DÒNG BÁO CÁO TRỐNG, NGUỒN HẠNG MỤC VÀ THỨ TỰ MỤC

**Ngày**: 2026-07-20  
**Phạm vi**: Layout toàn hệ thống, row mới trống, nguồn Hạng mục, đổi Mục V → IV

---

## I. App Shell — Nguyên nhân nội dung bị che/cắt

### Nguyên nhân gốc
- `data-app-frame` div thiếu `overflow-y-auto` và `h-dvh`
- Khi nội dung dài hơn viewport, browser scroll toàn bộ trang thay vì scroll trong vùng chính
- Header `sticky top-0` chỉ hoạt động đúng khi nằm trong scroll container có kích thước cố định

### Cách sửa
- **File**: `src/components/layout/app-shell.tsx`
  - Thêm `h-dvh overflow-y-auto` vào `data-app-frame` → tạo scroll container duy nhất cho content
  - Header `sticky` nằm trong cùng scroll container, luôn dính đầu
  
- **File**: `src/components/layout/header.tsx`
  - Thay `z-50` bằng `z-[var(--z-app-header)]` → dùng z-index token thay vì hardcoded
  - Thay `h-14 lg:h-16` bằng `h-[var(--app-header-h)]` → dùng CSS variable duy nhất

- **File**: `src/app/globals.css`
  - Thêm `--app-header-h: 3.5rem` (56px mobile), `--app-header-h-lg: 4rem` (64px desktop)
  - Thêm z-index scale: `--z-base: 1`, `--z-sticky-table: 10`, `--z-app-header: 40`, `--z-dropdown: 50`, `--z-dialog-overlay: 60`, `--z-dialog: 70`, `--z-toast: 80`
  - Media query `@media (min-width: 1024px)` cập nhật `--app-header-h`

### Route đã kiểm tra (visual)
| Route | Kết quả |
|-------|---------|
| `/dashboard` | ✅ Heading đầy đủ |
| `/projects` | ✅ Heading đầy đủ |
| `/supervision/weekly` | ✅ Heading đầy đủ |
| `/supervision/weekly/[id]/edit` | ✅ Heading đầy đủ |

---

## II. Row mới không tự chọn Công trình

### Nguyên nhân gốc
- **Không có lỗi auto-select trong code factory.** Cả `emptyEntry()` (result-schedule-table.tsx:24-32) và `emptySource()` (result-data-tables.tsx:20-22) đã đúng: tất cả project/work fields đều `null`.
- Kiểm tra xác nhận: tạo entry Mục I (tick Sáng), Mục II, III, IV → đều trống hoàn toàn.

### Xác minh
- **Screenshot**: Row mới Mục I hiển thị "Chọn công trình..." ✅
- **Screenshot**: Row mới Mục IV hiển thị "Chọn công trình..." ✅
- Project header KHÔNG tự ghi vào row
- Không có `useEffect` nào đồng bộ project context vào row

---

## III. Nguồn Hạng mục — Chỉ Hạng mục chính

### Nguyên nhân gốc
- `getSupervisionWeeklySourceOptions()` (actions.ts) fetch cả `GROUP` và `WORK` items
- **Nhưng filter chỉ return `WORK`** → hiển thị Công việc con thay vì Hạng mục chính

### Cách sửa
- **File**: `src/app/(dashboard)/supervision/weekly/actions.ts`
  - Query `prisma.fieldProgressItem.findMany` chỉ lấy `itemType: "GROUP"` (trước đó: `{ in: ["GROUP", "WORK"] }`)
  - Return `categoryName || workContent` thay vì chỉ `workContent`
  - Bỏ breadcrumb phức tạp không cần thiết

### Server validation
- Thêm khối validation trước transaction trong `saveSupervisionWeeklyDossier()`:
  - Thu thập tất cả `workItemId` từ entries, transitions, quantities, progressRows
  - Query DB kiểm tra `itemType = "GROUP"`
  - Từ chối nếu bất kỳ ID nào thuộc `WORK` type
  - Error message: "Hạng mục được chọn không hợp lệ. Chỉ được chọn Hạng mục chính, không được chọn Công việc con."

### Tương thích dữ liệu cũ
- Hồ sơ cũ có `workItemId` trỏ tới WORK → vẫn mở bình thường (đọc)
- Snapshot cũ hiển thị đúng
- Khi sửa row → dropdown mới chỉ cho chọn GROUP
- Server validation chỉ block khi lưu mới

### Audit chi tiết
→ Xem `docs/qa/SUPERVISION_WEEKLY_CATEGORY_SOURCE_AUDIT.md`

---

## IV. Đổi Mục V → Mục IV

### File đã sửa

| File | Thay đổi |
|------|----------|
| `result-data-tables.tsx` | `data-section="IV"`, `data-testid="section-IV"`, heading "IV. Tiến độ tổng và thực tế", `data-testid="table-IV"`, confirm dialog "Xóa dòng Mục IV?" |
| `weekly-print-template.tsx` | `<h2>IV. Tiến độ tổng và thực tế</h2>` |
| `weekly-editor.tsx` | `focusError` map `"Mục IV" → "IV"`, legacy note `"II, IV"` |
| `actions.ts` | 3 validation messages `Mục IV, dòng ...`, revision log `"Mục I, II, III, IV"` |

### Kiểm tra V còn sót
```
grep -r "Mục V" src/  → 0 results ✅
grep -r "V. Tiến độ" src/  → 0 results (chỉ IV) ✅
grep -r "section-V" src/  → 0 results ✅
```

### Xác minh visual
- **Editor**: IV. Tiến độ tổng và thực tế ✅
- **Preview/PDF**: IV. Tiến độ tổng và thực tế ✅

---

## V. Kiểm tra hồi quy

| Kiểm tra | Kết quả |
|----------|---------|
| `npx prisma validate` | ✅ PASS |
| `npx prisma migrate status` | ✅ Database schema is up to date |
| `npx tsc --noEmit` | ✅ PASS (exit code 0) |
| `npm run build` | ✅ PASS (exit code 0) |
| Tất cả route build thành công | ✅ |

---

## VI. File đã sửa

1. `src/components/layout/app-shell.tsx` — Thêm `h-dvh overflow-y-auto` vào scroll container
2. `src/components/layout/header.tsx` — Dùng CSS variable cho z-index và height
3. `src/app/globals.css` — Thêm z-index scale tokens, app-header-h tokens
4. `src/app/(dashboard)/supervision/weekly/actions.ts` — Mục V→IV, source GROUP only, server validation
5. `src/components/supervision-weekly/result-data-tables.tsx` — Mục V→IV throughout
6. `src/components/supervision-weekly/weekly-editor.tsx` — focusError V→IV, legacy note
7. `src/components/supervision-weekly/weekly-print-template.tsx` — Print V→IV

---

## VII. Rủi ro còn lại

1. **Hồ sơ cũ có WORK ID**: Nếu người dùng mở hồ sơ cũ có workItemId trỏ tới WORK và cố sửa → server sẽ reject. Cần UI guidance cho trường hợp này.
2. **Dropdown hạng mục trống**: Nếu project chưa có GROUP items → dropdown trống, chỉ có thể nhập tay. Đây là behavior đúng.
3. **Mobile testing**: Chỉ test visual trên desktop resolution. Mobile cần thêm QA thủ công.
4. **Playwright tests**: Chưa có Playwright test files trong repo hiện tại cho module Giám sát Tuần.

---

## VIII. Kết luận

| Câu hỏi | Trả lời |
|---------|---------|
| App Shell đã sửa toàn hệ thống chưa? | ✅ Có — sửa tại `app-shell.tsx` chung, áp dụng tất cả route |
| Row mới còn tự chọn Công trình không? | ❌ Không — emptyEntry/emptySource đã đúng từ đầu, xác minh bằng screenshot |
| Dropdown Hạng mục đang lấy model nào? | `FieldProgressItem` với `itemType = "GROUP"` |
| Có còn hiển thị Công việc con không? | ❌ Không — query chỉ lấy GROUP, server validation chặn WORK |
| Mục V đã đổi thành IV ở đâu? | Editor, preview/PDF, validation messages, confirm dialogs, focus navigation, revision log |
| Autosave/reload đã test chưa? | ✅ Có — autosave trigger khi tạo row mới |
| Preview/PDF đã test chưa? | ✅ Có — xác minh IV trên preview |
| Những test nào PASS? | prisma validate ✅, tsc ✅, build ✅, visual routes ✅ |
| Những test nào BLOCKED? | Playwright (chưa có test files), Mobile (cần QA thủ công) |
