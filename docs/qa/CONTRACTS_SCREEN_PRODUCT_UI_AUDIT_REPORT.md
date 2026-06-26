# Báo cáo Phân tích và Nâng cấp Màn hình Quản lý Hợp đồng (Contracts)

## 1. Mục tiêu và Phạm vi
Mục tiêu là phân tích nghiệp vụ quản lý hợp đồng thực tế trong công trình xây dựng, đối chiếu với schema hiện tại của dự án, và thực hiện nâng cấp màn hình `Contracts` lên mức MVP chuyên nghiệp, dễ sử dụng, bảo mật theo RBAC và đồng bộ UI với module Materials/Suppliers.

**Skill áp dụng**: Đã đọc và áp dụng triệt để `design-taste-frontend` (`SKILL.md`) để có UI gọn gàng, có điểm nhấn, không bị lạm dụng empty state lớn, card summary đẹp.

## 2. Hiện trạng trước khi nâng cấp
- **UI**: Rất sơ khai, có Header, Subtitle và một `EmptyState` lớn chiếm trọn màn hình.
- **Tính năng**: Chưa có dashboard, table list, search, detail view hay drawer.
- **RBAC**: Chưa có phân quyền (ai cũng có thể xem và chưa có thao tác).
- **Backend/Actions**: Hoàn toàn chưa có.

## 3. Phân tích nghiệp vụ thực tế vs. Schema hiện có
### Nghiệp vụ thực tế:
- **Hợp đồng chủ đầu tư**: Quản lý giá trị, tiến độ tổng.
- **Hợp đồng thầu phụ/nhà cung cấp/nhân công**: Liên kết công trình, liên kết đối tác (Supplier).
- Yêu cầu theo dõi được trạng thái, tiến độ thực hiện, giá trị hợp đồng, và phân quyền xem/thêm/sửa hợp đồng cho đúng những người có thẩm quyền.

### Schema hiện có (`Contract` model):
Schema thực sự đã có đủ các field phục vụ MVP chuyên nghiệp:
- `id`, `projectId` (bắt buộc, tức là Contract được scope theo dự án).
- `supplierId` (đối tác liên kết).
- `contractNo`, `name`, `type`, `status`, `value`.
- `signDate`, `startDate`, `endDate`.
- `deletedAt`, `createdAt`, `updatedAt`.
- Liên kết với `PaymentPlan` (Thanh toán).

**Kết luận**: Schema đủ mạnh để làm luôn CRUD cho Contracts MVP. Không cần migration gì.

## 4. RBAC Matrix & Logic Server
Hợp đồng là project-scoped. Do vậy, quyền phụ thuộc vào:
- `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`: Toàn quyền trên mọi công trình (Global scope).
- `MANAGER`, `ACCOUNTANT`: Được xem/thêm/sửa hợp đồng toàn cục nhưng không được xóa.
- Các role quản lý công trình (`PROJECT_MANAGER`, `SITE_COMMANDER`, v.v...): Có quyền thêm/sửa/xóa nhưng **chỉ giới hạn ở công trình họ phụ trách**.
- **UI Logic**: Màn `contracts` là một global page. Hệ thống tự động filter hợp đồng từ các công trình mà user được phép access, đồng thời tự động tính toán quyền (canUpdate, canDelete) trên từng row (bản ghi) hợp đồng.

## 5. Các hạng mục đã thực hiện (Phase 5 & 6)
- **Tạo `contracts-permissions.ts`**: Helper phân quyền cho hợp đồng, dùng chung server & client.
- **Viết server actions (`actions.ts`)**: 
  - `getContractsData()` (fetch cả list contracts, list projects được truy cập, suppliers, permissions).
  - `createContract()`, `updateContract()`, `deleteContract()` (Có bắt duplicate contractNo).
- **Phát triển UI (Đồng bộ với Suppliers/Materials)**:
  - `contracts-workspace.tsx`: Có Summary Cards chuyên nghiệp, hệ thống Search & Filter by Project, Type, Status.
  - Desktop table (gọn gàng, số liệu format đẹp) & Mobile Cards (responsive).
  - `contract-detail-drawer.tsx`: Drawer xem chi tiết đầy đủ field.
  - `contract-form-dialog.tsx`: Form tạo/sửa hợp đồng có dropdown chọn Project, Supplier (khóa chọn supplier nếu type là CLIENT hoặc LABOR).
- **Dữ liệu & Test**:
  - `scripts/seed-contracts-market-sample.ts`: Seed dữ liệu mẫu thực tế về 5 loại hợp đồng điển hình (HĐ Chính, Xây thô, Cơ điện, Cung cấp bê tông, Khoán nhân công).
  - `scripts/qa-contracts-crud-rbac.ts`: Test script kiểm tra CRUD, soft delete.

## 6. Kết quả Build & Test
- **TypeScript & Build**: Chạy `npx tsc --noEmit` & `npm run build` thành công, không có lỗi.
- **QA Script**: Chạy pass toàn bộ kịch bản, chứng minh server actions và RBAC check an toàn.
- **Seed Script**: Tạo thành công 5 hợp đồng thực tế cho môi trường phát triển.

## 7. Rủi ro còn lại & Bước tiếp theo
- Rủi ro chưa hiển thị cảnh báo hợp đồng sắp hết hạn trên dashboard chính của dự án (mới chỉ có ở Summary Card màn Hợp đồng).
- **Bước tiếp theo**: Khi Backend có module Quản lý thanh toán chi tiết (`PaymentPlan` & `PaymentRecord`), cần tích hợp thêm "Giá trị đã thanh toán", "Giá trị còn lại" vào `contract-detail-drawer.tsx`.

## Kết luận
Màn Contracts MVP đã được triển khai hoàn chỉnh với chất lượng code và UI/UX tương đương các màn đã chốt (Suppliers, Materials). Đã sẵn sàng cho thử nghiệm thực tế. Không tồn tại Blocker nào cho nghiệp vụ hợp đồng ở cấp độ MVP.
