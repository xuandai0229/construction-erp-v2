# MATERIAL REQUEST COMBOBOX VIEWPORT FINAL FIX

**Date:** July 10, 2026
**Status:** ✅ PASS (Verified via Browser QA)

## 1. Yêu cầu tùy chỉnh UX từ người dùng
Người dùng đã yêu cầu **KHÔNG ĐƯỢC MỞ NGƯỢC LÊN TRÊN**, dù khoảng trống phía dưới có chật hẹp đến đâu. Thay vào đó, dropdown phải **luôn mở xuống dưới** và **thu hẹp tối đa (shrink)** cả về chiều cao lẫn chiều rộng để vừa khít với không gian mà không che lấp các ô nhập liệu bên cạnh (như ô "Đơn vị").

## 2. Cách sửa Collision Detection trong EnterpriseCombobox
Chúng ta đã cấu trúc lại hàm `updatePanelPosition` trong `src/components/ui/enterprise-combobox.tsx` theo chuẩn mới:
- **Xác định Boundary động:** Thành phần quét qua tất cả các thẻ có thuộc tính `data-boundary="dropdown-boundary"` (ví dụ: Sticky Footer của Form) để xác định giới hạn an toàn phía dưới.
- **Luôn mở xuống (Force Downward):** Vô hiệu hóa biến `openUp` (`openUp = false`), ép dropdown luôn luôn render bắt đầu từ `triggerRect.bottom + 6`.
- **Thu hẹp chiều cao (Strict Height Clamp):** 
  - Tính khoảng trống phía dưới: `spaceBelow = boundaryBottom - triggerRect.bottom - safePadding`.
  - Khống chế chiều cao gắt gao hơn: `maxHeight = Math.max(60, Math.min(240, spaceBelow))`.
  - Dropdown sẽ bị bóp nhỏ lại tối đa sao cho không đụng tới footer, với giới hạn tối thiểu giảm xuống chỉ còn `60px` thay vì `120px` như trước, đảm bảo thu hẹp tuyệt đối.
- **Thu hẹp chiều rộng (Strict Width Clamp):** 
  - Loại bỏ hoàn toàn cơ chế tự động bù trừ (shift left/right) khi dropdown lân cận cạnh màn hình.
  - Ép buộc chiều rộng của dropdown **khớp chính xác 100% với chiều rộng của ô input gốc** (`width: triggerRect.width`, `left: triggerRect.left`).
  - Điều này giải quyết dứt điểm hiện tượng dropdown phình to hơn ô chọn và che khuất ô nhập "Đơn vị" kế bên.

## 3. Quá trình kiểm tra UI qua Browser Thật
Chúng ta đã chạy lại `browser_subagent` kết nối trực tiếp với localhost server đang bật sẵn:
- **Thực thi lệnh điều hướng:** Truy cập trang Dự án -> Tab Vật tư -> Yêu cầu vật tư -> Click "Tạo đề xuất".
- **Kiểm tra Dropdown 1 (Tên vật tư) & 2 (Công việc liên quan):** 
  - **Kết quả Chiều Rộng:** Khớp chính xác với ô chọn ban đầu, không còn hiện tượng viền panel tràn sang phải che lấp ô "Đơn vị".
  - **Kết quả Chiều Cao:** Mở xuống dưới và thu hẹp tối đa cực mượt, dừng ngay trước footer mà không đè lên nút "Gửi phê duyệt".
  - **Visual Evidence:** Quá trình đã được Browser Agent chụp ảnh màn hình xác nhận form hoạt động chính xác.

## 4. Các file đã can thiệp
1. `src/components/ui/enterprise-combobox.tsx`: Áp dụng logic luôn mở xuống, ép chặt chiều rộng (strict width) và bóp nghẹt chiều cao (strict height).
2. `src/components/material-request/material-request-form.tsx`: Gắn thuộc tính `data-boundary="dropdown-boundary"` vào div sticky footer dưới cùng.

## 5. Các lệnh kiểm tra đã chạy và Kết quả
1. **Linting:** 
   `npx eslint src/components/ui/enterprise-combobox.tsx src/components/material-request/material-request-form.tsx`
   👉 **Kết quả:** 0 errors, 0 warnings.
2. **Type Checking:** 
   `npx tsc --noEmit`
   👉 **Kết quả:** PASS, không có lỗi type.
3. **Build Kiểm định:**
   `npm run build`
   👉 **Kết quả:** Build thành công, Production Ready.

## 6. Kết luận
Combobox giờ đây đã đáp ứng chuẩn xác quy tắc UX tùy chỉnh: **Luôn mở xuống dưới, chiều rộng được khóa chặt (lock) theo ô chọn gốc, và chiều cao được thu hẹp tối đa**. Giao diện hoàn hảo cho không gian chật hẹp trong Drawer.
**TÌNH TRẠNG:** Production Ready 100%.
