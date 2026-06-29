# Báo Cáo Thiết Kế Lại Dashboard (Full) — "Bàn Điều Hành CT2" & "Bàn Điều Hành Công Trình"

## 1. Tư Duy Sản Phẩm Mới & Audit Code Hiện Tại
**Tình trạng cũ:** 
- Màn hình `/dashboard` gom toàn bộ dữ liệu hệ thống vào một giao diện chung "Tổng quan vận hành", gây rối và quá tải thông tin khi có nhiều công trình.
- Màn hình `/projects/[id]` chỉ hiển thị 4 block thông tin tĩnh, không cung cấp giá trị điều hành cho Giám đốc/Chỉ huy trưởng.

**Tư duy mới:** 
Chia thành 2 tầng điều hành riêng biệt:
1. **Cấp công ty (`/dashboard`)**: Chỉ hiển thị top các công trình cần chú ý, sắp xếp theo độ ưu tiên cảnh báo/cập nhật. Nút "Mở điều hành" trỏ trực tiếp vào Project Dashboard.
2. **Cấp công trình (`/projects/[id]`)**: Được nâng cấp thành "Bàn điều hành công trình", tập trung vào tiến độ, khối lượng, hạng mục cần chú ý, cảnh báo và hoạt động hiện trường của **riêng công trình đó**.

**Kết quả Audit:**
- Đã audit các file: `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, `prisma/schema.prisma`.
- Logic RBAC hiện tại đang hoạt động tốt qua `requireAuth`, `requireProjectAccessOrRedirect`.
- Các query Prisma (như `fieldProgressEntry.count`, `fieldProgressItem.aggregate`) có thể tận dụng an toàn để tính tiến độ thực mà không cần fake số liệu.

## 2. Các Thay Đổi Cốt Lõi

### Tầng 1: Bàn điều hành CT2 (`/dashboard`)
- **App Shell & Hero**: Đã xóa chữ "Dev", giữ Header sạch sẽ "Quản trị viên - QUẢN TRỊ HỆ THỐNG". Hero gradient navy sang trọng với 2 nút "Xem công trình" và "Nhập khối lượng".
- **4 KPI Cấp Công Ty**: 
  - Đang thi công (Tổng số CT ACTIVE)
  - Cần chú ý (Tổng số cảnh báo)
  - Cập nhật hôm nay (Tổng số bản ghi trong ngày)
  - Tiến độ bình quân (% hoàn thành).
- **Công Trình Cần Theo Dõi (Executive Project Cards)**:
  - Bổ sung **Filter Chips**: Tất cả, Đang thi công, Cần chú ý, Có cập nhật hôm nay.
  - Bổ sung **Circular Progress Bar** cho từng Project Card.
  - Sắp xếp thông minh: Đưa các dự án có cảnh báo và có cập nhật trong ngày lên đầu. Giới hạn hiển thị 6 dự án.
- **Việc cần xử lý hôm nay**: Gom chung các cảnh báo Thiếu WBS, Thiếu nhập khối lượng vào một sidebar gọn gàng.

### Tầng 2: Bàn điều hành công trình (`/projects/[id]`)
*Đã thiết kế lại hoàn toàn màn hình chi tiết công trình.*
- **Project Hero**: Tên công trình nổi bật, badge trạng thái, chủ đầu tư, ngày cập nhật. Nút thao tác nhanh trên góc phải.
- **4 KPI Cấp Công Trình**:
  - Tiến độ công trình (Circular Progress Bar)
  - Khối lượng hôm nay (Số bản ghi)
  - Khối lượng lũy kế (Số bản ghi đã duyệt)
  - Cần xử lý ngay (Số cảnh báo)
- **Quick Actions Strip**: 2 nút lớn truy cập nhanh "Bảng khối lượng gốc" và "Nhập khối lượng ngày".
- **Hạng mục cần chú ý**: Danh sách chi tiết các `WBSItem` (`FieldProgressItem`), tiến độ và khối lượng kế hoạch.
- **Sidebar phải (Cảnh báo & Hoạt động)**:
  - Cảnh báo riêng của công trình (Thiếu WBS, thiếu khối lượng).
  - Hoạt động hiện trường gần đây (4 bản ghi `FieldProgressEntry` mới nhất, kèm khối lượng và người thực hiện).

## 3. Quy Tắc Dữ Liệu & Xử Lý Nhiều Công Trình
- **Tuyệt đối KHÔNG fake dữ liệu**: 100% dữ liệu hiển thị (từ cảnh báo, tiến độ %, số lượng bản ghi) đều được fetch trực tiếp qua Prisma.
- **Xử lý đơn vị đo lường**: Do các hạng mục có thể có đơn vị khác nhau (m³, tấn, md), hệ thống chỉ đếm **số bản ghi (entries)** ở mức KPI tổng thay vì cộng dồn số lượng để tránh sai lệch logic.
- **Xử lý giao diện quá tải**: 
  - Dashboard công ty giới hạn 6 công trình (có link "Xem tất cả").
  - Dashboard công trình giới hạn 5 hạng mục và 4 hoạt động gần đây.
- **Fallback an toàn**: Nếu chưa đủ dữ liệu tiến độ, hệ thống hiển thị "N/A" hoặc "Chưa có dữ liệu" tinh tế.

## 4. Kết Quả Kiểm Tra (UAT & Build)
- `npx tsc --noEmit` — **PASS**
- `npm run build` — **PASS** (Tất cả routes đều được build thành công).
- **Responsive Screenshots**: Đã chạy kịch bản Playwright và tự động chụp lại các giao diện 1920x1080, 1366x768, 390x844. UI hiển thị gọn gàng, sạch sẽ, không có khoảng trắng chết và không xuất hiện scroll ngang.
  - Hình ảnh: `docs/qa/screenshots/dashboard-operations-board-desktop.png`
  - Hình ảnh: `docs/qa/screenshots/dashboard-project-board-desktop.png`

## 5. Kết Luận
Dashboard đã được thiết kế lại hoàn toàn theo góc nhìn Giám đốc: ưu tiên công trình cần theo dõi, có luồng mở điều hành từng công trình cụ thể, không đổ dữ liệu lan man, không fake số liệu và sẵn sàng UAT. Hướng tiếp cận này mang lại trải nghiệm Premium Enterprise SaaS đích thực cho hệ thống ERP CT2 Hà Nội.
