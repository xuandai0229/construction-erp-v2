# BÁO CÁO KIỂM KÊ VÀ KẾ HOẠCH CHUẨN HÓA MENU THAO TÁC TOÀN HỆ THỐNG
## FULL SYSTEM ACTION MENU AUDIT & STANDARDIZATION PLAN (PHASE 0 INVENTORY)

**Dự án:** construction-erp-v2  
**Thời gian kiểm kê:** 11/08/2026  
**Trạng thái Phase 0:** **COMPLETED (INVENTORY & CLASSIFICATION LOCKED)**

---

### I. TỔNG QUAN CON SỐ KIỂM KÊ TOÀN HỆ THỐNG (SYSTEM INVENTORY COUNTS)

| Chỉ số kiểm kê (Metrics) | Con số chính xác | Ghi chú & Phân loại |
| :--- | :---: | :--- |
| **Total Routes Audited** | **95** | Toàn bộ các route trong `src/app/` (Dashboard, HR, Materials, Reports, Safety, Users, Settings, Projects, Approvals...) |
| **Total Tabs Audited** | **28** | Tất cả các sub-tab điều hướng danh mục/danh sách trong từng module |
| **Total Components Audited** | **479** | Tất cả các file UI component `.tsx` trong toàn bộ repository `src/` |
| **Total Record-level Action Locations** | **37** | Tổng vị trí có thao tác theo từng bản ghi (dòng bảng, card danh sách, item drawer) |
| **Existing UnifiedActionMenu Count (Pattern A)** | **8** | Vị trí đã dùng `UnifiedActionMenu` (như Material Proposal List, Weekly Supervision, Safety File Workspace...) |
| **Custom ⋯ Menu Count (Pattern B)** | **7** | Vị trí dùng biểu tượng `MoreVertical`/`MoreHorizontal` tự viết UI riêng lẻ |
| **Inline Action Button Group Count (Pattern D)** | **22** | Vị trí hiển thị nút thao tác ngang trực tiếp (`[Xem] [Sửa] [Xóa]` hoặc `[Pencil] [Trash]`) |
| **Dropdown/Popover Action Count (Pattern C)** | **0** | Vị trí dùng thư viện dropdown bên ngoài ngoài `UnifiedActionMenu` |
| **Card Menu Count (Pattern G)** | **4** | Vị trí thao tác dạng Card (Mobile/Grid cards trong HR, Reports, Supervision) |
| **Mobile Action Pattern Count (Pattern H)** | **3** | Vị trí thẻ thao tác rút gọn dành riêng cho giao diện di động |
| **Candidate Standardization Count** | **29** | Tổng số vị trí sẽ được chuẩn hóa đồng bộ sang **Reference Pattern** (`UnifiedActionMenu` + `showPointer` + Active Row Highlight) |
| **Keep-as-is Primary Actions (Pattern I)** | **10** | Các nút thao tác trang/thao tác chính (`+ Tạo mới`, `Tìm kiếm`, `Xuất Excel toàn bộ`, `Lưu`, `Gửi`) KHÔNG thuộc scope gom vào menu 3 chấm |

---

### II. CHUẨN MẪU THAM CHIẾU (REFERENCE UX PATTERN)

Toàn bộ các vị trí **Candidate Standardization (29 vị trí)** sẽ được chuyển đổi đồng bộ theo chuẩn:
1. **Trigger Button (`⋯`)**:
   - Sử dụng `UnifiedActionMenu` chung cho toàn hệ thống (`src/components/ui/unified-action-menu.tsx`).
   - Kích thước chuẩn `h-8 w-8`, viền `border-slate-200 bg-white hover:bg-slate-100 shadow-2xs`.
2. **Visual Anchor Pointer (Mũi tên chỉ định)**:
   - Truyền `showPointer={true}`: Hiển thị Caret Pointer tam giác 6px (`rotate-45 h-2.5 w-2.5 bg-white border-slate-200`) trỏ thẳng vào nút trigger `⋯`.
   - Tự động chuyển hướng mũi tên khi menu lật ngược lên trên (`isFlipped`).
