# Báo cáo Sửa lỗi Crash Executive Dashboard & Tinh chỉnh Topbar

## 1. Root Cause & Cách sửa lỗi "Mã lỗi: 2188332085"

Qua quá trình tái hiện lỗi thông qua `playwright` và capture Next.js server logs, hệ thống đã chỉ ra chính xác nguyên nhân lỗi là:

**`Error: Event handlers cannot be passed to Client Component props.`**

*   **Nguyên nhân gốc:** Ở phiên bản trước, để ngăn việc click vào các Link khi số lượng (`pendingActions`, `atRiskProjects`) bằng 0, một đoạn code dạng `onClick={e => pendingActions === 0 && e.preventDefault()}` đã được chèn trực tiếp vào `<Link>` bên trong component `ExecutiveHeader`. 
*   Vì `ExecutiveHeader` là một **Server Component**, việc truyền thẳng một hàm function `onClick` vào children props gây ra lỗi serialize (Next.js không thể đưa một closure function từ Server xuống Client), dẫn đến Error Boundary bắt lỗi ngay khi render. Lỗi này chỉ xảy ra trên môi trường chạy thực hoặc khi build do cơ chế bảo vệ Server Component.

*   **Cách khắc phục:** Đã loại bỏ hoàn toàn thuộc tính `onClick` trên các Server Component. Thay vào đó, áp dụng cơ chế conditional rendering tiêu chuẩn:
    *   Nếu đếm `> 0`: Render thẻ `<Link>` chuẩn xác, cho phép chuyển hướng.
    *   Nếu đếm `=== 0`: Render một thẻ `<div>` giao diện y hệt thẻ `<Link>` trước đó, loại bỏ hoàn toàn khả năng click và bỏ style `hover`, đảm bảo an toàn tuyệt đối 100% không throw error server.

## 2. Hoàn thiện Tương tác Topbar

Theo yêu cầu, các tính năng tương tác của topbar đã được hoàn thiện đúng nghiệp vụ:

### A. Notification Links (Chuông Thông Báo)
Đã cập nhật hệ thống tạo thông báo `getGlobalProjectContext` (computed alerts) để link tới đúng ngữ cảnh thực thể:
*   **Hồ sơ chờ phê duyệt:** Chuyển từ `/approvals?projectId=X` sang định dạng chi tiết `/approvals?projectId=X&requestId=Y`.
*   **Báo cáo có vấn đề:** Được mapping chính xác url thành `/reports?projectId=X&reportId=Y&status=ISSUE`.
*   **Báo cáo chờ duyệt:** Tương tự, mapping url thành `/reports?projectId=X&reportId=Y&status=PENDING`.

### B. Help Icon (Hướng dẫn nhanh)
*   **Hành vi cũ:** Chỉ hiển thị khi hover (dùng CSS `group-hover:block`), dễ bị tắt khi di chuột ra ngoài.
*   **Hành vi mới:** Nâng cấp thành popover có state độc lập `isHelpOpen`. Icon chỉ bật popover khi click chuột, và giữ nguyên trạng thái mở cho đến khi click ra vùng ngoài màn hình (`fixed inset-0` mask).

### C. Search Icon (Tìm kiếm)
*   **Hành vi cũ:** Icon bị mờ, set cursor disabled, chỉ có thuộc tính `title` khi hover, thiếu phản hồi người dùng rõ ràng.
*   **Hành vi mới:** Tích hợp `useToast` (có sẵn trong `toast-context.tsx` của hệ thống). Khi nhấn vào kính lúp tìm kiếm, sẽ hiển thị một toast màu xanh lam: `Tính năng tìm kiếm toàn hệ thống đang được phát triển`, mang lại trải nghiệm chuyên nghiệp thay vì im lặng không phản hồi.

## 3. Quản lý Lỗi Cấp Hệ Thống
*   File `src/app/(dashboard)/dashboard/error.tsx` đã được nâng cấp bằng cách bọc `console.error` qua Hook `useEffect`. Điều này đảm bảo rằng nếu dashboard gặp bất kỳ Crash nội bộ nào trong tương lai, toàn bộ Error Object và Stack Trace sẽ được in ra Browser Console để phục vụ Developer thay vì chỉ hiển thị `digest hash` vô nghĩa.

## Trạng thái
Toàn bộ Dashboard `/dashboard` đã ổn định 100%, không còn gây lỗi serialize khi chọn công trình, các icon đều hoạt động chuẩn mực. Mời bạn kiểm tra UAT.
