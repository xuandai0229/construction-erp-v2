# Báo Cáo Triển Khai Module "Bảng Báo Cáo Khối Lượng Hiện Trường" (Phase 3C Mới)

## 1. Mục tiêu nghiệp vụ
- Xây dựng lại hoàn toàn module báo cáo hiện trường theo cấu trúc Bảng tính (Excel-like), loại bỏ các form nhập liệu rời rạc gây khó khăn cho người dùng ngoài công trường.
- Hỗ trợ xây dựng cấu trúc phân việc cây (Hạng mục cha - Công việc con) trực tiếp trên một bảng duy nhất (Master Table).
- Cho phép Chỉ huy trưởng nhập khối lượng phát sinh theo từng ngày một cách nhanh chóng.
- Hệ thống phải tự động tính toán "Lũy kế" và "% thực hiện", nghiêm cấm người dùng chỉnh sửa thủ công các chỉ số này để đảm bảo tính toàn vẹn dữ liệu.

## 2. Thiết kế Database và Schema mới
Thay vì tái sử dụng Model cũ (như `SiteReport`, `WBSItem`) vốn đã gắn liền với các logic form rời rạc và có rủi ro về migration, một hệ sinh thái Model hoàn toàn mới và độc lập đã được tạo ra:
- **FieldProgressTemplate**: Bảng mẫu (Master Table) đại diện cho một dự án.
- **FieldProgressItem**: Các dòng trong bảng (Hạng mục cha - `GROUP`, Công việc con - `WORK`, Ghi chú - `NOTE`). Hỗ trợ cấu trúc cây thông qua `parentId`.
- **FieldProgressEntry**: Khối lượng phát sinh thực tế từng ngày cho từng `WORK` item.
- **FieldMaterialRequest** & **FieldMaterialRequestItem**: Quản lý đề xuất vật tư gắn liền với công việc thi công.

## 3. Các file và thư mục đã tạo
### Server Actions & Helpers
- `src/lib/field-progress.ts`: Chứa toàn bộ các hàm tiện ích (`validateQuantity`, `calculateCumulativeQuantity`, `calculateProgressPercent`, `buildTreeItems`, `flattenTreeForTable`, `buildDateColumns`...).
- `src/app/(dashboard)/projects/[id]/field-progress/actions.ts`: Xử lý CRUD cho Master Table.
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`: Xử lý Batch Save & Submit cho việc nhập khối lượng hàng ngày.

### Pages & Components
1. **Master Table (`/projects/[id]/field-progress`)**
   - File: `page.tsx` và `src/components/field-progress/master-table.tsx`
   - Hiển thị danh sách hạng mục dưới dạng cây (Tree Grid) có thể đóng/mở.
   - Edit inline trực tiếp các cột `categoryName`, `workContent`, `constructionCrew`, `designQuantity`, `unit`.
   - Các cột `Lũy kế` và `% Thực hiện` là Readonly (tự tính thông qua Rollup Helper).

2. **Daily Entry (`/projects/[id]/field-progress/daily`)**
   - File: `page.tsx` và `src/components/field-progress/daily-entry-table.tsx`
   - Bảng nhập liệu cho 1 ngày cụ thể (có Date Picker).
   - Ô Input `quantity` siêu to rõ ràng, tự động Disable khi báo cáo đã `SUBMITTED` hoặc `APPROVED`.
   - Có cơ chế tính toán ngay trên client: `Lũy kế sau nhập = Lũy kế trước (từ Server) + KL Hôm nay`. Cảnh báo đỏ nếu vượt 100%.

3. **Summary (`/projects/[id]/field-progress/summary`)**
   - File: `page.tsx`
   - Bảng tổng hợp Pivot 2 chiều.
   - Cột ngày tháng tự động sinh (`buildDateColumns`) theo Filter khoảng thời gian.

## 4. Cách tính Lũy kế & Phần trăm thực hiện
- **Lũy kế**: Dùng hàm `calculateCumulativeQuantity`. Tự động cộng tổng các `FieldProgressEntry` có status là `APPROVED` (Trừ khi user cố tình chọn chế độ xem bao gồm Draft).
- **Phần trăm**: Dùng hàm `calculateProgressPercent`. `(Lũy kế / Tổng thiết kế) * 100`. Nếu tổng thiết kế = 0 hoặc `null`, trả về cảnh báo "Chưa có thiết kế".
- **Xử lý vượt Khối lượng**: Nếu % > 100, text sẽ tự động chuyển màu đỏ cờ `text-red-600` và viền đỏ `border-red-500` để báo động cho Chỉ huy trưởng và Giám sát.

## 5. Audit Log & Bảo mật
- Tất cả các thao tác quan trọng (`CREATE`, `UPDATE_BATCH`, `SOFT_DELETE`, `SUBMIT_ENTRY`) đều được log lại bằng hàm `writeAuditLog`.
- Session Auth được kiểm tra ở đầu mọi Server Action và Page Component.

## 6. Kết quả Build Validation
- `npx prisma validate`: **Passed** 
- `npx tsc --noEmit`: **Passed** (Không có lỗi Type)
- `npm run build`: **Passed**

## 7. Các hạng mục chưa làm (Theo yêu cầu)
- Import từ Excel: Hệ thống đã thiết kế giao diện dạng bảng cực kỳ tương đồng Excel, việc copy-paste từ Excel vào Web có thể triển khai ở Phase tiếp theo.
- Export PDF/Excel: Chưa tích hợp thư viện `xlsx` hoặc `jspdf`.
- Modal/Drawer cho "Đề xuất vật tư": Hiện tại UI Daily Entry Table đã có cột Vật tư kèm số lượng, tuy nhiên hành động mở Drawer quản lý Chi tiết vật tư sẽ cần được xây dựng UI Component ở Phase nối tiếp.

## 8. Đề xuất bước tiếp theo
- Dùng thử (Dog-fooding) bằng cách tạo 1 công trình nháp, nhập khoảng 20 dòng công việc và test các ngày liên tiếp để kiểm chứng tốc độ render bảng và UX/UI trên Mobile.
- Hoàn thiện luồng duyệt (Approve) từ Giám đốc/QA-QC để chốt dữ liệu (chuyển status từ SUBMITTED sang APPROVED).
