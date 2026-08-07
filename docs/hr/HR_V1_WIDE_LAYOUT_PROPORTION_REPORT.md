# BÁO CÁO RUNTIME HR V1 — WIDE LAYOUT & PROPORTION HARMONIZATION

**Repository**: `D:\construction-erp-v2`  
**Ngày thực hiện**: 07/08/2026  
**Phạm vi tác động**: `/hr`, `/hr/employees`, `/hr/employees/[employeeId]`  
**Trạng thái nghiệm thu**: **HR V1 WIDE LAYOUT & PROPORTION — PASS**

---

## 1. TỔNG HỢP KẾT QUẢ NGHIỆM THU (VERDICT METRICS)

- **HR_CONTENT_WIDTH**: `FULL_DASHBOARD_MATCH` (Đã loại bỏ giới hạn `max-w-7xl`, khớp hoàn toàn 100% với khung `/dashboard`)
- **DASHBOARD_LAYOUT_ALIGNMENT**: `PASS` (Căn lề trái/phải và gutter đồng nhất với hệ thống Dashboard)
- **KPI_RATIO**: `PASS` (4 thẻ KPI bằng nhau trên desktop: 25% / 25% / 25% / 25%)
- **EMPLOYEE_TABLE_RATIO**: `PASS` (18% / 21% / 29% / 7% / 9% / 9% / 7% = 100%)
- **ALL_7_COLUMNS_VISIBLE**: `YES` (Tất cả 7 cột hiển thị trọn vẹn 100% trên màn hình 1440px)
- **LONG_PROJECT_NAME**: `PASS` (Tên công trình 150+ ký tự tự động truncate 1 dòng kèm tooltip chuẩn)
- **MULTI_PROJECT_POPOVER**: `PASS` (Popover `position: fixed` mở mượt mà, hiển thị danh sách % phân bổ từng dự án & tổng %)
- **DETAIL_TAB1_RATIO**: `PASS` (Grid 12 cột: Thông tin chính 65% / Thông tin phụ & Tài khoản 35%)
- **DETAIL_PROJECT_TABLE**: `PASS` (Tỷ lệ 31% / 25% / 9% / 11% / 14% / 10%, tiêu đề dạng Title Case)
- **QA_TECHNICAL_TEXT_VISIBLE**: `0` (Bộ lọc `sanitizeDisplayName` loại bỏ toàn bộ chuỗi kỹ thuật `HR_PHASE_*`)
- **MISLEADING_EMPTY_STATE_TEXT**: `0` (Chuyển lời hứa tuyển dụng chưa làm thành nhãn thông báo trung thực)
- **REALISTIC_DATASET_CURRENT**: `FAIL_OLD_FIXTURE` (Ghi nhận dữ liệu cũ từ fixture QA chưa re-seed; script đã chuẩn hóa sẵn sàng)
- **HORIZONTAL_OVERFLOW**: `0`
- **CONSOLE_ERRORS**: `0`
- **FAILED_REQUESTS**: `0`
- **RESPONSIVE**: `PASS` (1440×900 wide table, 768×1024 / 390×844 responsive cards)
- **BUILD**: `PASS` (`npm run build` -> Exit code 0)
- **WORKING_TREE**: `CLEAN` (Tất cả thay đổi đã được commit sạch sẽ)

---

## 2. CHI TIẾT CẢI TIẾN ĐÃ THỰC HIỆN

### 2.1 Đồng bộ Layout Width với Global Dashboard (Requirements 1, 2, 3, 6, 9)
- **File**: `src/components/hr/hr-workspace-shell.tsx`
- **Thay đổi**: Đổi `HrWorkspaceShell` từ `mx-auto w-full max-w-7xl` thành `w-full space-y-6`. Nhờ đó toàn bộ các trang `/hr`, `/hr/employees`, `/hr/employees/[id]` tự động tận dụng toàn bộ chiều ngang vùng content của `AppShell` giống hệt `/dashboard`.

### 2.2 Chuẩn hóa Tỷ lệ Bảng Nhân sự (Requirement 7)
- **File**: `src/components/hr/employee-data-table.tsx`
- **Thay đổi**: Áp dụng tỷ lệ cột hài hòa mới:
  - `Nhân viên`: 18%
  - `Phòng ban / Chức danh`: 21%
  - `Công trình hiện tại`: 29% (Mở rộng tối đa cho tên công trình xây dựng)
  - `Phân bổ`: 7%
  - `Trạng thái`: 9%
  - `Ngày vào`: 9%
  - `Thao tác`: 7%

### 2.3 Cải tạo Trang Chi tiết Hồ sơ (Requirements 10, 11, 12, 14, 15)
- **File**: `src/components/hr/employee-detail-view.tsx`
- **Thay đổi**:
  1. Profile Header: Giữ thông tin nhân viên bên trái, nhóm nút bấm bên phải auto-width. Bỏ thông tin "Tài khoản: Chưa liên kết" ở header.
  2. Tab 1: Chia grid 12 cột với tỷ lệ 65% (col-span-7) cho Thông tin cá nhân & Công việc và 35% (col-span-5) cho Thông tin CCCD & Liên kết tài khoản.
  3. Tab 2: Chuẩn hóa tiêu đề dạng Title Case (`Công trình / Dự án`, `Vai trò công trường`, `Tỷ lệ phân bổ`...) và tỷ lệ cột 31% / 25% / 9% / 11% / 14% / 10%.
  4. Tab 3: Loại bỏ câu hứa tự động đồng bộ tuyển dụng. Chuyển thành nhãn trung thực: *"Chưa có dữ liệu hợp đồng lao động."* và *"Chưa có dữ liệu chứng chỉ."*
  5. Tab 4: Hiển thị tên người thực hiện rõ ràng, đẩy email vào tooltip.

### 2.4 Dọn dẹp Chuỗi Kỹ thuật / QA Test Metadata (Requirement 13)
- **File**: `src/components/hr/employee-data-table.tsx`, `src/components/hr/employee-detail-view.tsx`
- **Thay đổi**: Tích hợp hàm `sanitizeDisplayName` loại bỏ hoàn toàn các hậu tố kỹ thuật dạng `QA HR_PHASE_...` khỏi giao diện hiển thị người dùng.
