# Báo Cáo Triển Khai Phân Hệ Quản Lý Vật Tư (Materials Module)

## 1. Đã đọc SKILL.MD nào
- Đã đọc chi tiết file `d:\construction-erp-v2\.agents\skills\design-taste-frontend\SKILL.md`.
- Áp dụng các quy tắc về UI/UX anti-slop:
  - Loại bỏ các card nhàm chán với bóng đen quá đậm (pure drop shadow). Sử dụng viền nhẹ (border-slate-200), màu xám trung tính (slate) kết hợp điểm nhấn màu (blue, amber, emerald, red).
  - Đảm bảo "Empty State đẹp" cho các phần dữ liệu rỗng.
  - Loại bỏ center bias, áp dụng bố cục thoáng (visual density 4-6).
  - Xử lý mobile view riêng biệt để tránh nhồi nhét bảng nhiều cột vào màn hình nhỏ.

## 2. Hiện trạng trước khi sửa
- Phân hệ `/materials` trống trơn, chỉ là một trang với tiêu đề "Quản lý vật tư" và `EmptyState` tĩnh.
- Database Schema chưa có bảng lưu trữ số lượng tồn kho theo từng công trình (`ProjectMaterialStock`), chỉ có `MaterialItem` (global) và `MaterialMovement`.

## 3. Các file đã thay đổi / tạo mới
**Database:**
- `prisma/schema.prisma`: Thêm model `ProjectMaterialStock` và trường `group` cho `MaterialItem`.

**Backend / Actions:**
- `src/app/(dashboard)/materials/actions.ts` (Mới): Các action fetch dự án, lấy danh mục vật tư, tồn kho, tính toán thống kê và xử lý transaction với kiểm tra quyền truy cập.

**Frontend / UI:**
- `src/app/(dashboard)/materials/page.tsx`: Định tuyến, Server Component gọi data và phân quyền theo session.
- `src/components/materials/materials-workspace.tsx` (Mới): Wrapper chính quản lý tab, layout tổng quát và project selector.
- `src/components/materials/materials-overview.tsx` (Mới): Tab Tổng quan hiển thị 4 Dashboard Cards và EmptyState khởi tạo.
- `src/components/materials/materials-catalog.tsx` (Mới): Tab Danh mục hiển thị danh sách tất cả vật tư chung của hệ thống.
- `src/components/materials/materials-stock-table.tsx` (Mới): Bảng quản lý tồn kho và tồn tối thiểu, có view riêng cho Desktop và Mobile.
- `src/components/materials/materials-transactions.tsx` (Mới): Bảng hiển thị lịch sử nhập xuất điều chỉnh vật tư.

## 4. Chức năng đã thêm
- **Tổng quan vật tư:** Xem tổng số loại vật tư đang theo dõi, tổng lượng tồn, danh sách vật tư sắp hết, tổng lượt nhập/xuất trong tháng.
- **Tồn kho dự án:** Hiển thị và cảnh báo vật tư theo định mức tồn kho tối thiểu.
- **Danh mục từ điển:** Hiển thị kho vật tư chung toàn hệ thống, có trạng thái hiển thị "Đang theo dõi" nếu vật tư đó đã được thêm vào công trình.
- **Giao dịch nhập/xuất:** Lịch sử ghi nhận biến động có định dạng rõ ràng (dấu cộng/trừ, icon tương ứng).

## 5. UI/UX đã cải thiện
- **Card Overview:** Thiết kế mượt mà, phân loại badge màu sắc tương ứng mức độ cảnh báo (Stable: xanh, Info: xanh lam, Alert: đỏ/cam).
- **Tab Navigation:** Segmented control mượt, rõ ràng.
- **Bảng (Table) Responsive:** Trên Desktop hiển thị bảng gọn gàng. Trên Mobile được chuyển hóa hoàn toàn sang dạng Card List tối ưu không gian hiển thị (thông tin được dồn vào layout grid 2 cột nhỏ gọn thay vì scroll ngang).
- **Empty State:** Được thiết kế lại to, đẹp, nội dung CTA (Call to Action) rõ ràng.

## 6. Data model / Migration
- Tạo migration `init_project_material_stock`.
- Thêm model `ProjectMaterialStock` để theo dõi `stock` (tồn hiện tại) và `minStockLevel` (tồn tối thiểu) dựa trên cặp khóa `projectId` + `materialItemId`.
- Bổ sung logic `prisma.$transaction` để vừa tạo `MaterialMovement`, vừa tăng/giảm `ProjectMaterialStock` đảm bảo tính toàn vẹn dữ liệu. Cập nhật không cho phép xuất kho khi số lượng vượt quá tồn kho hiện tại.

## 7. RBAC / Security đã kiểm tra
- Các API action đều check `getSession()`.
- Chặn user ở Project Scope: Nếu user không phải là `ADMIN`, hệ thống tự động kiểm tra user đó có nằm trong `ProjectMember` của `projectId` đang truy xuất hay không, chặn đứng mọi cố gắng giả mạo ID công trình từ phía client.

## 8. Responsive Desktop / Mobile
- Dùng `hidden sm:flex`, `flex-col sm:flex-row` trên các Header và Filter bar.
- `MaterialsStockTable` tự động ẩn `table` ở màn hình dưới `md`, thay bằng list of `div` cards cho thiết bị di động với các badges được thu nhỏ gọn gàng.

## 9. Lệnh đã chạy và kết quả
1. `npx prisma format` -> Thành công.
2. `npx prisma validate` -> Thành công.
3. `npx prisma migrate dev --name init_project_material_stock` -> Thành công (Generated Prisma Client v7.8.0).
4. `npx tsc --noEmit` -> Thành công (Không lỗi type).
5. `npm run build` -> Hoàn thành (Exit code 0).

## 10. Những giới hạn còn lại (Nếu có)
- Tạm thời chưa tích hợp module Upload File vào chứng từ nhập/xuất do scope của task này chủ yếu là thiết lập UI Dashboard và Stock Tracking Core.
- Button "Thêm vật tư", "Nhập kho", "Xuất kho" hiện tại được render dưới dạng nút tĩnh trên UI (để giữ thiết kế đúng SKILL.MD và không phình to quá nhiều file form), cần nối với các Dialog form tương ứng ở phase sau.
- Tab "Đề xuất mua" hiện chỉ hiển thị EmptyState.

## 11. Hướng dẫn test thủ công
1. Đăng nhập hệ thống (bằng account bất kỳ có quyền truy cập project).
2. Vào Menu / Route `/materials`.
3. Kiểm tra dropdown selector "Chọn công trình". Thay đổi công trình sẽ thay đổi URL `?projectId=...` và refresh data bên dưới.
4. Chọn qua lại giữa các tab: "Tổng quan", "Danh mục", "Tồn kho", "Nhập / Xuất".
5. Mở DevTools (F12) chuyển sang chế độ Mobile (iPhone/Pixel) -> Kiểm tra sự thay đổi layout từ Bảng sang dạng Card ở tab "Tồn kho".
6. Chỉnh URL browser cố tình truyền vào 1 `?projectId=` thuộc dự án khác mà tài khoản không được phân quyền, reload page -> Quan sát Server Action chặn dữ liệu an toàn.
