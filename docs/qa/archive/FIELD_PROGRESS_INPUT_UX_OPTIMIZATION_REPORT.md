# Báo Cáo Tối Ưu Hóa UX Bảng Khối Lượng Hiện Trường

## 1. Vấn đề UX trước khi tối ưu
- **Tốc độ nhập chậm**: Màn hình Daily trước đây chứa quá nhiều cột dàn trải (Khó khăn, Ghi chú dài, Vật tư, % Thực hiện...), khiến người dùng phải cuộn ngang liên tục trên thiết bị nhỏ.
- **Khó khăn khi sử dụng bằng Mobile**: Giao diện Table responsive cũ làm ô nhập "KL hôm nay" bị đẩy ra xa màn hình, khó tương tác.
- **Phân biệt Master/Daily**: Chưa có sự khác biệt rõ ràng giữa màn thiết lập (Master Data) và màn nhập liệu nhanh (Daily Entry), gây rối cho người thi công.
- **Điều hướng phím**: Chưa hỗ trợ `Enter` để nhảy xuống dòng tiếp theo như cách sử dụng Excel truyền thống.

## 2. Các điểm UX đã tối ưu

### a. Màn hình Master (`/field-progress`)
- Đã bổ sung Toolbar với 2 nút chuyển hướng rõ ràng: **Nhập hôm nay** và **Xem tổng hợp**.
- Phân tách rõ ràng giữa dòng hạng mục (Chữ đậm, nền xám/xanh) và dòng công việc.
- Các cột có thể nhập liệu được tô nền `bg-slate-50` nhẹ, hover sáng lên giúp người dùng biết có thể sửa, tránh nhầm lẫn với cột tự tính (Read-only).
- Cải thiện Empty State (Màn hình trống) với hướng dẫn trực quan.

### b. Màn hình Daily Entry (`/field-progress/daily`)
- **Desktop**: Đơn giản hóa bảng. Các trường "Khó khăn", "Đề xuất", "Ghi chú dài" được chuyển vào một Drawer (mở bằng nút **Mở rộng/Chi tiết** có icon `Maximize2`). Ô "KL Hôm nay" được thiết kế cực lớn (`h-9`, font bold) để làm nổi bật mục tiêu chính.
- **Mobile**: Sử dụng mô hình **Mobile Cards** (ẩn Table trên màn hình nhỏ). Mỗi công việc là 1 Card rõ ràng với khối Lũy kế, %, và ô nhập rất to. Các action **Lưu nháp / Gửi báo cáo** được Sticky cố định dưới chân trang mobile để tránh phải vuốt lên đầu bảng.
- **Thao tác phím**: Hỗ trợ Auto-select khi focus vào ô `KL hôm nay`. Hỗ trợ nhấn phím `Enter` tự động nhảy xuống focus ô input của dòng tiếp theo. Đổi màu nền (vàng) ngay lập tức khi phát hiện thay đổi chưa lưu.

### c. Màn hình Summary (`/field-progress/summary`)
- Giữ lại thiết kế ngang cho Desktop nhưng bổ sung thêm Card View cho Mobile. Trên mobile, các cột ngày được gom thành một hàng có thể vuốt ngang (Scroll horizontal container) độc lập bên trong mỗi Card, không làm vỡ layout toàn màn hình.
- Bổ sung UI Cảnh báo Vượt khối lượng: Highlight chữ đỏ và thêm thẻ Badge "VƯỢT".

## 3. Các file đã thay đổi
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/daily-entry-table.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`

## 4. Can thiệp Schema / DB
- **KHÔNG** sửa bất kỳ Schema nào. Không tạo migration. DB hoàn toàn nguyên vẹn.
- Tất cả xử lý chỉ thay đổi UI/UX Component ở lớp Frontend.

## 5. Kết quả Test 
*Do engine Playwright bị lỗi EOF, toàn bộ quá trình xác thực dựa vào Static Type Checking (Prisma/TSC) và Logic Code Verification.*
- **Tính toán Lũy kế**: Các hàm tính `cumAfter = item.cumulativeBefore + qToday` hoàn toàn tuân thủ logic. % hiển thị chính xác (VD: `218.4 / 218.6 = 99.91%`).
- **Cảnh báo vượt KL**: `isOver = percent > 100`. Áp dụng `text-red-600`, thẻ Badge `VƯỢT`, và `border-red-500` lên input.
- **Drawer**: Đã cài đặt một Fake-Drawer/Modal trong `daily-entry-table.tsx` thông qua biến state `activeDrawerItem`. Nó cung cấp form nhập đầy đủ (Ghi chú, IssueNote, ProposalNote) và đồng bộ ngược về trạng thái `items` của Table chính một cách trơn tru.

## 6. Lỗi còn tồn tại & Việc chưa làm
- Không làm "Kho vật tư" và "Workflow duyệt phức tạp" theo chỉ đạo.
- Không thể cung cấp File Screenshot do Playwright Test bị crash.

## 7. Kết quả System Check
- `npx prisma validate`: **Passed**
- `npx tsc --noEmit`: **Passed** (Đã fix lỗi import Button/Badge bị thiếu).
- `npm run build`: **Passed**
