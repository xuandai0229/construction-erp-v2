# Audit Report: Dashboard Executive Redesign

## 1. Files Kiểm Tra

| File | Vai trò |
|------|---------|
| `src/app/(dashboard)/dashboard/page.tsx` (474 dòng) | Dashboard hiện tại — "Tổng quan vận hành" |
| `src/app/(dashboard)/projects/[id]/page.tsx` (194 dòng) | Chi tiết dự án — có link 4 phân hệ |
| `src/components/dashboard/DashboardHero3D.tsx` (41 dòng) | SVG 3D nhẹ dùng trong Hero |
| `src/lib/rbac.ts` (188 dòng) | RBAC — `requireAuth`, `getAccessibleProjectIds` |
| `src/lib/auth.ts` | Session management |

## 2. Vấn Đề Dashboard Hiện Tại

### 2.1 Thiếu tư duy sản phẩm
- Dashboard đang là trang **tổng hợp dữ liệu**, không phải trang **điều hành**.
- Sếp mở lên không biết ngay **công trình nào cần mở trước**.
- KPI gom chung nhiều công trình, không nhìn ra vấn đề cụ thể từng công trình.

### 2.2 Sẽ rối khi nhiều công trình
- "Bảng điều hành hôm nay" (Board 3 cột) gom cảnh báo + hoạt động từ **tất cả** công trình vào cùng một list.
- Nếu có 20 công trình, cảnh báo sẽ lẫn lộn, không biết công trình nào đang tệ nhất.
- Hoạt động hiện trường cũng lộn xộn vì trộn nhiều nguồn.

### 2.3 Quick Actions trỏ vào `firstActiveProject`
- 3 nút Quick Actions dẫn vào field-progress của **công trình ACTIVE đầu tiên**.
- Nếu có nhiều công trình, user không kiểm soát được nút sẽ đi đâu.
- Đây là thiết kế hợp lý khi chỉ có 1 công trình, nhưng phá vỡ khi scale.

### 2.4 Thiếu layer "Dashboard từng công trình"
- Không có route `/projects/[id]/dashboard`.
- Trang `/projects/[id]` hiện chỉ hiển thị thông tin tĩnh + link phân hệ, không có KPI hay cảnh báo riêng.

## 3. Dữ Liệu Có Thể Dùng Thật

| Dữ liệu | Nguồn | Trạng thái |
|----------|-------|------------|
| Số công trình theo status | `prisma.project.findMany` | ✅ Có thật |
| Cảnh báo WBS thiếu | `fieldProgressTemplates: { none: {} }` | ✅ Có thật |
| Cảnh báo chưa nhập KL hôm nay | Entries today vs active projects | ✅ Có thật |
| Tiến độ % theo công trình | `designQuantity` vs `entries approved` | ✅ Có thể tính riêng từng CT |
| Hoạt động hôm nay | `fieldProgressEntry` with date filter | ✅ Có thật |
| Cập nhật gần nhất | `project.updatedAt` | ✅ Có thật |

## 4. Routes Hiện Có

| Route | Mục đích |
|-------|----------|
| `/dashboard` | Dashboard công ty |
| `/projects` | Danh sách công trình |
| `/projects/[id]` | Chi tiết công trình (tĩnh) |
| `/projects/[id]/field-progress` | Bảng KL gốc (WBS) |
| `/projects/[id]/field-progress/daily` | Nhập KL theo ngày |
| `/projects/[id]/field-progress/summary` | Tổng hợp KL |
| `/projects/[id]/material-requests` | Đề xuất vật tư |

## 5. Phạm Vi Sửa

- ✅ Làm lại `src/app/(dashboard)/dashboard/page.tsx` — "Bàn điều hành CT2"
- ✅ Tận dụng `/projects/[id]` làm nơi đặt nút "Mở điều hành" trỏ tới
- ✅ Giữ `DashboardHero3D.tsx` (SVG nhẹ, không ảnh hưởng perf)
- ✅ Query Prisma mới — tính KPI, cảnh báo, tiến độ riêng từng công trình

## 6. Phạm Vi KHÔNG Sửa

- ❌ Auth / Session / Middleware
- ❌ Database schema
- ❌ RBAC logic
- ❌ Sidebar / Header components
- ❌ Các phân hệ Field Progress, Material Requests
- ❌ Login page
