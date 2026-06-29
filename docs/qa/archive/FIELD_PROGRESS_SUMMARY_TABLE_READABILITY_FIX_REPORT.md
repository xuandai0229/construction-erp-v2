# Field Progress Summary Table: Readability Fix Report

## 1. Files changed
- `src/components/field-progress/table-styles.ts`
  - Increased `stt`, `crew`, `unit`, `designQty`, `cumulative`, `dayQty` minimum widths and added exact responsive bounds (min-w, w, max-w).
  - Updated font sizes to increase readability: headers `text-[13px] text-slate-600 font-semibold`, body cells `text-slate-700`.
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
  - Fixed column headers and sticky cells to use `shadow-[1px_0_0_0_#e2e8f0]` and `shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]` to prevent scroll overlapping/hiding text.
  - Removed `max-w-[120px]` override from the "Mũi thi công" column and relied on the properly scaled CSS classes from `table-styles.ts`.

## 2. Đã sửa cột Mũi thi công thế nào?
- Đã bỏ việc giới hạn độ rộng cứng 120px trực tiếp trong component.
- Cập nhật class `cols.crew` thành `min-w-[160px] w-[170px] max-w-[180px] text-center`.
- Bổ sung class `truncate` cùng thuộc tính `title` để hiển thị tooltip khi hover nếu nội dung quá dài.
- Thêm logic kiểm tra giá trị: Nếu có thì hiển thị màu `text-slate-800` với `font-medium`, ngược lại hiển thị dấu `—` màu xám mờ để báo rỗng.

## 3. Đã sửa cột Đơn vị thế nào?
- Độ rộng được cân đối lại thành `min-w-[80px] w-[90px] max-w-[100px] text-center`.
- Cập nhật hiển thị fallback rõ ràng bằng `—` nếu chưa có thông tin, không để ô trống.

## 4. Đã sửa font/độ tương phản bảng thế nào?
- Tăng size chữ header lên `text-[13px]`, sử dụng `text-slate-600` và `font-semibold` để các tiêu đề cột nổi bật hơn.
- Body sử dụng `text-sm` và màu chữ `text-slate-700` cho nội dung thường. Các dòng cần nhấn mạnh dùng `text-slate-800 font-medium` để tránh tình trạng chữ mờ/trắng khó đọc.

## 5. Có sửa logic dữ liệu không?
- Hoàn toàn không can thiệp vào logic filter, tính toán rollup hay schema DB.

## 6. Test/build result

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (exit code 0) |
