# Báo Cáo Dọn Dẹp Action Button Tại Header Tổng (Materials UI Cleanup)

## 1. Cơ Sở Thiết Kế
- Đã đọc và áp dụng triệt để file: `.agents/skills/design-taste-frontend/SKILL.md` (Design-taste-frontend).
- Nguyên tắc cốt lõi: Không đặt các thao tác nghiệp vụ cụ thể (như thêm mới, nhập, xuất) ở mức header global. Các thao tác này phải gắn liền với từng context / ngữ cảnh tương ứng.

## 2. Phân Tích Header Trước Khi Sửa
Trước khi dọn dẹp, header chung (`materials-workspace.tsx`) chứa:
- Nút `Nhập kho` (phụ thuộc quyền `canImport`).
- Nút `Xuất kho` (phụ thuộc quyền `canExport`).
*(Trong phase trước đã loại bỏ nút `Thêm vật tư`).*

Điều này gây bất hợp lý vì user có thể nhấn `Nhập kho` ngay khi đang ở tab Tổng quan hoặc tab Danh mục mà chưa chọn vật tư cụ thể, gây rối workflow.

## 3. Quyết Định Giữ / Bỏ Tại Header
- **Bỏ hoàn toàn**: Nút `Nhập kho` và `Xuất kho` khỏi global header.
- **Header sau khi sửa chỉ còn lại**:
  - Tiêu đề "Quản lý vật tư".
  - Subtitle mô tả chức năng.
  - Bộ phận chọn công trình (Project Selector).

## 4. Bố Trí Lại Các Thao Tác (Đưa Về Đúng Ngữ Cảnh)
Việc tạo/nhập/xuất/sửa được điều phối lại chặt chẽ theo các tab:

### A. Tab Tổng Quan
- Không có bất kỳ nút nghiệp vụ (Tạo / Nhập / Xuất) nào.
- Nếu không có dữ liệu, chỉ có duy nhất một nút link nhẹ `Mở danh mục vật tư` để định hướng quy trình cho người dùng.

### B. Tab Danh Mục Vật Tư
- Là nơi **duy nhất** để khởi tạo vật tư: Nút `Thêm vật tư` hoặc `Thêm vật tư đầu tiên` xuất hiện theo logic số lượng items (Chỉ hiện khi user có quyền `canCreate`).
- Cột thao tác của từng dòng vật tư chứa các nút `Nhập` / `Xuất` trực tiếp.

### C. Tab Tồn Kho
- Không có nút thêm vật tư.
- Không có nút Nhập/Xuất global. 
- Giữ các nút `Nhập`/`Xuất` nhỏ ở từng dòng của bảng tồn kho để thực hiện giao dịch cho chính vật tư đó.

### D. Tab Lịch Sử Nhập / Xuất
- Là nơi duy nhất giữ CTA tạo giao dịch global: Nút `Tạo giao dịch`.
- Nếu công trình chưa có mã vật tư nào, nút này bị disabled và empty state sẽ thông báo rõ: *"Cần tạo mã vật tư ở tab Danh mục trước khi nhập/xuất"*.
- *Lưu ý kỹ thuật:* Nút `Tạo giao dịch` sẽ tự động mở form `IMPORT` nếu user có quyền, hoặc fallback mở `EXPORT` nếu user chỉ có quyền xuất.

## 5. Kết Quả Kiểm Tra Phân Quyền (RBAC) UI
- **Admin / Quản lý dự án**: Header sạch sẽ. Thấy đầy đủ các nút Thêm/Sửa/Xóa/Nhập/Xuất ở từng tab. Tab Nhập/Xuất hiển thị CTA tạo giao dịch.
- **Viewer / Chỉ xem**: Header sạch sẽ. Các bảng danh mục và tồn kho bị ẩn hoàn toàn cột thao tác. Không thấy bất kỳ nút bấm nào.
- **User không có `canImport`**: Không thấy các nút `Nhập` ở cột thao tác. Form giao dịch chặn mở tab Nhập.
- **User không có `canExport`**: Không thấy các nút `Xuất` ở cột thao tác.
- **User không có `canCreate`**: Không thấy nút `Thêm vật tư` hay `Thêm vật tư đầu tiên` trong mọi hoàn cảnh.

## 6. Kết Quả Kiểm Tra State và Form
- Dù loại bỏ nút khỏi header, nhưng state `isMaterialFormOpen` và `transactionFormType` trong `materials-workspace.tsx` vẫn được giữ nguyên để điều phối các tab con.
- Modal `MaterialFormDialog` và `TransactionFormDialog` tiếp tục mở đúng từ các nút bấm ở tab Danh mục, tab Tồn kho và tab Nhập/Xuất. Không xảy ra hiện tượng chết state hay prop dư thừa.

## 7. Kết Quả Build & Regression
- Lệnh: `npx tsc --noEmit && npm run build`
- Lỗi Typescript: **0** (Pass 100%).
- Thời gian Build Next.js: **Hoàn thành xuất sắc trong 4.9 giây**.

## 8. Các File Đã Sửa
- `src/components/materials/materials-workspace.tsx`
- `src/components/materials/materials-transactions.tsx`