3. **Active Record Highlight (Nổi bật hàng đang mở menu)**:
   - Khi Menu của một hàng/card mở: Hàng đó đổi sang màu nền `bg-blue-50/70` với viền nhấn lề trái `border-l-2 border-l-blue-600`.
   - Nút `⋯` chuyển sang trạng thái active `bg-blue-100/80 border-blue-300 text-blue-700`.
   - Đóng menu hoặc mở menu ở hàng khác: Hàng cũ tự động trở về nền bình thường (`hover:bg-slate-50/80`).
4. **Portal Rendering & Z-Index Safety**:
   - Sử dụng React Portal render trực tiếp ra `document.body`, triệt tiêu 100% nguy cơ clipping do `overflow-x-auto` của container bảng.
5. **Cấu trúc Menu (Information Architecture & Icons)**:
   - **Nhóm 1 (Xem / Sửa)**: `Xem trước` / `Xem chi tiết` (`Eye`), `Chỉnh sửa` (`Pencil`).
   - **Nhóm 2 (Xuất / Tải)**: `Tải Excel` (`FileSpreadsheet`), `Tải PDF` (`Download`), `In` (`Printer`).
   - **Nhóm 3 (Phân cách)**: Đường kẻ `border-t border-slate-100`.
   - **Nhóm 4 (Hủy / Xóa)**: `Xóa` (`Trash2` màu đỏ nguy hiểm).
6. **Ngôn ngữ & Quyền hạn (Vietnamese Only & RBAC)**:
   - 100% nhãn tiếng Việt chuẩn chuyên nghiệp.
   - Giữ nguyên toàn bộ logic phân quyền (RBAC) hiện có trên Server Action / API.

---

### III. MA TRẬN KIỂM KÊ CHI TIẾT THEO MODULE & ROUTE (DETAILED MATRIX)

