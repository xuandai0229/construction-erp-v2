# Mobile QA UI/UX Review - Phase 2 & 3

## Tóm tắt Giai đoạn 2: App Shell
*   **Header**: Đã tinh chỉnh khoảng cách (`gap`) giữa các icon trên mobile để đảm bảo không dính nhau. Đã mở rộng component search để không bị ẩn trên màn hình di động (`hidden sm:flex` -> `flex`).
*   **Notifications Bell**: Popover đã được sửa đổi để sử dụng `fixed` trên màn hình nhỏ thay vì `absolute right-0` nhằm tránh hiện tượng overflow ra khỏi lề trái của màn hình điện thoại (viewport < 350px).
*   **Help Popover**: Đã được cố định (`fixed inset-x-2`) trên thiết bị di động.

## Tóm tắt Giai đoạn 3: Core Modules
### 1. Dashboard (Bảng điều khiển)
*   **KPI Grid & Card**: Đảm bảo chế độ hiển thị 2 cột, giảm padding và font size trên điện thoại để các card trở nên "thấp" và dễ quét nội dung hơn, tránh chiếm dụng chiều cao màn hình.
*   **Action List**: Làm gọn padding, kích thước icon nhỏ lại. Cập nhật `EmptyState` để không chiếm nửa màn hình (`min-h-[120px]`).
*   **Project Overview**: Rút gọn danh sách, giảm khoảng cách dòng và icon.
*   **Recent Reports & Documents**: Giảm padding từ `p-4` xuống `p-3`, thay đổi icon size và loại bỏ các thành phần rườm rà.

### 2. Danh sách Công trình (Projects List)
*   **Mobile Card**: Làm mỏng card bằng cách loại bỏ thông tin Chủ đầu tư (`CĐT`) trên điện thoại di động vì thông tin này làm dài card một cách không cần thiết.
*   **Action Buttons**: Icon "Xem chi tiết" và "Sửa" được làm nhỏ và tinh tế hơn.
*   **Grid Layout**: Hoạt động ổn định ở 1 cột trên `sm` và 2 cột trên tablet/desktop.

### 3. Chi tiết Công trình (Project Detail)
*   **Header**: Tiêu đề tên công trình sử dụng `line-clamp-2` để hỗ trợ hiển thị tên dài (tối đa 2 dòng), không còn bị `truncate` cắt ngang đột ngột. Mã dự án (Code) và trạng thái (Status) được thu gọn.
*   **Thư mục (Folders)**: Đã tinh giản icon và khoảng cách.
*   **Khối lượng thi công (WBS & Field Progress)**: Được giảm padding, tiêu đề và subtext thu nhỏ trên viewport điện thoại, đảm bảo người dùng có cái nhìn tổng quan mà không cần phải cuộn nhiều.

## Kiểm thử Runtime (Playwright & Build)
*   Quá trình `next build` hoàn tất (0 lỗi TypeScript), đảm bảo mã nguồn React hoàn toàn sạch và không bị lỗi type khi chuyển đổi UI.
*   Các bài test tự động (`playwright`) với viewport nhỏ 320px (iPhone SE) và 390px đang được chạy và không gặp lỗi overflow (đã được fix thông qua Giai đoạn 1/2).
