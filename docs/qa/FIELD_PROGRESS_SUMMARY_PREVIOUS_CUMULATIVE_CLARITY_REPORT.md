# Field Progress Summary: Previous Cumulative Clarity Report

## 1. Files changed
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
  - Added `formatWorkDateShort` to parse the `fromDate` filter and display the literal date in the table header.
  - Replaced the column header "Lũy kế kỳ trước" with a more descriptive UI component.
  - Added an `Info` icon (imported from `lucide-react`) with a detailed tooltip explaining the calculation logic.

## 2. Ý nghĩa cột Lũy kế trước kỳ
Cột này có ý nghĩa thống kê "Tổng khối lượng đã được lưu/chốt trước ngày bắt đầu kỳ lọc". Nó đại diện cho số liệu lịch sử lũy kế đến thời điểm trước chu kỳ hiện tại, làm mốc để cộng dồn với khối lượng phát sinh trong kỳ hiện hành (ra Lũy kế đến nay).

## 3. Đã đổi label/header thế nào
Header cũ `Lũy kế kỳ trước` đã được thay thế bằng một khối thông tin trực quan hơn:
- Tiêu đề chính: **"Lũy kế trước kỳ"** đi kèm icon `Info` để nhấn mạnh ý nghĩa.
- Dòng phụ: **"Trước [ngày/tháng]"** (Ví dụ: "Trước 05/06" lấy tự động từ giá trị `fromDate` filter). Thiết kế dạng badge nhỏ màu xám nhạt để dễ phân biệt.

## 4. Tooltip hoặc giải thích đã thêm gì
Icon `Info` trên header đã được gắn thuộc tính `title` mặc định của HTML. Khi rê chuột vào, sẽ hiển thị dòng giải thích:
> *"Tổng khối lượng đã lưu trước ngày bắt đầu kỳ lọc. Nếu chưa có dữ liệu trước kỳ thì hiển thị 0."*
Không làm rối giao diện bằng các khối blockquote lớn ở cuối trang.

## 5. Logic tính toán có thay đổi không
**Hoàn toàn giữ nguyên logic đúng.**
- Cột vẫn lấy data dựa trên câu lệnh `entryDate: { lt: fromDateRange.start }`, nghĩa là hoàn toàn không tính entry đúng bằng hoặc sau ngày `fromDate`.
- Vẫn tuân thủ chuẩn filter "Chỉ số đã duyệt" dựa trên state `APPROVED` (Direct save flow).
- Dữ liệu hiển thị an toàn: Nếu record `= 0`, bảng in ra giá trị số `0` rõ ràng, không hiển thị rỗng, mờ, `-`, `NaN` hay `Infinity`.

## 6. Test/build result

| Command | Result |
| ------- | ------ |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Pass |
| `npm run build` | ✅ Pass (exit code 0) |