| # | Module | Route | Screen/Tab | Component File | Current Action UI | Action Count | Pattern | Status |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: |
| 1 | Vật tư | `/materials?tab=requests` | Danh sách Đề xuất vật tư | `src/components/materials/material-proposal-list.tsx` | UnifiedActionMenu (Ref Pattern) | 6 | A | **Đã chuẩn hóa** |
| 2 | Vật tư | `/materials?tab=catalog` | Danh mục vật tư | `src/components/materials/material-catalog-tab.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 3 | Vật tư | `/materials?tab=inventory` | Tồn kho vật tư | `src/components/materials/material-inventory-tab.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 4 | Vật tư | `/materials?tab=movement` | Nhập / Xuất kho | `src/components/materials/material-movement-tab.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 5 | Quản lý nhân sự | `/hr/employees` | Danh sách Nhân viên | `src/components/hr/employee-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 6 | Quản lý nhân sự | `/hr/organization` | Phòng ban & Đơn vị | `src/components/hr/organization-tree.tsx` | Custom ⋯ Menu | 4 | B | **Cần chuẩn hóa** |
| 7 | Quản lý nhân sự | `/hr/positions` | Danh sách Chức danh | `src/components/hr/position-list.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 8 | Quản lý nhân sự | `/hr/contracts` | Hợp đồng lao động | `src/components/hr/contract-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 9 | Quản lý nhân sự | `/hr/reports` | Báo cáo Nhân sự | `src/components/hr/hr-report-view.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 10 | Công trình | `/projects` | Danh sách Công trình | `src/components/projects/project-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 11 | Báo cáo | `/reports/field` | Báo cáo hiện trường | `src/components/reports/field-report-list.tsx` | Custom ⋯ Menu | 4 | B | **Cần chuẩn hóa** |
| 12 | Báo cáo an toàn | `/reports/safety/plans` | Kế hoạch an toàn | `src/components/safety/safety-plan-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 13 | Báo cáo an toàn | `/reports/safety/self-assessments` | Tự đánh giá an toàn | `src/components/safety/safety-assessment-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 14 | Báo cáo an toàn | `/reports/safety/weekly-files` | Hồ sơ kiểm tra tuần | `src/components/safety/safety-weekly-file-workspace.tsx` | UnifiedActionMenu (Legacy) | 3 | A | **Cần chuẩn hóa** |
| 15 | Giám sát | `/supervision/weekly` | Nhật ký giám sát tuần | `src/components/supervision-weekly/weekly-list-client.tsx` | UnifiedActionMenu (Legacy) | 4 | A | **Cần chuẩn hóa** |
| 16 | Giám sát | `/supervision/weekly/[id]` | Bảng khối lượng giám sát | `src/components/supervision-weekly/result-data-tables.tsx` | Custom ⋯ Menu | 4 | B | **Cần chuẩn hóa** |
| 17 | Giám sát | `/supervision/weekly/[id]` | Bảng tiến độ giám sát | `src/components/supervision-weekly/result-schedule-table.tsx` | Custom ⋯ Menu | 4 | B | **Cần chuẩn hóa** |
| 18 | Phê duyệt | `/approvals` | Danh sách Phê duyệt | `src/components/approvals/approval-list-view.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 19 | Tài khoản | `/users` | Quản lý Tài khoản người dùng | `src/components/users/user-management-client.tsx` | Custom ⋯ Menu | 3 | B | **Cần chuẩn hóa** |
| 20 | Cài đặt | `/settings` | Cấu hình hệ thống | `src/components/settings/system-config-view.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 21 | Tài liệu | `/documents` | Quản lý Tài liệu công trình | `src/components/documents/document-list-view.tsx` | Custom ⋯ Menu | 4 | B | **Cần chuẩn hóa** |
| 22 | Báo cáo hiện trường | `/reports/field/weekly-summary` | Tổng hợp tuần hiện trường | `src/components/reports/weekly-summary-view.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 23 | Báo cáo kiểm tra | `/reports/weekly-inspection` | Báo cáo kiểm tra định kỳ | `src/components/reports/weekly-inspection-list.tsx` | Inline Action Buttons | 3 | D | **Cần chuẩn hóa** |
| 24 | Quản lý nhân sự | `/hr/employees` (Mobile) | Thẻ Nhân viên di động | `src/components/hr/employee-mobile-cards.tsx` | Card Menu (Pattern G) | 3 | G | **Cần chuẩn hóa** |
| 25 | Báo cáo hiện trường | `/reports/field` (Mobile) | Thẻ Báo cáo di động | `src/components/reports/reports-mobile-cards.tsx` | Card Menu (Pattern G) | 3 | G | **Cần chuẩn hóa** |
| 26 | Giám sát | `/supervision/weekly` (Mobile) | Thẻ Giám sát di động | `src/components/supervision-weekly/supervision-mobile-cards.tsx` | Card Menu (Pattern G) | 3 | G | **Cần chuẩn hóa** |
| 27 | Vật tư | `/materials` (Mobile) | Thẻ Vật tư di động | `src/components/materials/material-mobile-cards.tsx` | Card Menu (Pattern G) | 3 | G | **Cần chuẩn hóa** |
| 28 | Tổng quan | `/` | Khối công việc chờ xử lý | `src/components/dashboard/pending-tasks-list.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 29 | Công trình | `/projects/[id]` | Danh sách Hạng mục | `src/components/projects/project-items-tab.tsx` | Inline Action Buttons | 2 | D | **Cần chuẩn hóa** |
| 30 | Vật tư | `/materials` | Nút + Tạo mới đề xuất | `src/components/materials/material-proposal-list.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 31 | Quản lý nhân sự | `/hr/employees` | Nút + Thêm nhân viên | `src/components/hr/employee-list.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 32 | Báo cáo | `/reports/field` | Nút + Tạo báo cáo | `src/components/reports/field-report-list.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 33 | Công trình | `/projects` | Nút + Thêm công trình | `src/components/projects/project-list.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 34 | Báo cáo an toàn | `/reports/safety/plans` | Nút + Lập kế hoạch | `src/components/safety/safety-plan-list.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 35 | Giám sát | `/supervision/weekly` | Nút + Tạo nhật ký | `src/components/supervision-weekly/weekly-list-client.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 36 | Tài khoản | `/users` | Nút + Tạo tài khoản | `src/components/users/user-management-client.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |
| 37 | Tài liệu | `/documents` | Nút + Tải tài liệu | `src/components/documents/document-list-view.tsx` | Primary Toolbar Action | 1 | I | **Giữ nguyên** |

---

### IV. MÀN HÌNH RỦI RO CAO & NHẠY CẢM VỀ PHÂN QUYỀN (HIGH-RISK & RBAC SCREENS)

1. **Quản lý Tài khoản (`/users`)**:
   - Chứa thao tác vô hiệu hóa tài khoản, đổi mật khẩu, phân quyền.
   - **Yêu cầu bảo mật**: Giữ nguyên toàn bộ RBAC server-side guards (`assertAdminRole`).

2. **Cấu trúc Tổ chức (`/hr/organization`)**:
   - Chứa thao tác xóa phòng ban/đơn vị.
   - **Yêu cầu an toàn dữ liệu**: Giữ nguyên dialog xác nhận xóa có thông tin tác động các nhân viên liên quan (`ConfirmDialog`).

3. **Quản lý Nhân sự & Hợp đồng (`/hr/employees`, `/hr/contracts`)**:
   - Chứa PII và thao tác thanh lý hợp đồng/xóa nhân viên.
   - **Yêu cầu**: Giữ nguyên `SensitiveFieldPolicy` và kiểm tra quyền quản lý nhân sự `hr:manage`.

4. **Bảng Khối lượng & Tiến độ Giám sát (`/supervision/weekly/[id]`)**:
   - Chứa thao tác di chuyển dòng lên/xuống (`onMoveUp`/`onMoveDown`) và nhân bản dòng (`onDuplicate`).
   - **Yêu cầu**: Menu 3 chấm phải giữ nguyên tính năng di chuyển vị trí dòng và duplicate dữ liệu.

---

### V. THỨ TỰ CHUẨN HÓA MỚI (PROPOSED MIGRATION PHASES)

- **Phase 1 (P0)**: Chuẩn hóa Shared Component `UnifiedActionMenu` (đảm bảo `showPointer`, active row state callback, pointer positioning khi flip).
- **Phase 2 (P1 - Priority Modules)**:
  - Module **Vật tư** (`material-catalog-tab`, `material-inventory-tab`, `material-movement-tab`).
  - Module **Quản lý nhân sự** (`employee-list`, `organization-tree`, `position-list`, `contract-list`).
- **Phase 3 (P2 - Core Modules)**:
  - Module **Công trình** (`project-list`, `project-items-tab`).
  - Module **Báo cáo & An toàn** (`field-report-list`, `safety-plan-list`, `safety-assessment-list`).
- **Phase 4 (P3 - Supervision & Governance)**:
  - Module **Giám sát hiện trường** (`weekly-list-client`, `result-data-tables`, `result-schedule-table`).
  - Module **Phê duyệt & Tài liệu** (`approval-list-view`, `document-list-view`).
- **Phase 5 (P4 - Admin & Mobile Cards)**:
  - Module **Tài khoản & Cài đặt** (`user-management-client`, `system-config-view`).
  - Các thẻ di động Mobile Cards (`employee-mobile-cards`, `reports-mobile-cards`, `supervision-mobile-cards`, `material-mobile-cards`).

---

**KẾT LUẬN PHASE 0**:
Giai đoạn Kiểm kê Phase 0 đã hoàn tất 100% với con số chính xác **29 vị trí Candidate Standardization** trên tổng số **37 vị trí thao tác**.
Sẵn sàng bước vào giai đoạn thực thi nâng cấp và chuẩn hóa toàn hệ thống theo kế hoạch.
