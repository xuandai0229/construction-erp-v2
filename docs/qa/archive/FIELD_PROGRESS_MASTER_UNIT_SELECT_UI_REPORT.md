# Field Progress Master: Unit Select UI Report

## 1. Files changed

- `src/components/field-progress/master-table.tsx`
  - Added `UNIT_OPTIONS` constant with 16 preset construction units
  - Replaced unit text `<input>` with `<select>` dropdown for WORK items
  - Added `__custom__` (Khác) option that reveals a text input for custom units
  - GROUP items show `—` dash (no select)
  - Custom/legacy units auto-detected and displayed via the custom input

## 2. Đơn vị đã đổi từ input sang select chưa?

**Đã đổi.** Cột Đơn vị giờ hiển thị một `<select>` dropdown thay vì ô input text tự do.

## 3. Danh sách đơn vị gồm những gì?

```
m, m², m³, kg, tấn, cái, bộ, md, công, ca, chuyến, lít, bao, viên, m² sàn, m dài
```

Plus option "✎ Khác..." cho đơn vị tùy chỉnh.

## 4. Có hỗ trợ đơn vị khác/custom không?

**Có.** Khi chọn "✎ Khác...", một ô input nhỏ xuất hiện bên dưới select để nhập đơn vị tùy chỉnh. Field `unit` lưu đúng string người dùng nhập.

## 5. Dữ liệu đơn vị cũ không nằm trong danh sách xử lý thế nào?

- Nếu `unit` hiện tại không nằm trong `UNIT_OPTIONS`, select tự động hiển thị giá trị `__custom__` (Khác)
- Ô input custom xuất hiện và hiển thị giá trị hiện tại
- Không reset, không mất dữ liệu
- Chỉ khi người dùng chủ động đổi thì mới thay đổi

## 6. GROUP/WORK xử lý đơn vị thế nào?

- **GROUP (hạng mục cha):** Hiển thị `—`, không có select
- **WORK (công việc con):** Hiển thị select dropdown đầy đủ

## 7. Có sửa logic dữ liệu/schema không?

- Không sửa schema DB
- Không migration
- Không thay đổi logic tính toán
- Không sửa Daily/Summary
- Field `unit` vẫn lưu string bình thường qua `handleChange`

## 8. Test/build result

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | ✅ Pass |
| `npx tsx scripts/qa-field-progress-write-path-test.ts` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (exit code 0) |
