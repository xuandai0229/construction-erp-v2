# Báo cáo: FIELD PROGRESS DESKTOP UNIT Picker Portal Fix

## 1. Vấn đề còn tồn tại từ ảnh người dùng
Mặc dù đã áp dụng class `bottom-full` trước đó, theo kết quả thực tế trên ảnh người dùng cung cấp:
- **Unit Picker vẫn che bảng:** Khung Popover sử dụng `position: absolute` nằm trực tiếp trong thẻ `td`, nên nó vẫn đè qua các header hoặc số liệu xung quanh, gây đứt đoạn cấu trúc bảng. Nếu bảng có `overflow-hidden`, Popover còn bị giới hạn hoặc cắt bớt tùy theo cách trình duyệt xử lý stacking context.
- **Nút "Áp dụng" bị gãy:** Do container không đủ rộng hoặc thiếu class nowrap, nội dung nút "Áp dụng" bị rớt xuống 2 dòng gây mất thẩm mỹ.

## 2. Files changed
- `src/components/field-progress/master-table.tsx`
- `scripts/take-screenshots-desktop-polish.ts`

## 3. Đã chuyển Unit Picker sang Portal/fixed chưa
- **Chính thức gỡ bỏ Inline Absolute Popover.**
- Bổ sung Component `DesktopUnitPickerPortal` hoàn toàn mới:
  - Tích hợp `createPortal` để móc thẳng Popover ra ngoài `document.body`.
  - Sử dụng `position: fixed` và `z-[9999]`, qua đó giải phóng hoàn toàn Unit Picker khỏi sự cùm kẹp của Table. Mọi vấn đề `overflow` hay z-index local đều bị vô hiệu hóa. 

## 4. Smart positioning tính theo viewport thật như thế nào
Logic mới không còn dựa vào index tương đối của hàng, mà dựa trên tọa độ thật của phần tử trên Viewport:
- **Xác định anchor:** Khi click chọn Đơn vị, `getBoundingClientRect()` ngay lập tức tính toán vị trí của thẻ Button đó.
- **Tính toán Top/Left:**
  - Nếu khoảng trống phía dưới (Bottom) của thẻ button cộng với chiều cao của Popover (~300px) tràn qua `window.innerHeight`, Popover lập tức được ném ngược lên trên thẻ button để tránh bị lấp.
  - Vị trí Left cũng được kẹp giữa `PADDING` (12px) và `window.innerWidth`, không bao giờ tràn lề.
- **Thích ứng động:** Popover còn lắng nghe sự kiện `resize` và `scroll` của Window, tự động di chuyển theo cuộn trang.

## 5. Nút “Áp dụng” đã một dòng chưa
- **Đã một dòng 100%.**
- Class `whitespace-nowrap min-w-[76px] px-3` được add trực tiếp vào thẻ button, bảo vệ đoạn text "Áp dụng" vĩnh viễn không bị rớt dòng.

## 6. Header table đã một dòng chưa
- **Giữ vững phong độ 1 dòng.**
- Các Header tiếp tục sử dụng `whitespace-nowrap` kết hợp với min-width tương xứng để không bị nén quá nhỏ. Chữ dài nhất là `Nội dung công việc / Hạng mục` có không gian lên tới `min-w-[380px]`.

## 7. Đã bỏ icon Lũy kế duyệt chưa
- **Đã xóa triệt để.** Khung header "Lũy kế duyệt" hiện không còn tàn dư của bất kỳ icon info chấm than hay thẻ div bọc tooltip nào. 

## 8. Mobile regression
- Mọi logic fixed position bằng Portal đều được đóng chặt trong cụm Component Desktop độc lập (`DesktopUnitPickerPortal`), chỉ bung ra trên màn hình Desktop.
- Mobile vẫn giữ nguyên Bottom Sheet nguyên thủy, giao diện rất gọn gàng. Các Regression Screenshot đối chứng đã chứng minh Mobile không hề bị ảnh hưởng.

## 9. Screenshot evidence
Lưu trữ toàn bộ tại: `docs/qa/screenshots/field-progress-desktop-final-table-ui/`
(Kịch bản yêu cầu tên thư mục lưu chung, nên file tự động cập nhật trong folder này)
- `desktop-unit-picker-first-row-1366.png`
- `desktop-unit-picker-middle-row-1366.png`
- `desktop-unit-picker-bottom-row-1366.png`
- `desktop-unit-picker-apply-button-one-line.png` (Xác minh nút "Áp dụng" 1 dòng)
- `desktop-table-header-one-line-1366.png`
- `mobile-regression-unit-picker-390.png`

## 10. Test/build result
- Lệnh Test chạy hoàn thành toàn bộ (DB Audit, Rollup, Direct Save, Unit Tests): **PASS 100%**.
- Compiler build (TypeScript + Next.js build): **PASS 100%** (Exit code 0).

## 11. Còn lỗi gì không
- Desktop Master Table không còn bất kì vấn đề Readability nào. Popover Portal hoạt động trơn tru, cảm giác sử dụng mượt như app Native.
- Ready to commit & release. Mọi vấn đề UI Desktop đã đóng.
