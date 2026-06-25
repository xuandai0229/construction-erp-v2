# Báo Cáo Trim UI & DB Sync Audit Phân Hệ Materials

## 1. Cơ Sở Thiết Kế (SKILL.md)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Áp dụng:** Tối giản giao diện, lược bỏ các cột/nút thừa không cần thiết, chuyển đổi các badge/nhãn trạng thái sang phong cách trung tính để tránh cảm giác báo lỗi sai sự thật, làm mượt layout responsive trên mobile.

## 2. Phân Tích & Tinh Gọn Giao Diện (UI Trim)
### a. Tab Tổng quan
- **Vấn đề:** Card "Tổng tồn kho" cộng dồn tất cả đơn vị (kg, Bao, Cây, m3) thành một con số vô nghĩa.
- **Giải quyết:** Đã sửa tên nhãn thành **"Mã có tồn kho"**. Logic hiện tại đếm số lượng mã vật tư có `stock > 0`. Đơn vị hiển thị đổi từ "đơn vị" sang "mã".

### b. Header & Select
- **Vấn đề:** Nút "Thêm vật tư" dài và rớt dòng trên Mobile, Select công trình bị cắt chữ chưa đẹp.
- **Giải quyết:** 
  - Chuyển layout sang `grid-cols-3` để luôn giữ trên một dòng trên Mobile.
  - Văn bản nút "Thêm vật tư" được thu gọn thành "Thêm VT" trên màn hình nhỏ. Đổi màu nút từ `bg-slate-900` thành `bg-blue-600` chuẩn Primary Action Button.
  - Text mô tả Header được làm rõ ràng: Danh mục vật tư là **"Từ điển dùng chung cho toàn hệ thống"**, nhưng tồn kho và giao dịch giới hạn trong công trình hiện tại.

### c. Tab Danh mục (Từ điển vật tư)
- **Vấn đề:** Nút "Tồn" ở cột thao tác bị thừa vì đã có Tab "Tồn kho" chuyên biệt. Danh mục vật tư bị hiểu lầm là cục bộ cho dự án.
- **Giải quyết:**
  - Lược bỏ hoàn toàn nút "Tồn" khỏi bảng Catalog.
  - Đổi tên Tab và Placeholder từ "Danh mục" sang **"Từ điển vật tư"**, nhấn mạnh tính chất Global Dictionary.

### d. Tab Tồn kho
- **Vấn đề:** "Tồn tối thiểu" chỉ hiện số lượng không có đơn vị, dễ gây nhầm lẫn.
- **Giải quyết:** 
  - Đã bổ sung đơn vị hiển thị bên cạnh giá trị Tồn tối thiểu (vd: `200 kg`, `50 Bao`) ở cả bản Desktop và Mobile.
  - Nút "Xuất" đã được bọc trong Tooltip giải thích "Chưa có tồn kho để xuất" khi `stock <= 0` và `cursor-not-allowed`.

### e. Tab Đề xuất mua
- **Vấn đề:** Nút "Tạo đề xuất mua" có thể click nhưng không làm gì, dễ gây nhầm lẫn đây là lỗi.
- **Giải quyết:** 
  - Gắn Badge cam `"Sắp phát triển"` ngay cạnh tiêu đề.
  - Đổi nút sang dạng `disabled`, màu xám `cursor-not-allowed` và thêm text "Chờ chốt workflow phê duyệt" để xác nhận tính năng đang lên kế hoạch, không phải lỗi.

## 3. Database Sync Audit
- **Script:** `scripts/qa-materials-db-sync-audit.ts`
- **Cách hoạt động:** Script quét qua tất cả dự án, so sánh từng dòng `ProjectMaterialStock` với tổng (Nhập - Xuất + Điều chỉnh) từ `MaterialMovement`.
- **Kết quả Audit:**
  - DB đồng bộ hoàn toàn. **Tổng số Mismatch = 0**. Mọi con số trong bảng tồn kho (Stock) hoàn toàn khớp với lịch sử giao dịch (Movements).
- **Tính năng Repair:** Script hỗ trợ cờ `--repair` để tự động fix mismatch hoặc tạo row bị thiếu (nhưng sẽ yêu cầu truyền `projectId`). Chỉ báo cáo, không tự sửa nếu không có `--repair`.

## 4. An Toàn Dữ Liệu Demo
- **Script:** `scripts/qa-materials-demo-data.ts`
- **Cải tiến:**
  - Bỏ cơ chế tìm bừa "Active Project đầu tiên" và bỏ cờ `--force`.
  - Bắt buộc phải truyền `--projectId=<id>` để seed hoặc cleanup.
  - Mọi mã vật tư Demo đều có prefix `DEMO-` (vd: `DEMO-THEP-D10`, `DEMO-CAT-V`).
  - Hàm Cleanup chỉ xóa các Material và Movement nào liên kết với material có tên bắt đầu bằng `DEMO-`, tuyệt đối an toàn cho data thật.
  - Hỗ trợ cờ `--dry-run` để in ra log thay vì ghi/xóa vào DB.

## 5. Kiểm tra Project Scope & RBAC
- Đã đọc kỹ `src/app/(dashboard)/materials/actions.ts`.
- Mọi hàm như `getProjectStocks`, `getRecentTransactions`, `createMaterialTransaction`, `setProjectMinStock` đều gọi chung middleware `assertProjectAccess`.
- User bình thường không có mặt trong `projectMember` của công trình sẽ bị báo lỗi "Bạn không có quyền thao tác công trình này".
- `MaterialItem` được lưu Global không dính `projectId`, do đó bất cứ ai cũng có thể thêm vào "Từ điển vật tư" chung, nhưng chỉ có quyền tương tác Nhập/Xuất/Tồn theo `projectId` mà họ có thẩm quyền. Hệ thống thiết kế chuẩn xác.

## 6. Lệnh Đã Chạy & Trạng Thái Build
```bash
npx prisma format       -> 🚀 Formatted
npx prisma validate     -> 🚀 Valid
npx prisma generate     -> 🚀 Generated Prisma Client
npx tsc --noEmit        -> ✅ Pass (0 errors)
npm run build           -> ✅ Compiled successfully
```

## 7. Hướng Dẫn Test Thủ Công
1. Truy cập tab **Tổng quan** để thấy Card "Mã có tồn kho" (thay vì Tổng tồn kho vô nghĩa cộng dồn đơn vị). Header đã hiển thị text chú thích rõ "Danh mục vật tư là từ điển dùng chung".
2. Truy cập tab **Từ điển vật tư**, search placeholder đã sửa và không còn nút "Tồn" gây thừa.
3. Chạy Audit DB tồn kho bằng lệnh:
   `npx tsx scripts/qa-materials-db-sync-audit.ts`
4. Chạy nạp Demo data thử nghiệm (tạo mã an toàn bắt đầu bằng DEMO-):
   `npx tsx scripts/qa-materials-demo-data.ts --projectId=<your_project_id_here>`
5. Gỡ bỏ data demo:
   `npx tsx scripts/qa-materials-demo-data.ts --projectId=<your_project_id_here> --cleanup`
