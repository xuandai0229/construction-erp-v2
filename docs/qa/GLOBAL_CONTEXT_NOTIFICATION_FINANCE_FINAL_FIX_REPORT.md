# Báo cáo Audit & Fix Đồng bộ Global Context & Chức năng (FINAL)

## 1. Vấn đề 1: Báo cáo (Reports) Crash khi ấn từ Notification
**Nguyên nhân gốc (Root Cause):**
Khi ấn vào notification báo cáo có vấn đề, URL truyền tham số `status=ISSUE`. Tuy nhiên trong Prisma `SiteReportStatus` enum không chứa giá trị `ISSUE`. Việc ném `ISSUE` thẳng vào mệnh đề `where.status` của hàm `prisma.siteReport.count()` khiến Prisma throw `PrismaClientValidationError` và làm dashboard crash do lỗi hydration server-to-client.
Đồng thời, filter `reportId` trong `ReportsWorkspace` không được xử lý ở API nên không tìm được đúng báo cáo cần xem.

**Giải pháp (Remediation):**
- Trong `reports/actions.ts` (`getSiteReportsPage`), kiểm tra nếu `filters.status === "ISSUE"`, hệ thống không gán vào `where.status` mà thay bằng điều kiện truy vấn custom (`issues { not: null }` hoặc `lines { some: { issueNote: { not: null } } }`) tương đương với tab "issues".
- Cập nhật hàm lọc `getSiteReportsPage` để hỗ trợ param `reportId`.
- Thêm `useEffect` trong `ReportsWorkspace` để tự động mở `DetailDrawer` nếu URL chứa `reportId` và tìm thấy báo cáo trong danh sách.

## 2. Vấn đề 2: Dữ liệu Tài chính "Chưa có hợp đồng" & Lỗi hiển thị sai Project
**Nguyên nhân gốc (Root Cause):**
1. Người dùng chọn dự án "Trần Quang Hiếu" trên topbar, dữ liệu hiển thị `Chưa có hợp đồng / Chưa có hồ sơ` thay vì hiển thị dữ liệu của "Dự án Tây Hồ". Kiểm tra DB thực tế (bằng script `audit-finance-context-consistency.js`) cho thấy dự án "Trần Quang Hiếu" thực sự chưa có hợp đồng hay thanh toán nào (Data = 0). Do vậy, Dashboard hiển thị đúng sự thật. 
2. Vấn đề thực sự nằm ở các module `Hợp đồng` và `Thanh toán`: Các module này có filter công trình độc lập, không đọc `Global Project Context` (Cookie / URL). Dẫn đến việc khi Topbar đang chọn "Trần Quang Hiếu", người dùng ấn sang module "Hợp đồng" lại thấy hợp đồng của "Tây Hồ" vì module này mặc định chọn "Tất cả công trình".

**Giải pháp (Remediation):**
- Cập nhật trang `accounting/page.tsx` và `contracts/page.tsx` để đọc `getGlobalProjectContext` và truyền `initialProjectId` vào workspace.
- Trong Workspace, state `filterProject` được khởi tạo bằng `initialProjectId`. Khi người dùng thay đổi filter trong module, gọi `setProjectContextCookie` để cập nhật ngược lại Topbar.

## 3. Vấn đề 3: Chức năng Tìm kiếm (Global Search) chưa hoạt động
**Nguyên nhân gốc (Root Cause):**
Component `GlobalSearchCommand` chỉ thực hiện lọc chuỗi (filter string) trên tập danh sách 50 project và 5 notification đã tải sẵn vào bộ nhớ của `globalContext`. Nó không tìm kiếm toàn hệ thống và chưa hỗ trợ tìm kiếm Báo cáo (Reports).

**Giải pháp (Remediation):**
- Tạo Server Action mới `searchSystem(query, projectId)` tại `src/app/actions/global-search.ts`.
- Hành động này thực hiện Full-Text/LIKE search trực tiếp vào Database cho các bảng `Project`, `ApprovalRequest` (Notifications) và `SiteReport` (Báo cáo hiện trường).
- Cập nhật `GlobalSearchCommand` sử dụng debounce 300ms gọi `searchSystem` qua mạng và hiển thị kết quả tìm kiếm thực.

## 4. Vấn đề 4: Nút Help (?) chưa có tác dụng
**Nguyên nhân gốc (Root Cause):**
Nút Help ở Header sử dụng nội dung placeholder giả định hoặc chưa được implement đúng.

**Giải pháp (Remediation):**
- Sửa lại nội dung popover tại `header.tsx` để phản ánh đúng luồng sử dụng của Executive Dashboard: "Gợi ý: Sử dụng Cmd+K để tìm nhanh", "Xem thông báo tập trung tại chuông", và "Chọn công trình tại danh sách xổ xuống".
