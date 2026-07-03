# QA Checklist: Documents - Nested Trash, Server-Side Pagination, UI Stability, Context Menu, and Big Uploads

This manual QA script outlines the exact steps to verify the final stabilization fixes in the Document Management module. It ensures that the nested trash navigation, server-side search/sort, upload constraints, and context menus are functioning perfectly in a real browser environment.

## 1. Nested Trash & F5 Persistence

**Mục tiêu:** Kiểm tra khả năng điều hướng sâu vào thùng rác, tải thêm nội dung, và giữ nguyên vị trí khi F5.

- [ ] Tạo một cấu trúc thư mục phức tạp: `Thư mục Cha` -> `Thư mục Con` -> `Thư mục Cháu` và upload vài file vào mỗi thư mục.
- [ ] Chọn `Thư mục Cha`, nhấn nút xoá (Đưa vào thùng rác).
- [ ] Vào mục **Thùng rác** (URL sẽ có `?trash=true`).
- [ ] Trong thùng rác, sẽ thấy `Thư mục Cha`. Mở thư mục này (Click vào nút Mở thư mục trong Context Menu hoặc nhấp đúp nếu có hỗ trợ).
- [ ] Xác nhận URL có query param `trashFolder=<ID của Thư mục Cha>`.
- [ ] **Nhấn F5 (Refresh trình duyệt)**. Xác nhận giao diện vẫn giữ nguyên ở bên trong `Thư mục Cha` thuộc thùng rác, và breadcrumb/header hiển thị chính xác.
- [ ] Đi tiếp vào `Thư mục Con`, xác nhận file và thư mục bên trong hiển thị đầy đủ.
- [ ] **Load More (Thùng rác):** Nếu tạo hơn 200/500 item trong thùng rác, cuộn xuống cuối hoặc bấm "Tải thêm". Xác nhận chỉ có các item của folder hiện tại được tải và hiển thị chính xác.
- [ ] Khôi phục `Thư mục Con` từ trong thùng rác. Xác nhận nó biến mất khỏi UI thùng rác lập tức (không cần tải lại trang).
- [ ] Trở về Workspace bình thường, xác nhận `Thư mục Con` đã được khôi phục thành công.

## 2. Server-Side Search & Sort (Cấp hiện tại)

**Mục tiêu:** Đảm bảo tìm kiếm và sắp xếp hoạt động trên toàn bộ dữ liệu máy chủ của cấp thư mục hiện tại, không bị giới hạn bởi client-side pagination.

- [ ] Trong một thư mục chứa rất nhiều file (ví dụ: tạo 500 file), tìm kiếm một file biết chắc chắn nằm ở "trang 3" (chưa được load về client).
- [ ] Nhập tên file vào thanh tìm kiếm.
- [ ] Kiểm tra URL xem query `?search=...` có được cập nhật không.
- [ ] Xác nhận file đó hiện ra (vì Server đã fetch data theo search).
- [ ] Đổi bộ lọc sắp xếp (Ví dụ: Cũ nhất). Kiểm tra URL có `?sort=OLDEST` và thứ tự danh sách cập nhật ngay lập tức.
- [ ] Reset tìm kiếm bằng cách xoá text, xác nhận hệ thống tải lại trang đầu tiên (hoặc hiển thị đúng như cũ).

## 3. Context Menu "Mở thư mục" ở Active Workspace

**Mục tiêu:** Mở thư mục bằng nút 3 chấm phải hoạt động chính xác ở mọi nơi.

- [ ] Tại Active Workspace (không phải Thùng rác), bấm vào nút 3 chấm (More Actions) của một thư mục.
- [ ] Chọn **Mở thư mục**.
- [ ] Xác nhận thư mục được mở ra (SelectedFolderId cập nhật). Trước đây chỉ hoạt động trong Thùng rác, giờ phải hoạt động ở Active.

## 4. Kiểm tra giới hạn Upload (Proxy/Infra Limit)

**Mục tiêu:** File vượt giới hạn app-level (hardcoded) nhưng nằm trong ngưỡng hạ tầng (VD: dưới 100MB) vẫn phải upload thành công.

- [ ] Chuẩn bị một file lớn (VD: file PDF, hoặc zip đổi đuôi thành pdf/dwg nếu hệ thống kiểm tra đuôi), kích thước **> 50MB nhưng < 100MB**.
- [ ] Upload file thông qua UI.
- [ ] Xác nhận không có lỗi "Size Mismatch" hay "Vượt quá giới hạn" báo ngay từ client. 
- [ ] Tiến trình tải lên chạy bình thường, server nhận đủ dữ liệu và hoàn tất.
- [ ] Thử upload file cực lớn (VD: 150MB), hệ thống có thể sẽ báo lỗi Proxy 413 Payload Too Large (Đây là expected behavior vì Proxy giới hạn 100MB theo `next.config.ts`).

---

**Kết quả:** Nếu tất cả các bước trên đều pass, hệ thống Document Management đã hoàn toàn sẵn sàng cho production.
