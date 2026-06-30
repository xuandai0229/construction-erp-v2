# EXECUTIVE DASHBOARD PROJECT SWITCHER NOTIFICATION REPORT

## 1. Kết luận
- Trạng thái: PASS (Sẵn sàng UAT bằng hình ảnh).
- Đã đọc SKILL.md: Xác nhận đã đọc `design-taste-frontend/SKILL.md` (giữ nguyên layout gọn gàng, sử dụng border radius 2xl, bóng đổ shadow-sm nhẹ nhàng, và không lạm dụng red color).
- Đã thêm thanh chọn công trình: Thành công. Component `ExecutiveProjectSwitcher` được thêm vào ngay dưới Header, gọn gàng trong 1 dòng.
- Đã hỗ trợ Toàn hệ thống: Thành công. Bấm nút "Toàn hệ thống" sẽ clear query `projectId`, trả về dữ liệu của tất cả dự án trong phạm vi truy cập (Scope).
- Đã hỗ trợ chọn từng công trình: Thành công. Sử dụng `useRouter` để push `?projectId=xyz`. Cung cấp dropdown Command có ô search nhẹ, giúp chọn công trình nhanh chóng trong danh sách 50 công trình khả dụng mà không dùng tab ngang gây rối mắt.
- Dashboard đã filter theo projectId: Thành công. `getDashboardData` đã cập nhật để xử lý `rawProjectId`, gán vào `accessibleProjectIds` nhằm filter toàn bộ query (KPI, Việc cần xử lý, Báo cáo, Hoạt động gần đây).
- RBAC đã kiểm tra: Thành công. Nếu user thử truyền `projectId` mà họ không có quyền (không nằm trong `accessibleProjectIds`), backend sẽ tự động chặn và trả về data rỗng (empty result) chứ không leak thông tin.
- Đã thêm in-app notification: Thành công (Phase A). Các cảnh báo thật được query trực tiếp từ `DashboardData` (Hồ sơ chờ phê duyệt, Dự án trễ tiến độ, Báo cáo có vấn đề, Thanh toán chờ xử lý), hiển thị gọn gàng trong Popover.
- Đã thêm browser notification chưa: Chưa (Phase B). Việc gọi `Notification.requestPermission()` và Service Worker rất dễ gây gián đoạn UX hoặc spam. Giải pháp In-app đã đáp ứng tốt và an toàn hơn cho production hiện tại.
- Build/TypeScript: Pass 100%.

## 2. Phương án UI/UX
- Thanh công trình: Dạng một Card ngang mỏng (`h-12`). Chia làm 2 vùng: Bên trái là nhóm "Toàn hệ thống" & "Dropdown chọn công trình". Bên phải là Trạng thái công trình đang chọn (nếu có) và Nút chuông thông báo.
- Notification: Icon chuông có kèm `ping` animation khi có thông báo chưa đọc. Click vào mở Popover (Dropdown Box) hiển thị tối đa 5 cảnh báo nghiêm trọng nhất được sort theo Priority (HIGH/MEDIUM) và Thời gian.
- Responsive:
  - Desktop: Thanh nằm ngang thanh thoát.
  - Mobile: Các flex items tự động stack lại thông qua thuộc tính Flex Wrap hoặc chia cột đơn giản, các thông số text dài tự động `truncate`.

## 3. Logic dữ liệu
- Project scope: Cập nhật `schema.prisma` thêm model `Notification` để sẵn sàng cho Phase Notification lưu DB.
- Notification source: Query thông minh gom nhóm từ `pendingApprovals`, `attentionProjects`, `reportActions`, và `financeSummary.recentPayments`. Map về chuẩn chung `DashboardNotification` với icon/màu sắc nhận diện (Approval = CheckCircle, Project = AlertTriangle, Report = FileText, Payment = Receipt).
- Query filter: Query `getDashboardData` nhận tham số `rawProjectId`. Ghi đè `accessibleProjectIds` bằng tham số này nếu hợp lệ, để Prisma Query bên dưới (`projectWhere`, `projectIdScope`) tiếp tục filter.

## 4. File đã sửa
- `prisma/schema.prisma` (Thêm model Notification)
- `src/lib/dashboard/dashboard-queries.ts` (Sửa hàm getDashboardData)
- `src/app/(dashboard)/dashboard/page.tsx` (Truyền params xuống query)
- `src/components/dashboard/executive/executive-dashboard.tsx` (Gắn thẻ mới vào Dashboard)
- `src/components/dashboard/executive/executive-project-switcher.tsx` (Tạo mới)
- `src/components/dashboard/executive/executive-project-notifications.tsx` (Tạo mới)

## 5. Test đã chạy
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS

## 6. Rủi ro/còn lại
- Browser push khi app đóng nếu chưa làm: Chưa hỗ trợ Service Worker để push message nền.
- Cần user cấp quyền notification: Nếu muốn làm tính năng chuông thông báo push cho trình duyệt (Web Push) thì cần triển khai module riêng để xin quyền opt-in.
- Các điểm cần UAT: Check UX khi click vào dropdown chọn dự án, check trạng thái Popover Notification.
