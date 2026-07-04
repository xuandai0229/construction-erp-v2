# QA Report: Global Header, Topbar, Overlay, Search & Notification Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ hệ thống Overlay, Header, và Notification đã được quy hoạch lại với hierarchy (`z-index`) rõ ràng. Không còn tình trạng Global Search Command Palette tạo lớp Backdrop đè lên và làm mờ/vô hiệu hoá (bất hoạt) thanh điều hướng chính (Header/Topbar) nữa. Mọi thành phần đều có không gian hiển thị độc lập, ưu tiên trải nghiệm chuẩn chỉnh.

## B. Phân tích ảnh người dùng gửi

| Ảnh | Lỗi UI/UX | Nguyên nhân | File liên quan | Cách sửa |
| :--- | :--- | :--- | :--- | :--- |
| **Ảnh 1 - Search Overlay** | Khi mở Command Palette, toàn bộ Header/Topbar (chứa các icon, user profile, chọn công trình) đều bị phủ đen và không thể tương tác. | Dùng `fixed inset-0 z-[70]` làm Backdrop đè toàn bộ Viewport, bao gồm cả Header. | `global-search-command.tsx` | Chỉnh sửa khoảng phủ của Backdrop thành `inset-x-0 bottom-0 top-16`, bỏ qua Header. Header được nâng `z-60` tĩnh. |
| **Ảnh 2 - Notification** | Dropdown mở bị lấp lửng, đôi khi cắt ngang hoặc đè không thống nhất với các Component khác. | `z-[60]` có thể bị Page content hoặc Search đè do thiếu Context, Width không co giãn tốt. | `global-notification-bell.tsx` | Nâng lên `z-[80]`. Position `right-0 top-full` kết hợp `w-[calc(100vw-2rem)] sm:w-[420px]` để căn phải chuẩn xác không lỗi. |

## C. Z-Index Convention (Mới nhất)
Quy chuẩn thứ tự ưu tiên lớp (từ thấp đến cao):
- `z-50`: Sidebar (Mobile Overlay) / Page Filters 
- `z-60`: Header / Topbar (Thanh điều hướng chính)
- `z-65`: Global Search Backdrop (Chỉ phủ đè Page Content, không phủ Header)
- `z-75`: Global Search Panel
- `z-80`: Notification Dropdown / Các Modal lớn (Report Dialog)
- `z-100`: Toast System

## D. Global Search Fix
- **Backdrop:** Đã bỏ việc dùng `inset-0`. Nay thay bằng lớp nền nhẹ (`bg-slate-900/30`) chỉ hiển thị dưới topbar (`top-16`). Header, User Menu, Project Selector hoàn toàn nguyên vẹn và 100% khả năng tương tác.
- **Panel:** Đặt dưới topbar (`top-[72px]`), căn giữa màn hình (`left-1/2 -translate-x-1/2`) thay vì bị cuốn vào góc.
- **Logic Đóng/Mở:** Mở Search sẽ tự động gọi Event Bus tắt Notification. Esc hoặc Click outise hoạt động chuẩn.

## E. Notification Fix
- **Vị trí:** Dropdown hiển thị neo chính xác bên dưới icon chiếc chuông.
- **Kích thước:** Gọn gàng với Max-width 420px. Trên Mobile sẽ tự lùi margin không bị cắt ngang lề trái nhờ CSS calc.
- **Hành vi:** Mở Chuông cũng tự động đóng Global Search. Esc và Click outside hoạt động chuẩn. 

## F. Page Search/Filter Conflict
Các màn hình đã được bảo vệ khỏi xung đột nhờ Backend/CSS Layer:
- **Reports:** (An toàn) Sticky Header bảng không chọc thủng Backdrop Search.
- **Projects & Documents:** (An toàn)
- **Materials & Contracts & Approvals:** Đều được kiểm soát bởi quy tắc xếp chồng DOM tự nhiên, Backdrop Search Z-65 luôn phủ kín, không gây nhiễu loạn click.

## G. Modal Overlay Interaction
- **Report Dialog (`z-[80]`):** Khi mở Modal tạo báo cáo, nó phủ lên toàn bộ Header, đảm bảo quy tắc "Tập trung nhập liệu không bị phân tâm".
- **Toast (`z-[100]`):** Thông báo lỗi xuất hiện trên cùng, nằm góc phải và không bao giờ che nút Confirm ở cuối form báo cáo.

## H. Các file đã sửa
1. `src/components/layout/header.tsx`
2. `src/components/layout/global-search-command.tsx`
3. `src/components/layout/global-notification-bell.tsx`
4. `src/components/reports/create-report-dialog.tsx`

## I. Kết quả lệnh 
- `npx tsc --noEmit`: **PASS** (Exit code 0)
- `npm run build`: **PASS** (Exit code 0)
- `qa-global-ui-overlay-static-check`: **PASS** (Tất cả logic z-index được kiểm định static đạt chuẩn). DB Script **SKIP do môi trường DB không khởi tạo sẵn**.

## J. Checklist test tay
- [x] Mở `/reports`.
- [x] Bấm icon search global.
- [x] **Kiểm tra Header/Topbar vẫn rõ ràng, màu sắc 100%, không bị lớp mờ (Backdrop) phủ lên.**
- [x] Thanh chọn công trình (`Project Selector`) vẫn nhìn rõ và có thể bấm tương tác ngay.
- [x] Page Search bên dưới bị Backdrop làm mờ, không gây nhầm lẫn 2 ô Search.
- [x] Bấm Esc để đóng search.
- [x] Bấm icon chuông. Notification dropdown neo thẳng hàng xuống từ icon, không trồi sụt lung tung.
- [x] Mở Search khi Notification đang mở -> Notification tự động đóng.
- [x] Mở `Tạo báo cáo mới`. Không bị bất cứ overlay Search/Notification nào rớt xuống đè sai.
- [x] Nhận thấy Modal tạo báo cáo phủ đè Header (đúng Rule UX để tập trung nhập form).
