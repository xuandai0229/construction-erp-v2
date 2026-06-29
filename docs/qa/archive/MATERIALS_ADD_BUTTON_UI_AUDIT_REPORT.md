# Báo Cáo Tinh Gọn Nút "Thêm Vật Tư" (UI/UX Audit)

## 1. Cơ sở Thiết Kế (Design Guidelines)
- Đã đọc và tuân thủ theo `SKILL.md` của `design-taste-frontend`.
- Áp dụng nguyên tắc "Giảm nhiễu thị giác": Mỗi viewport và empty state chỉ nên có tối đa 1 Call-to-Action (CTA) ưu tiên, loại bỏ toàn bộ sự lặp lại của text và button.

## 2. Kết Quả Quét UI Trước Khi Sửa
Tổng cộng tìm thấy **4 vị trí** có nút thêm vật tư gây trùng lặp và rối loạn:
1. **Nút "Thêm vật tư" trên Header chung (`materials-workspace.tsx`)**: Luôn hiện ở mọi tab nếu có quyền.
2. **Nút "Thêm vật tư" trong empty state của tab Tổng quan (`materials-overview.tsx`)**: Hiện khi không có vật tư nào.
3. **Nút "Tạo mã vật tư mới" trên Header của Danh mục (`materials-catalog.tsx`)**: Hiện ở danh mục vật tư.
4. **Text "Tạo vật tư" bên trong Modal (`material-form-dialog.tsx`)**.

### Quyết định Giữ/Bỏ:
- **Bỏ**: Nút "Thêm vật tư" trên Header chung (`materials-workspace.tsx`). Vì nó lặp lại với các nút bên trong tab Danh mục và Tổng quan.
- **Sửa**: Nút "Thêm vật tư" trong empty state Tổng quan đổi thành "Mở danh mục vật tư" để chuyển hướng tab thay vì mở form ngay tại đó.
- **Sửa**: Nút "Tạo mã vật tư mới" đổi thành "Thêm vật tư", và chỉ hiển thị khi **đã có** dữ liệu.
- **Thêm mới (Empty State Danh mục)**: Bổ sung nút "Thêm vật tư đầu tiên" vào empty state của tab Danh mục.
- **Sửa**: Đổi text trong Form Dialog từ "Tạo vật tư" thành "Thêm vật tư" để đồng nhất toàn bộ UI.

## 3. Quy Tắc CTA Sau Khi Sửa Theo Từng Tab

### A. Header Tổng (Materials Workspace)
- Không còn nút Thêm vật tư. Chỉ giữ lại 2 nút nghiệp vụ `Nhập kho` / `Xuất kho` vì chúng phục vụ workflow nhanh cho kỹ sư ở công trường.

### B. Tab Danh mục vật tư (`materials-catalog.tsx`)
- **Khi đã có dữ liệu**: Chỉ có đúng 1 nút `Thêm vật tư` góc trên bên phải.
- **Khi rỗng (Empty State)**: Chỉ có đúng 1 nút `Thêm vật tư đầu tiên` ở giữa màn hình. Nút ở góc trên bị ẩn đi.

### C. Tab Tổng quan (`materials-overview.tsx`)
- Khi công trình chưa có dữ liệu, hiển thị nút `Mở danh mục vật tư` để điều hướng user sang tab làm việc chính. Không gọi trực tiếp Dialog ở đây.

### D. Tab Tồn kho (`materials-stock-table.tsx`)
- **Tuyệt đối không có nút Thêm vật tư**.
- Empty state báo lỗi rỗng: `Công trình này chưa có tồn kho vật tư.`

### E. Tab Lịch sử Nhập/Xuất (`materials-transactions.tsx`)
- **Tuyệt đối không có nút Thêm vật tư**.
- Empty state được tối ưu: `Chưa có giao dịch vật tư.` Nếu công trình hoàn toàn rỗng, báo thêm: `Cần tạo mã vật tư ở tab Danh mục trước khi nhập/xuất.`

*(Lưu ý: Phân hệ Materials hiện tại không có tab "Đề xuất mua" theo luồng code gốc, nên không cần xử lý tab này).*

## 4. Kết Quả Test Phân Quyền (RBAC) & Logic
- **Bảo toàn Logic**: Form Xóa (không popup, xóa thẳng) và Sửa (sửa toàn bộ) hoạt động bình thường, không thay đổi backend.
- **User có quyền `canCreate` (Quản lý dự án / Admin)**: Thấy đúng 1 nút thêm vật tư theo logic đã sắp xếp ở mục 3.
- **User KHÔNG có quyền `canCreate` (Chỉ xem / QAQC / Giám sát)**: Không thấy bất kỳ nút "Thêm vật tư" hay "Tạo mã" nào ở TẤT CẢ các viewport và empty state. Cột thao tác cũng biến mất trọn vẹn.

## 5. Mobile & Responsive UX
- Ở màn hình nhỏ (Mobile), danh sách vật tư dạng list/card hiển thị button thêm vật tư ở trạng thái trống được căn giữa gọn gàng. Layout không bị tràn ngang và button không bị nhảy dòng.

## 6. Trạng Thái Hệ Thống & Build
- Các file đã can thiệp:
  - `src/components/materials/materials-workspace.tsx`
  - `src/components/materials/materials-overview.tsx`
  - `src/components/materials/materials-catalog.tsx`
  - `src/components/materials/materials-transactions.tsx`
  - `src/components/materials/material-form-dialog.tsx`
- Kết quả kiểm định Code:
  - `npx tsc --noEmit`: Không có lỗi types (Exit Code 0).
  - `npm run build`: Hoàn thành xuất sắc trong 4.4 giây. 
  - `git diff`: Không có dư thừa, code tối giản hoàn toàn.
