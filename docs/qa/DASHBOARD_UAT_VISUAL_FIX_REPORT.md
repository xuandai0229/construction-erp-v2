# DASHBOARD UAT VISUAL FIX REPORT

## 1. Kết luận
- Trạng thái: PASS
- Đã sửa theo ảnh UAT: Hoàn tất toàn bộ yêu cầu về bố cục (Finance compact, KPI grid 1 cột/nhiều cột tự thích ứng, Action list filter)
- Build/TypeScript: Pass (không còn lỗi)
- Có chạy npm run dev không: Không chạy (tuân thủ yêu cầu)

## 2. Vấn đề từ ảnh UAT
- Finance quá cao/rỗng: Đã chuyển thành compact band gồm 3 cột ở dưới cùng, tối ưu không gian, không bị kéo giãn theo danh sách khác.
- Cần xử lý ngay bị đẩy xuống: Đã đẩy Action List, Project Overview lên hàng đầu trong grid.
- Activity nhiễu reset password: Đã lọc bỏ các activity của system, user, login, logout khỏi timeline.
- Item đã duyệt nằm trong cần xử lý: Đã thêm bộ lọc loại bỏ toàn bộ các trạng thái hoàn tất/đã duyệt ("APPROVED", "COMPLETED", "DONE", "FINISHED", "PAID", "RESOLVED", "Đã duyệt", "Hoàn thành", "Đã thanh toán") khỏi danh sách "Cần xử lý ngay".
- Ngày tháng chưa đồng nhất: Đã thống nhất định dạng `dd/MM/yyyy` ở Action List, Site Reports và `dd/MM/yyyy HH:mm` ở Activity Timeline. Tiêu đề báo cáo tự động hiển thị "Báo cáo ngày dd/MM/yyyy".
- KPI chưa cân đối: Đã gộp thành 5-6 KPI cốt lõi. Áp dụng CSS `flex-1` trên màn hình lớn để các card tự chia đều không gian, không bị ô trống ở hàng cuối.

## 3. Những gì đã sửa
- `page.tsx`: Cấu trúc lại thứ tự components (đưa Header -> KPI -> Grid Action -> Finance Panel).
- `dashboard-finance-summary.tsx`: Thiết kế lại layout thành dạng band nằm ngang, 3 vùng thông tin. Dùng `divide-x` và bỏ padding thừa.
- `dashboard-kpi-grid.tsx`: Thay đổi CSS Grid sang Flex wrap với `xl:flex-1` để card tự dàn đều.
- `dashboard-queries.ts`: 
  - Cập nhật số lượng và thành phần các thẻ KPI (Chỉ xuất thẻ "Thanh toán chờ xử lý" nếu có quyền, gộp thẻ báo cáo & tài liệu).
  - Loại bỏ audit logs liên quan đến User/Session.
  - Fix query lấy "Báo cáo ngày..." cho Recent Site Reports.
  - Tạo mảng loại trừ các items đã xử lý khỏi `actionItems`.
- `dashboard-activity-timeline.tsx`: Thêm `line-clamp-1` vào trường tên project để tránh nhảy dòng.
- `dashboard-recent-site-reports.tsx`: Loại bỏ render date cũ, dùng duy nhất `formatDateVNShort` cho consistency.

## 4. File đã thay đổi
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/components/dashboard/dashboard-finance-summary.tsx`
- `src/components/dashboard/dashboard-kpi-grid.tsx`
- `src/components/dashboard/dashboard-activity-timeline.tsx`
- `src/components/dashboard/dashboard-recent-site-reports.tsx`
- `src/lib/dashboard/dashboard-queries.ts`

## 5. RBAC có giữ nguyên không
- Giữ nguyên 100%. Các helpers `canViewApprovalDashboard`, `canViewFinanceDashboard`, và scope queries không thay đổi. Component Finance vẫn chỉ hiển thị nếu có role truy cập tài chính.

## 6. Test đã chạy
- `npx prisma validate`: Schema hợp lệ.
- `npx prisma generate`: Cập nhật client thành công.
- `npx tsc --noEmit`: Không có lỗi kiểu dữ liệu.
- `npm run build`: Hoàn tất production build.

## 7. Cần tôi test lại bằng mắt
- Desktop: Kiểm tra độ cân đối của các KPI card, cấu trúc layout đưa ActionList lên trên, compact Finance bar ở dưới cùng.
- Laptop: Xác nhận không bị overflow ngang.
- Mobile 360px: Xem các phần tử stack thành 1 cột từ trên xuống dưới (Header -> KPI -> Cần xử lý -> ... -> Finance) có đúng không.
- Role Admin/Director: Phải thấy toàn cảnh (có approvals, finance).
- Role Accountant: Sẽ thấy phần Finance compact ở dưới.
- Role Chief Commander/Engineer/Staff: Không thấy Finance band. Không thấy activity hệ thống.
