# Báo cáo: Documents Remove Status UI & Polish Edit Modal

## 1. Executive Summary
Sau khi gỡ bỏ tính năng "Phân loại hồ sơ", chúng tôi tiếp tục đơn giản hóa UI của module Documents bằng cách ẩn/gỡ bỏ hoàn toàn luồng duyệt và các cảnh báo/tình trạng trạng thái tài liệu khỏi giao diện thường ngày (Document Workspace & Viewer). Đồng thời, modal sửa thông tin hồ sơ được làm gọn và cải thiện UI.

## 2. Các thay đổi chính

### 2.1 Loại bỏ hoàn toàn UI "Trạng thái phê duyệt"
- **Workspace UI**: Gỡ bỏ hoàn toàn việc hiển thị badge trạng thái ("Chờ duyệt", "Đã duyệt", v.v.) trong lưới tài liệu (File card).
- **Group by**: Xóa bỏ tùy chọn nhóm hiển thị theo trạng thái (`groupBy === "STATUS"`).
- **Menu file**: Gỡ bỏ hoàn toàn tùy chọn "Đổi trạng thái" khỏi dropdown thao tác ở mỗi file.
- **Document Viewer**: Gỡ bỏ nhãn trạng thái ("Mới tải lên", "Từ chối", "Đã duyệt"...) và nút bấm "Đổi trạng thái" trên thanh công cụ xem chi tiết.
- **State/Logic**: Xóa state `changeStatusModal`, hàm `handleChangeStatus`, các thuộc tính prop liên quan (`canChangeStatus`, `onChangeStatus`) để làm sạch file.
- **Lưu ý**: Field `status` trong Database/Prisma schema KHÔNG bị xóa, vẫn được giữ ở trạng thái "dormant", do đó không yêu cầu chạy migration hay ảnh hưởng tới cấu trúc DB hiện tại.

### 2.2 Đổi tên và làm đẹp Modal Edit Metadata
- **Tiêu đề**: Đổi từ "Sửa thông tin hồ sơ" thành **"Đổi tên / Ghi chú"**.
- **Chỉ giữ lại 2 trường nhập**: Tên hiển thị, Ghi chú.
- **Styling UI mới**:
  - Gỡ bỏ UI có thể gây rối với màu quá nổi bật (nếu có) trước đây.
  - Sử dụng nền trắng tinh (`bg-white`).
  - Màu chữ xám đen dễ đọc (`text-slate-900`).
  - Border nhẹ nhàng (`border-slate-200`).
  - Outline và viền xanh khi focus (`focus:border-blue-500`, `focus:ring-blue-500`).

## 3. Xác minh UI
Đã kiểm tra bằng Regex cho các từ khóa không còn tồn tại trên giao diện:
- `Đổi trạng thái` -> KHÔNG CÒN
- `Chờ duyệt` -> KHÔNG CÒN
- `SUBMITTED` -> KHÔNG CÒN
- `APPROVED` -> KHÔNG CÒN
- `REJECTED` -> KHÔNG CÒN
- `changeStatusModal` -> ĐÃ XÓA SẠCH

## 4. Kết quả Build & Validation
- Lệnh: `npx prisma validate` -> PASS (Schema remains valid).
- Lệnh: `npx prisma generate` -> PASS.
- Lệnh: `npx tsc --noEmit` -> PASS (Exit code 0). Không có lỗi type do gỡ state thừa.
- Lệnh: `npm run build` -> PASS (Exit code 0). Ứng dụng production sẵn sàng.

## 5. Kết luận
- Mọi chức năng thừa, dễ gây khó hiểu cho người dùng ở công trường (ví dụ như luồng phê duyệt chưa sử dụng) đã được ẩn hoàn toàn khỏi bề mặt giao diện.
- Trải nghiệm sử dụng Documents hiện tại đã về mức cơ bản, thuần túy và dễ tiếp cận nhất (Upload, Sắp xếp, Xem, Download). 
- Toàn bộ source code được giữ sạch, không push, không thay đổi schema. Tình trạng dự án an toàn để merge/deployment.
