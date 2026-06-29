# GLOBAL UI/UX AUDIT BEFORE REWORK

**Ngày audit:** 23/06/2026  
**Phạm vi:** Global layout, Reports, Projects, Documents, Users và các module hiển thị còn lại  
**Git baseline:** Sạch tại thời điểm bắt đầu (`git status --short` không có output)

## A. Executive Summary

UI/UX hiện tại đạt mức **khá, khoảng 7/10**: các luồng nghiệp vụ chính đã có bố cục responsive, trạng thái, loading/error cục bộ và nhiều màn đã được polish riêng. Tuy nhiên, hệ thống chưa tạo được cảm giác là một sản phẩm enterprise thống nhất vì primitive dùng chung còn mỏng, nhiều màn tự viết button/input/modal/table bằng class riêng.

- **Cần sửa nhiều nhất:** Users, Documents workspace, global primitives.
- **Cần polish có chọn lọc:** Reports, Projects, header/sidebar.
- **Chỉ cần chuẩn hóa empty state:** Materials, Suppliers, Contracts, Accounting, Approvals, Audit, Settings.
- **Rủi ro nếu redesign quá mạnh:** làm thay đổi thứ tự thao tác, che mất action theo quyền, gây regression mobile hoặc vô tình tác động workflow báo cáo/tài khoản.

Hướng xử lý được chọn là **controlled professional polish**: giữ nguyên cấu trúc dữ liệu và event handler; chuẩn hóa visual contract, spacing, focus, action affordance và responsive behavior.

### Phương pháp audit

- Đọc toàn bộ route/component chính và các báo cáo QA gần nhất.
- Kiểm tra trang đăng nhập bằng browser thực.
- Các route bảo vệ chưa thể audit trực tiếp trước sửa vì credential QA hiện tại không có trong môi trường và credential cũ không còn hợp lệ. Không dùng bypass auth, không reset mật khẩu và không sửa DB.

## B. Issues by severity

### Critical

- Không phát hiện lỗi UI Critical làm mất dữ liệu hoặc phá workflow trong phạm vi source audit.
- Browser protected-route audit đang bị chặn bởi credential; đây là rủi ro xác minh, không phải lỗi UI đã kết luận.

### High

1. Global CSS có nhánh dark mode trong khi phần lớn component hardcode light surface. Thiết bị bật dark preference có thể tạo input/background/text không đồng nhất.
2. Reports vẫn dùng `window.confirm` cho xóa báo cáo, lệch với ConfirmDialog dùng toàn hệ thống.
3. Users có nhiều modal tự viết với cấu trúc header/body/footer và responsive grid không đồng nhất; form hai cột có nguy cơ chật ở 390px.
4. Documents dùng action chỉ hiện qua hover ở một số card; thiết bị cảm ứng không có hover nên action khó phát hiện.

### Medium

1. Button/Card/Badge/EmptyState chưa có contract đủ chặt về height, shadow, focus ring, icon-only action và CTA.
2. Page max-width không đồng nhất: Reports 1400px, Projects 1600px, nhiều màn không giới hạn.
3. Header desktop thiếu ngữ cảnh trang; mobile menu chưa khóa scroll body và thiếu một số focus affordance rõ.
4. Table header, row height, action hover và empty row khác nhau giữa Reports, Projects, Users.
5. Badge “File lỗi”, “Phát sinh”, role và trạng thái còn có chỗ dùng span hardcode thay vì StatusBadge.
6. Empty state hiện cao cố định 400px, chưa linh hoạt với module nhỏ hoặc viewport mobile.
7. KPI Users dùng màu số khác nhau nhưng không có icon/semantic surface thống nhất.

### Low

1. Một số icon action có title nhưng chưa có aria-label đầy đủ.
2. Dấu required và helper text chưa dùng cùng tone.
3. Border radius dao động giữa `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`.
4. Shadow có chỗ dùng `shadow`, `shadow-sm`, `shadow-xl` không theo cấp độ surface.
5. Các module placeholder có page header thô và thiếu mô tả ngữ cảnh.

## C. Screens/modules audited

| Module | Current UX | Main issues | Priority |
| ------ | ---------- | ----------- | -------- |
| Global layout | Tốt, sidebar rõ | Container, light theme, focus và spacing chưa thành contract | High |
| Dashboard | Đã polish sâu | Chỉ cần bảo toàn, đồng bộ container | Low |
| Reports | Khá tốt, nhiều tính năng | Confirm xóa native, action/badge/table còn hardcode | High |
| Projects | Khá tốt | Page/table/card/action chưa dùng primitive thống nhất hoàn toàn | Medium |
| Project detail | Khá tốt | Card shadow/border và action hierarchy hơi mạnh | Medium |
| Documents overview | Dễ hiểu | Toolbar và project card còn prototype-like | Medium |
| Documents workspace | Nhiều chức năng | Mật độ cao, hover-only action, mobile height/layout | High |
| Users | Đủ logic | Nhiều modal/action style, mobile form và empty state | High |
| Materials | Placeholder | Header và empty state chưa theo page pattern | Low |
| Suppliers | Placeholder | Header và empty state chưa theo page pattern | Low |
| Contracts | Placeholder | Header và empty state chưa theo page pattern | Low |
| Accounting | Placeholder | Header và empty state chưa theo page pattern | Low |
| Approvals | Placeholder | Header và empty state chưa theo page pattern | Low |
| Audit | Placeholder | Header và empty state chưa theo page pattern | Low |
| Settings | Placeholder | Header và empty state chưa theo page pattern | Low |
| Login | Tốt | Cần bảo toàn visual hiện tại | Low |

## D. Recommended design direction

- **Sạch:** nền slate rất nhẹ, card trắng, border rõ hơn shadow.
- **Chuyên nghiệp:** hierarchy ổn định, action chính duy nhất, danger tách biệt.
- **Enterprise:** table/header/filter/modal dùng chung contract.
- **Dễ dùng công trường:** touch target tối thiểu 40px, text đủ tương phản, action không phụ thuộc hover.
- **Ít màu nhưng rõ trạng thái:** blue primary; emerald success; amber warning; rose danger; slate neutral; violet chỉ cho phân loại đặc biệt.

Không đổi DB, schema, RBAC, workflow báo cáo hoặc business logic.
