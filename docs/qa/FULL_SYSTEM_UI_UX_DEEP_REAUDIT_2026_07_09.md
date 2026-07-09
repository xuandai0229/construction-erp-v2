# FULL SYSTEM UI/UX DEEP REAUDIT
**Date:** 2026-07-09

## 1. Phân tích kết quả trước đây (Tại sao chưa đạt?)
Trong file `UI_UX_SYSTEM_POLISH_PHASE_0_REVIEW_2026_07_09.md`, báo cáo khẳng định đã hoàn thành UI/UX polish cho toàn hệ thống. Tuy nhiên:
- **Thực tế thiếu sót:** Chỉ mới sửa một số trang bề mặt (Projects, Users, Documents) và Drawer của Reports. Rất nhiều module (Materials, Contracts, Suppliers, Accounting, Approvals) được "nhìn qua" và gắn mác "hoàn thành" dù bên trong vẫn chứa hàng loạt thẻ `<table className="...">` thuần túy, các class hardcode (`rounded-2xl`, `bg-blue-50`), và thẻ HTML thủ công.
- **Lỗi hiện hữu chưa sửa:** Dashboard bị lỗi cắt xén ở phần top, các Report Card bị chồng chữ (overflow text), layout bị mất cân đối.
- **Chưa có chuẩn hóa thật sự:** Component `EnterpriseTable` chỉ là một thẻ `div` bọc ngoài, bên trong các module vẫn tự viết `table`, `th`, `td` với padding và style khác nhau. Drawer/Modal ở các phân hệ vẫn dùng class phân mảnh.

## 2. Các module cần Audit & Sửa chữa thật sự
- **Dashboard:** Lỗi cắt top, card báo cáo vỡ layout, spacing chưa chuẩn.
- **App Shell (Topbar/Sidebar):** Khoảng cách và z-index chưa đồng bộ.
- **Reports:** Cần kiểm tra sâu hơn list view và grid.
- **Contracts, Suppliers, Materials, Accounting:** Tất cả đang tự render `<table className="...">` và custom Mobile Card. Cần phải polish lại thẻ, màu sắc, border radius cho đồng nhất 100%.
- **Approvals:** Giao diện custom rất nhiều, shadow và border radius cần đồng bộ về `14px` (hoặc `xl` chuẩn).
- **Settings:** Custom layout cần đối chiếu lại chuẩn.

## 3. Lỗi UI/UX nghiêm trọng trên Dashboard
- Layout chính (`app-shell`) hoặc container của dashboard có vấn đề về height (`100vh`) kết hợp với fixed topbar gây ra tình trạng nội dung bị "chui" xuống dưới topbar hoặc bị cắt mất.
- Component "Báo cáo nổi bật" không xử lý overflow tốt (ví dụ tên báo cáo dài hoặc text nhiều), dẫn đến đè chữ.

*Tài liệu này sẽ liên tục cập nhật trong quá trình fix.*
