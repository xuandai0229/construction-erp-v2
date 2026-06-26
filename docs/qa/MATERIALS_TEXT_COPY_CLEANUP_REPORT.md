# Báo Cáo Rút Gọn Text & Nội Dung Bảng Điều Khiển Vật Tư (Copywriting Audit)

## 1. Cơ Sở Thiết Kế
- Áp dụng triệt để bộ quy tắc từ `.agents/skills/design-taste-frontend/SKILL.md`.
- Tập trung vào nguyên tắc UI "Anti-slop": Giao diện phải sạch sẽ, không dùng từ ngữ thừa, không mô tả lan man những thứ đã hiển nhiên, giúp người dùng lướt nhanh và chính xác hơn.

## 2. Danh Sách Các File Được Audit
1. `src/components/materials/materials-workspace.tsx`
2. `src/components/materials/materials-overview.tsx`
3. `src/components/materials/materials-catalog.tsx`
4. `src/components/materials/materials-stock-table.tsx`
5. `src/components/materials/materials-transactions.tsx`
6. `src/components/materials/material-form-dialog.tsx`
7. `src/components/materials/transaction-form-dialog.tsx`
8. `src/app/(dashboard)/materials/page.tsx`

## 3. Bảng Phân Tích & Hành Động (Text Audit Table)

| Vị trí / File | Text Cũ | Vấn đề | Quyết định / Text Mới |
|---|---|---|---|
| Workspace | `Dữ liệu của công trình: [Mã CT]` | Trùng lặp với input "Chọn công trình" | Bỏ hoàn toàn |
| Workspace (Empty state) | `Chưa có công trình để theo dõi vật tư... Bạn cần được phân quyền vào một công trình đang hoạt động trước khi nhập, xuất hoặc xem tồn kho.` | Quá dài, nhiều chữ | Rút gọn: `Chưa chọn công trình` / `Bạn cần chọn một công trình để xem dữ liệu vật tư.` |
| Overview (Cards) | `Mã đang theo dõi`, `Mã có tồn kho`, `Vật tư cần bổ sung`, `Giao dịch tháng này` | Hơi thừa chữ | Rút gọn: `Mã vật tư`, `Có tồn kho`, `Cần bổ sung`, `Giao dịch tháng` |
| Overview (Empty State) | Nguyên khối block xanh với 3 steps text mô tả rất dài | Quá lan man, người dùng ERP không đọc HDSD kiểu này ở mọi project mới | Bỏ hoàn toàn, thay bằng empty state icon nhỏ: `Chưa có vật tư` |
| Catalog | `Công trình này chưa có vật tư.` | Thừa ngữ cảnh "công trình này" | Rút gọn: `Chưa có vật tư.` |
| Catalog (Header Tồn) | `Tồn tại công trình` | Lặp chữ "công trình" | Rút gọn: `Tồn kho` |
| Stock Table | `Tồn hiện tại` | Không đồng nhất | Sửa thành: `Tồn kho` |
| Stock Table | `Công trình này chưa có tồn kho vật tư.` | Dài dòng | Rút gọn: `Chưa có tồn kho.` |
| Transactions | `Lịch sử giao dịch vật tư của công trình.` | Dài, lặp từ | Rút gọn: `Lịch sử giao dịch vật tư.` |
| Transactions (Tooltip) | `Cần tạo mã vật tư trước khi tạo giao dịch` | Dài dòng | Rút gọn: `Tạo vật tư ở tab Danh mục trước.` |
| Transactions (Empty State) | `Cần tạo mã vật tư ở tab Danh mục trước khi nhập/xuất.` | Dài dòng | Rút gọn: `Tạo vật tư ở tab Danh mục trước.` |
| Form Dialogs (Thêm/Sửa) | Button: `Lưu thay đổi` hoặc `Thêm vật tư` | Cùng một action lưu vào DB | Rút gọn đồng nhất: `Lưu` |
| Form Dialogs (Giao dịch) | Button: `Nhập kho`, `Xuất kho`, `Đang xử lý...` | Text đang dài hơn Form Button chính | Rút gọn: `Lưu`, `Đang lưu...` |
| Transaction Form | `Ngày GD` | Viết tắt hơi khó hiểu | Rút gọn: `Ngày giao dịch` |
| Page (Access Denied) | `Bạn không có quyền xem phân hệ vật tư của công trình này.` | Thừa chữ công trình này | Rút gọn: `Bạn không có quyền xem phân hệ vật tư.` |
| Workspace Toasts | `Tạo vật tư thành công`, `Cập nhật vật tư thành công`, `Không thể lưu vật tư`, v.v... | Dài dòng | Rút gọn: `Đã lưu`, `Đã xóa`, `Đã nhập kho`, `Có lỗi xảy ra`. |

## 4. Các Text Còn Giữ Lại & Lý Do
- **Title chính (`Quản lý vật tư`)**: Giữ nguyên để định hướng module.
- **Subtitle (`Quản lý danh mục, tồn kho và nhập xuất vật tư theo công trình.`)**: Giữ nguyên vì ngắn gọn và mô tả được bức tranh tổng quan của module.
- **Labels trong form (`Tồn tối thiểu tại công trình`, `Ghi chú`)**: Giữ nguyên để đảm bảo data-entry không bị nhầm lẫn.

## 5. Kết Quả Layout & Responsive
- Giao diện thanh thoát và đỡ ngợp hơn rất nhiều.
- Tại tab `Tổng quan`, card metrics trở nên cực kì cân đối, không bị xuống dòng ở màn hình Tablet do text đã ngắn lại.
- Các Empty State được làm nhỏ lại, thu hút ánh nhìn vào button CTA trung tâm thay vì bị đánh lạc hướng bởi các text dài dòng.

## 6. Kết Quả Phân Quyền (RBAC)
- Chặn UI (Access denied) hiển thị câu cảnh báo ngắn gọn và dứt khoát.
- Toàn bộ permission check ở tab, table, và form không bị ảnh hưởng do chỉ thay đổi phần text hiển thị. `canCreate`, `canImport`, `canExport` vận hành hoàn hảo.
- Không lộ bất kỳ role hoặc enum tiếng Anh nào ra ngoài giao diện.

## 7. Kết Quả Build Hệ Thống
- Lệnh: `npx tsc --noEmit && npm run build`
- Trạng thái: **Pass 100%**. Không có cảnh báo hay lỗi về TypeScript. NextJS build xong phần tĩnh trong 5.6 giây.

## 8. Các File Đã Thay Đổi Code
1. `src/components/materials/materials-workspace.tsx`
2. `src/components/materials/materials-overview.tsx`
3. `src/components/materials/materials-catalog.tsx`
4. `src/components/materials/materials-stock-table.tsx`
5. `src/components/materials/materials-transactions.tsx`
6. `src/components/materials/material-form-dialog.tsx`
7. `src/components/materials/transaction-form-dialog.tsx`
8. `src/app/(dashboard)/materials/page.tsx`
