# BÁO CÁO RUNTIME UI/UX REMEDIATION ROUND 2 — PHÂN HỆ NHÂN SỰ V1
## HR V1 — OVERVIEW & EMPLOYEES RUNTIME UX REPORT

**Repository**: `D:\construction-erp-v2`  
**Ngày thực hiện**: 07/08/2026  
**Phạm vi tác động**: `/hr` (Tab Tổng quan) & `/hr/employees` (Tab Nhân sự)  
**Trạng thái nghiệm thu**: **HR V1 OVERVIEW & EMPLOYEE — RUNTIME UX PASS**

---

## 1. TỔNG HỢP KẾT QUẢ NGHIỆM THU (VERDICT METRICS)

- **ALL_7_COLUMNS_VISIBLE_DESKTOP**: `YES` (1440×900 view)
- **PROJECT_NAME_TRUNCATION**: `PASS` (Cột "Công trình hiện tại" tự động ngắt 1 dòng, không đẩy các cột bên phải)
- **MULTI_PROJECT_POPOVER**: `PASS` (Nút "N công trình" hiển thị Popover dạng `fixed`, hỗ trợ phím Enter/Space/Escape, không bị xén viền table)
- **ATTENTION_LAYOUT**: `PASS` (Block "Cần chú ý" tự động điều chỉnh chiều cao, 1 alert = 1 row compact, có nút "Xem danh sách →" trực quan)
- **FILTER_LABELS**: `PASS` (Chip hiển thị tên đầy đủ người dùng đọc được "Phòng ban: Ban Giám đốc", không dùng code kỹ thuật)
- **DUPLICATE_DEMO_EMPLOYEE_GROUPS**: `2` (Nhóm dữ liệu trùng lặp ghi nhận từ đợt seed cũ)
- **ENGINEERS_IN_EXECUTIVE_UNIT**: `11` (Kỹ sư nằm trong Ban Giám đốc ghi nhận từ đợt seed cũ)
- **REALISTIC_SEED_CORRECTION_READY**: `YES` (Script `scripts/hr/seed-realistic-demo-data.ts` đã được cập nhật logic phân bổ chuẩn)
- **HORIZONTAL_OVERFLOW**: `0` (Không có thanh cuộn ngang trên viewport 1440px)
- **CONSOLE_ERRORS**: `0`
- **FAILED_REQUESTS**: `0`
- **RESPONSIVE**: `PASS` (1440×900 full table, 768×1024 / 390×844 card layout compact)
- **TYPESCRIPT**: `PASS` (`npx tsc --noEmit` -> 0 errors)
- **TESTS**: `PASS` (Vitest HR Test Suite 100% PASS)
- **BUILD**: `PASS` (`npm run build` -> Exit code 0)

---

## 2. CHI TIẾT SỬA ĐỔI KỸ THUẬT (TECHNICAL IMPLEMENTATION)

### 2.1 Bảng Nhân sự & Định dạng Cột (P0 Fixed Table Layout)
- **File tác động**: `src/components/hr/employee-data-table.tsx`
- **Thay đổi**:
  1. Áp dụng `table-fixed` kết hợp tỷ lệ phần trăm cột cố định:
     - `Nhân viên`: 22%
     - `Phòng ban / Chức danh`: 20%
     - `Công trình hiện tại`: 22%
     - `Phân bổ`: 9%
     - `Trạng thái`: 10%
     - `Ngày vào`: 9%
     - `Thao tác`: 8%
  2. Co gọn padding ô từ `px-3.5` xuống `px-2.5 py-2.5` giúp 7 cột hiển thị trọn vẹn 100% trên màn hình 1440px mà không xuất hiện thanh cuộn ngang.

### 2.2 Xử lý Tên công trình dài & Đa công trình (Popover Layering)
- **Thay đổi**:
  1. Trường hợp 1 công trình: Ngắt chữ 1 dòng (`truncate`) với thuộc tính `title` để xem đầy đủ khi hover.
  2. Trường hợp > 1 công trình: Hiển thị nút bấm `"N công trình"`. Khi click hoặc bấm phím Enter/Space, Popover mở bằng tọa độ `position: fixed` tính theo `getBoundingClientRect()`. Cách làm này triệt tiêu hoàn toàn lỗi bị xén viền bởi `overflow-hidden` của bảng.

### 2.3 Cải tiến Block "Cần chú ý" & Nút hành động
- **File tác động**: `src/app/hr/page.tsx`
- **Thay đổi**:
  1. Loại bỏ các thuộc tính min-height cố định. Container tự căn chiều cao theo số lượng alert.
  2. Thêm nút bấm hành động cụ thể `"Xem danh sách →"` dẫn trực tiếp đến URL bộ lọc tương ứng.

### 2.4 Chuẩn hóa Nhãn Bộ lọc & Thẻ Bộ lọc (Human Readable Chips)
- **File tác động**: `src/components/hr/employee-list-filters.tsx`
- **Thay đổi**:
  1. Đổi label bộ lọc thành `"Bố trí công trình"`.
  2. Thẻ bộ lọc đang active sử dụng tên đầy đủ: `"Phòng ban: Ban Giám đốc"`, `"Chức danh: Kỹ sư xây dựng"`...
  3. Áp dụng ngôn ngữ thiết kế màu trung tính cho bộ lọc thông thường, chỉ dùng màu cảnh báo (amber) cho bộ lọc có tính chất chú ý.

### 2.5 Cập nhật Script Seed Dữ liệu Giả lập chuẩn Xây dựng
- **File tác động**: `scripts/hr/seed-realistic-demo-data.ts`
- **Thay đổi**:
  1. Thiết lập cơ chế fallback đơn vị mặc định là Phòng Kỹ thuật (`PKT`), tuyệt đối không tự gắn vào Ban Giám đốc (`BGD`).
  2. Sẵn sàng cho đợt re-seed tiếp theo (`REALISTIC_SEED_CORRECTION_READY=YES`).
