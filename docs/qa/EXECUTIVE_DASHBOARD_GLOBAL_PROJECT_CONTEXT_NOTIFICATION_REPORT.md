# EXECUTIVE DASHBOARD GLOBAL PROJECT CONTEXT NOTIFICATION REPORT

## 1. Kết luận
- Trạng thái: PASS (Sẵn sàng UAT bằng hình ảnh).
- Đã đọc SKILL.md: Xác nhận đã đọc các rules liên quan đến UI/UX, đảm bảo topbar gọn gàng, không dùng tab dài ngoằng, giữ form compact `rounded-xl`, shadow nhẹ, layout đồng bộ với giao diện hiện tại.
- Đã chuyển chọn công trình lên topbar: Thành công.
- Đã bỏ switcher dưới header: Đã xóa `ExecutiveProjectSwitcher` khỏi Dashboard. Dashboard body bây giờ chỉ tập trung vào dữ liệu điều hành (ExecutiveHeader, KPI, Chart).
- Đã lưu selected project qua cookie: Thành công. Dùng Next.js Server Action (`setProjectContextCookie`) để set cookie `selectedProjectId` (hạn 30 ngày) giúp lưu giữ ngữ cảnh.
- F5 có giữ công trình không: CÓ. AppShell (Server Component) đọc cookie này và truyền context xuống cho Header và Switcher. Dashboard Page cũng đọc cookie gián tiếp qua `rawProjectId` nếu có, hoặc sẽ gọi `getGlobalProjectContext` (trực tiếp lấy cookie) để query dữ liệu.
- Chuyển màn có giữ công trình không: CÓ. Cookie hoạt động ở mọi route `/` toàn app. Topbar luôn hiển thị project đã chọn dù ở route `/dashboard` hay `/materials`.
- Dashboard có filter theo selected project không: CÓ. Dashboard data ưu tiên đọc `rawProjectId` từ URL `searchParams`, nếu không có sẽ lấy từ cookie, cuối cùng mới fallback về toàn hệ thống.
- RBAC đã validate projectId/cookie chưa: CÓ. `getGlobalProjectContext` validate `cookieProjectId` hoặc `searchParamsProjectId` luôn nằm trong mảng `accessibleProjectIds` của User. Nếu không hợp lệ sẽ trả về `selectedProjectId = null`.
- Thông báo hiện tại là computed alert hay DB notification: Hiện tại là "Cảnh báo dựa trên dữ liệu thật" (Computed alerts từ ApprovalRequest, SiteReport, Project status). Không phải Database Notification hoàn chỉnh.
- Nếu chưa DB notification, đã ghi rõ là cảnh báo dựa trên dữ liệu thật chưa: Đã ghi rõ trong UI và Report là "In-app alerts dựa trên dữ liệu thật". Model `Notification` đã có trong Prisma nhưng hiện tại chưa làm flow generate/trigger do chưa có module event bus.
- Browser notification/push đã làm chưa: Chưa kích hoạt để tránh spam UX.
- Build/TypeScript: PASS 100%.

## 2. Phân tích hiện trạng trước khi sửa
- Project switcher: Từng nằm cứng ở dưới header Dashboard, làm gãy mạch logic global app. Chuyển màn hình sẽ bị mất công trình đang chọn.
- Context persistence: Trạng thái chỉ được giữ bằng `searchParams` trên URL (`?projectId=xyz`). Khi F5 ở URL không có query hoặc click menu, state bị reset.
- Notification source: Query thẳng từ `SiteReport`, `ApprovalRequest`.
- Schema/migration: Schema có bảng `Notification` nhưng code chưa emit event tạo notification.

## 3. Những gì đã sửa
- Topbar: Header layout được bổ sung `GlobalProjectContextSwitcher` gọn gàng ở flex space bên trái vùng search/tài khoản.
- Project context: Tạo file `src/lib/project-context.ts` với hàm `getGlobalProjectContext` kết hợp đọc Cookie và RBAC, tính toán cả Notification Badge cho toàn app.
- Cookie/localStorage: Dùng Server Action để lưu cookie `selectedProjectId` mỗi khi người dùng chọn dự án từ dropdown.
- Dashboard query: Dashboard vẫn nhận `projectId` từ URL (ưu tiên) nhưng nếu URL trống thì dựa vào global cookie.
- Notification/cảnh báo: `GlobalNotificationBell` nằm trên topbar. Khi ở Toàn hệ thống, nó đếm tổng cảnh báo. Khi ở 1 dự án, nó chỉ đếm cảnh báo của dự án đó.
- RBAC: Xử lý triệt để: Nếu có URL/Cookie nhưng id dự án đó không thuộc quyền quản lý, `getGlobalProjectContext` sẽ bỏ qua và coi như `selectedProjectId = null`.

## 4. File đã sửa
- `src/components/layout/app-shell.tsx` (Chèn global context query)
- `src/components/layout/header.tsx` (Bổ sung props và render components mới)
- `src/components/layout/global-project-context-switcher.tsx` (Tạo mới: UI Topbar Selector)
- `src/components/layout/global-notification-bell.tsx` (Tạo mới: Thay thế `executive-project-notifications`)
- `src/components/dashboard/executive/executive-dashboard.tsx` (Xóa bỏ selector cũ)
- `src/lib/project-context.ts` (Tạo mới: Helper đọc Cookie/DB, validate RBAC, compute notifications)
- `src/app/actions/project-context.ts` (Tạo mới: Server Action set cookie)

## 5. Test đã chạy
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Screenshot UI: Lưu tại `docs/qa/screenshots/executive-dashboard-global-project-context.png`

## 6. Còn lại / phase sau
- Tự cập nhật context khi vào `/projects/[projectId]`: Có thể thêm hook client-side ở Root Layout để tự động check URL params, nếu thấy UUID của project thì tự động set lại Cookie tương ứng.
- Browser push khi app đóng: Chưa làm, cần Service Worker.
- Notification DB: Sẽ làm riêng 1 task migration và Notification System Trigger (Pub/Sub hoặc Background Worker).
- Các điểm cần UAT: F5 trình duyệt khi đang ở công trình, click sang trang Tài liệu (`/documents`) xem topbar còn giữ tên công trình không.
