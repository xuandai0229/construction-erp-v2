# REPORTS R1.3 DECLUTTER IMPLEMENTATION REPORT

## A. Executive Summary
- **R1.3 implementation**: **PASS**
- **Đã lược bỏ/tinh gọn gì**:
  - Gộp các Action Cards thành 3 card chính (Chờ duyệt, Bị từ chối, Có phát sinh) và làm mờ khi có số lượng bằng 0.
  - Ẩn text dài ở header, loại bỏ phần summary statistics gây chiếm diện tích.
  - Rút gọn tabs, chỉ giữ "Tất cả", "Báo cáo ngày", "Báo cáo tuần".
  - Gom toàn bộ Filter vào một nút Bộ lọc duy nhất trên Toolbar.
  - Loại bỏ các cột không cần thiết trong Table (thời tiết / mục) và ẩn cột dự án khi đang filter một dự án.
  - Ẩn các section rỗng trong Drawer Detail và mặc định thu gọn lịch sử duyệt.
- **Desktop có gọn hơn không**: CÓ, diện tích cho Table được trả lại đáng kể.
- **Mobile có gọn hơn không**: CÓ, Tabs không bị overflow, Filter được đóng gói gọn trong nút mở rộng, Card item trên mobile hiển thị đầy đủ nhưng gọn gàng hơn.
- **Có tạo migration/sửa DB không**: KHÔNG.
- **Production GO/NO-GO**: NO-GO (Chưa làm R2, R3b, R4, R5).

## B. Changes implemented
1. **Action Center**:
   - Sử dụng layout `grid-cols-3` thay vì thẻ to tốn diện tích, hoạt động đồng bộ cho desktop và mobile.
   - Thêm trạng thái `opacity-60` và bỏ màu nền cho các card có giá trị bằng 0.
   - Sử dụng gam màu vàng cam nhẹ nhàng cho "Có phát sinh".
2. **Summary**: Đã xoá component `ReportsStats` khỏi UI.
3. **Tabs**: 
   - Rút gọn chỉ còn "Tất cả", "Báo cáo ngày", "Báo cáo tuần".
   - Tương thích ngược: Khi URL chứa tab `pending`, `rejected`, `issues` => UI mặc định select "Tất cả" nhưng DB filter và Action Center vẫn highlight đúng card.
4. **Filter**: 
   - Đưa Types, Projects, DateRange, Status vào một Collapsible Panel trong `ReportsToolbar`.
   - Hiển thị badge số lượng filter đang áp dụng trên nút "Bộ lọc".
5. **Table**:
   - Đưa thuộc tính `showProjectColumn` vào để tuỳ biến ẩn cột công trình nếu đang filter dự án.
   - Bỏ cột thời tiết (đã chuyển vào chi tiết / badge).
   - Thiết kế lại các UI Badge cho "Vấn đề nghiêm trọng" (đỏ) và "Có phát sinh" (vàng).
   - Tối ưu header nhóm tuần: Rút gọn text đếm trạng thái.
6. **Drawer**:
   - Chỉ render `Photo gallery` và `Attachments` khi mảng có phần tử.
   - Thêm `useState` để mặc định thu gọn Lịch sử duyệt (`ApprovalTimeline`).
7. **Mobile**: 
   - Thẻ báo cáo mobile rút gọn thông tin, không hiển thị label dư thừa.
   - Tối ưu kích cỡ font và padding để phù hợp màn hình nhỏ.

## C. Before/After UX

| Khu vực | Trước | Sau |
| ------- | ----- | --- |
| **Action Center** | Rời rạc, các thẻ card dài và tốn chỗ | Gom thành `grid-cols-3` nhỏ gọn, làm mờ nếu số lượng = 0 |
| **Tabs** | Dài dằng dặc, gây overlap với Action Center | Còn đúng 3 Tabs cơ bản |
| **Filter** | Dàn ngang chiếm toàn bộ Toolbar | Gom gọn vào một nút bật/tắt (Collapsible Panel) |
| **Bảng / Mobile Cards** | Bảng nhiều cột, chật chội. Card trên mobile rối. | Lược bớt cột Thời tiết/Mục, tinh gọn Mobile Cards, thêm tuỳ biến ẩn cột Dự án. |
| **Chi tiết (Drawer)** | Hiển thị quá nhiều section rỗng ("Không có") | Chỉ hiển thị các section khi có dữ liệu thật. Lịch sử duyệt thu gọn. |

## D. Test results
- **Script**: PASS (Total reports vẫn 16, Daily 14, Weekly 2).
- **Browser**: PASS (UI render đẹp, Drawer gọn, Filter popup hoạt động, tabs redirect đúng).
- **Build/test**: PASS (Eslint pass, Prisma build pass, Build success).

## E. Risks remaining
- R2 weekly source linkage chưa làm.
- R3b edit/delete/withdraw/cancel chưa làm.
- R4 project-level RBAC chưa làm.
- R5 cleanup storage chưa làm.
- FieldProgress auto APPROVED chưa xử lý trong test R3a.
- Chưa có severity field riêng (issue đang parse dựa vào text pattern).

## F. Go/No-Go
- **R1.3 UAT**: GO.
- **Có được sang R2 không**: CÓ. Đã chuẩn bị đầy đủ mặt bằng UX cho việc gom báo cáo ngày thành báo cáo tuần.
- **Production**: NO-GO.

## G. Xác nhận
- KHÔNG commit.
- KHÔNG push.
- KHÔNG reset DB.
- KHÔNG xóa dữ liệu.
- KHÔNG cleanup storage.
- KHÔNG tạo migration.
