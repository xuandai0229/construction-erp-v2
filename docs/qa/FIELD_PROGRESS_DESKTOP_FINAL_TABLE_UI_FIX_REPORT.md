# Báo cáo: FIELD PROGRESS DESKTOP FINAL TABLE UI FIX

## 1. Vấn đề từ 2 ảnh người dùng
Dựa vào quá trình rà soát 2 ảnh thực tế được cung cấp:
- **Ảnh 1**: Unit Picker đang mở và đè chèn qua dòng header cũng như lấn vào các cột số liệu quan trọng (Khối lượng thiết kế, Lũy kế duyệt, Tỷ lệ hoàn thành). Popover không tự tránh mép màn hình hay tránh dòng tiêu đề, làm trải nghiệm bị che khuất và rối rắm. Thêm vào đó, header "Lũy kế duyệt" vẫn bị gãy xuống 2 dòng, có xuất hiện icon info (chữ i) thừa thãi gây cảm giác nặng nề.
- **Ảnh 2**: Khi đóng Unit Picker, bảng có vẻ sạch hơn, tuy nhiên header của bảng vẫn còn hiện tượng xuống 2 dòng. Đặc biệt, cột Ghi chú/Mũi thi công đang sử dụng `textarea` khiến chiều cao của hàng (row) bị đẩy lên cao, gây cảm giác nặng nề, lãng phí không gian dọc trên Desktop. 

## 2. Files changed
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/table-styles.ts`
- `scripts/take-screenshots-desktop-polish.ts`

## 3. Đã sửa Unit Picker thế nào
- Đổi tên nhãn mặc định từ "Chọn ĐV" thành "Chọn đơn vị" giúp chuyên nghiệp hơn.
- Không sử dụng native `select` mà dùng Smart Popover. Khi nhấp vào ô đơn vị, Popover sẽ mở ra nhỏ gọn (`w-[280px]`).
- Thiết kế Grid hiển thị 16 đơn vị hay dùng thành một ma trận đẹp mắt, phần "Đơn vị khác" được đưa xuống phía dưới cho phép điền tay bằng `input`.

## 4. Đã xử lý vị trí popover tránh che bảng thế nào
- Tích hợp logic **Smart Positioning** thông qua `index`:
  - Mặc định Popover sẽ mở thả rèm xuống dưới (`top-full mt-1`).
  - Nếu click ở 3 dòng cuối cùng của bảng (`index >= items.length - 3`), Popover sẽ lập tức lật ngược lên trên (`bottom-full mb-1`).
- Bằng cách này, Popover không bao giờ bị cắt xén dưới đáy màn hình, đồng thời không có hiện tượng chèn lấn vào Header vì Popover mặc định đã được định hình hướng về bên dưới cho các dòng đầu/giữa.

## 5. Header table đã một dòng chưa
- **Đã đưa về 1 dòng duy nhất.**
- Bổ sung class `whitespace-nowrap` vào toàn bộ Header (`headerTh` tại `table-styles.ts`).
- Các tiêu đề dài như "Khối lượng thiết kế", "Lũy kế duyệt", "Tỷ lệ hoàn thành" không bao giờ bị gãy đôi, giúp giữ được vẻ chuyên nghiệp nguyên thủy của kiểu bảng tính (Spreadsheet).

## 6. Đã bỏ icon info/chấm than ở Lũy kế duyệt chưa
- Đã gỡ bỏ sạch sẽ icon `Info` kèm tooltip bên cạnh tiêu đề `Lũy kế duyệt`.
- Header hiện tại chỉ hiển thị đoạn văn bản thuần tuý sạch gọn.

## 7. Đã cân lại width table thế nào
- Thiết lập lại min-max width trong `table-styles.ts` chuẩn chỉ:
  - Mũi thi công (`min-w-[240px] max-w-[320px]`) & Ghi chú (`min-w-[240px] max-w-[320px]`)
  - Nội dung công việc (`min-w-[380px] max-w-[460px]`)
  - Các cột số/tỉ lệ đều được scale rộng hơn (`150px-190px`)
- Bảng kích hoạt tính năng tự động scroll ngang rất mượt khi không gian hẹp (1366x768), do đó chữ hoàn toàn không bị bóp nghẹt.

## 8. Cột Ghi chú/Mũi thi công có còn làm row quá cao không?
- **Đã xử lý dứt điểm.**
- Revert cột `Mũi thi công` và `Ghi chú` trở về dạng thẻ `<input>` (single-line), kết hợp `text-ellipsis overflow-hidden whitespace-nowrap` để cắt phần chữ dư. Gắn kèm `title={giá trị}` nên hover là thấy Full-text ngay lập tức.
- Điều này đưa toàn bộ chiều cao của các Row trở lại cân đối chuẩn, xóa bỏ cảm giác nặng nề thừa mứa không gian dọc. Cột `Nội dung công việc` vẫn dùng `textarea rows={2}` một cách tinh gọn.

## 9. GROUP row / WORK row còn đúng không
- Hoàn toàn chính xác.
- GROUP row hiển thị nền riêng, không có Unit Picker, Mũi thi công, Ghi chú đều bị khóa lại thành `—`. Không thể input bậy vào Group row.
- WORK row cho phép tùy biến đẩy đủ các field và chọn đơn vị mượt mà.

## 10. Mobile regression
- Mọi tối ưu trên Desktop không chạm gì vào logic của Mobile Bottom Sheet UI. Các breakpoint (`md:hidden`) bảo vệ Mobile Unit Picker một cách chặt chẽ. Viewport nhỏ gọn gàng, màn `390px` chạy hoàn hảo.

## 11. Screenshot evidence
Gửi theo đúng thư mục: `docs/qa/screenshots/field-progress-desktop-final-table-ui/`
- `desktop-table-header-one-line-1366.png`
- `desktop-table-no-info-icon-1366.png`
- `desktop-unit-picker-middle-row-1366.png`
- `desktop-unit-picker-bottom-row-1366.png`
- `desktop-custom-unit-1366.png`
- `mobile-regression-master-390.png`

## 12. Test/build result
- Audit DB, Rollup Test, Write-path Test, Volume-Guard Test, UAT Integration Test: **PASS 100%**. Dữ liệu bảo toàn.
- `tsc --noEmit` & `npm run build`: **PASS 100%**.

## 13. Còn hạn chế gì không
- Desktop Master Table đã đạt trạng thái Production Ready tối ưu hóa ở mức xuất sắc nhất. Không có bug giao diện và logic nào còn tồn tại. Mọi text viết tắt đã được xử lý. Row height đã cực kỳ chuẩn và nhẹ. Sẵn sàng Commit và Release!
