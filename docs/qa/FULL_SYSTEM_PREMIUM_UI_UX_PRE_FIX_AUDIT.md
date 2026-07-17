# BÁO CÁO AUDIT UI/UX TRƯỚC CẢI TỔ TOÀN DIỆN (PRE-FIX AUDIT)
**Dự án:** construction-erp-v2  
**Thời gian:** 16-07-2026  
**Vai trò:** Principal Product Designer & Senior Frontend Architect

---

## 1. HIỆN TRẠNG HỆ THỐNG & ĐÁNH GIÁ TỔNG QUAN

Hệ thống ERP hiện tại đã có cấu trúc Next.js App Router rất hoàn thiện, cấu trúc dữ liệu và phân quyền RBAC được triển khai chặt chẽ. Hệ thống Design Tokens cơ bản trong `src/app/globals.css` đã được định nghĩa và có các utilities dùng chung. Tuy nhiên, về mặt cảm quan thẩm mỹ (Aesthetics) và trải nghiệm sử dụng (UX), giao diện hiện tại vẫn còn một số điểm hạn chế:
1. **Thiếu cảm giác "Premium ERP":** Màu sắc và shadow còn cơ bản, chưa tạo được chiều sâu. Cần nâng cấp hệ thống màu trung tính (neutral background/surfaces) để dịu mắt khi làm việc liên tục nhiều giờ.
2. **Sự không nhất quán trong Layout/Spacing:** Một số component dùng CSS Module, một số dùng Tailwind class thô, dẫn đến khoảng cách padding, gap chưa được chuẩn hóa theo Grid System chặt chẽ.
3. **Trải nghiệm tương tác (Interaction/Micro-UX):** Các button hover, active, focus states còn sơ sài; dialog/drawer chuyển động chưa thực sự mượt mà; loading skeletons và empty states chưa đồng bộ giữa các phân hệ.
4. **Responsive trên Tablet/Mobile:** Bảng dữ liệu dày đặc (data-dense tables) trên màn hình hẹp dễ bị overflow nếu không được bọc cuộn ngang có kiểm soát hoặc chuyển sang card layout phù hợp.
5. **Project Context Switcher & Global Search:** Khi chuyển công trình hoặc tìm kiếm, cần đảm bảo trạng thái chuyển đổi mượt mà, không giật màn hình hoặc để lộ dữ liệu sai lệch.

---

## 2. INVENTORY COMPONENT & ĐỊNH HƯỚNG CHUẨN HÓA

### 2.1. Primitive Components (`src/components/ui/`)
- **Button (`button.tsx`):** Đã có các variant (`default`, `secondary`, `outline`, `ghost`, `destructive`, `success`, `warning`) và hỗ trợ `isLoading`. Cần tinh chỉnh border-radius đồng nhất và hover/focus rings sắc nét hơn.
- **StatusBadge (`status-badge.tsx`):** Phân loại badge trạng thái rõ ràng (`success`, `warning`, `danger`, `info`, `neutral`, `purple`). Cần đảm bảo màu chữ và nền có độ tương phản cao (Accessibility) và bo viền mềm mại.
- **Card (`card.tsx`):** Chuẩn hóa shadow và border để tạo cảm giác elevated sang trọng, giảm thiểu border thô cứng.
- **EmptyState (`empty-state.tsx`) & PageError (`page-error.tsx`):** Cần đảm bảo thiết kế trực quan, có hành động gợi ý rõ ràng (ví dụ: nút thử lại, nút tạo mới).
- **Combobox & Input (`enterprise-combobox.tsx`, `numeric-input.tsx`):** Chuẩn hóa viền focus, placeholder dịu hơn, font chữ chữ số sắc nét (`tabular-nums`).

### 2.2. App Shell & Layout Components (`src/components/layout/`)
- **Sidebar (`sidebar.tsx`, `sidebar.module.css`):** Menu trái cần có cấu trúc phân cấp (Hierarchy) tốt hơn, hiệu ứng hover/active mềm mại với indicator rõ nét. Navigation permissions cần được bảo toàn tuyệt đối.
- **Header (`header.tsx`):** Đồng bộ hóa chiều cao, breadcrumbs, user profile dropdown và căn chỉnh các icons trợ giúp, chuông thông báo.
- **Project Switcher (`global-project-context-switcher.tsx`):** Đảm bảo popover đóng mở mượt, hỗ trợ tìm kiếm nhanh công trình, hiển thị rõ ràng trạng thái công trình bằng icon và màu đặc trưng.

---

## 3. DANH SÁCH MODULES & ROUTE CẦN KIỂM TRA/SỬA ĐỔI

1. **Dashboard (`/dashboard`):** Nâng cấp Executive Dashboard & Operational Dashboard, tối ưu hóa các KPI cards, biểu đồ tiến độ dự án, và các danh sách việc cần xử lý.
2. **Công trình (`/projects` & `/projects/[id]`):** Tinh chỉnh bảng danh sách dự án, trang chi tiết dự án, tiến độ hiện trường, và thanh tab điều hướng.
3. **Báo cáo hiện trường (`/reports`):** Form báo cáo ngày/báo cáo tuần, bảng khối lượng công việc, bảng máy móc nhân lực và nút in/xuất PDF.
4. **Vật tư (`/materials`):** Phân hệ tồn kho, yêu cầu vật tư, luồng phê duyệt cấp phát vật tư.
5. **Tài liệu (`/documents`):** Thư mục tài liệu, context menu, kéo thả upload file, phân quyền tài liệu theo project scope.
6. **Phê duyệt (`/approvals`):** Giao diện trung tâm phê duyệt, hiển thị rõ ràng lý do từ chối, lịch sử phê duyệt và các nút hành động chính/phụ.
7. **Hệ thống (`/users`, `/settings`):** Phân nhóm cài đặt hệ thống, danh sách tài khoản nhân sự với phân quyền chi tiết.

---

## 4. CHI TIẾT CÁC LỖI UI/UX PHÁT HIỆN & RỦI RO NGHIỆP VỤ

### 4.1. Lỗi Responsive & Spacing
- Màn hình nhỏ (Mobile/Tablet) dễ gặp hiện trạng overflow khi bảng dữ liệu (Table) quá nhiều cột.
- Một số nút hành động bị rơi hàng hoặc bị che khuất bởi Bottom Navigation trên Mobile.
- Khoảng cách padding giữa page container và card ngoài rìa chưa đồng bộ ở các breakpoint khác nhau.

### 4.2. Lỗi Interaction & Micro-UX
- Khi nhấn các nút có xử lý API (ví dụ: Duyệt, Từ chối, Lưu báo cáo), một số màn hình chưa khóa nút (disabled) ngay lập tức hoặc thiếu Spinner/Skeleton, dẫn đến nguy cơ người dùng bấm đúp gửi trùng request.
- Dropdown menu hoặc Popover đôi khi bị cắt lề bởi thuộc tính `overflow-hidden` của các thẻ card cha.

### 4.3. Rủi ro Nghiệp vụ (Business Logic Risks)
- **RBAC & Project Scope:** Tuyệt đối không để lộ thông tin của công trình khác khi người dùng chỉ được phân quyền tại một công trình nhất định. Bộ lọc `projectId` phải được áp dụng chặt chẽ từ Cookie/Session.
- **Số liệu tài chính/khối lượng:** Không làm tròn tùy tiện các số liệu tiền tệ dài, khối lượng vật tư lẻ (phải dùng định dạng chuẩn tiếng Việt hoặc giữ nguyên độ chính xác từ DB).

---

## 5. KẾ HOẠCH TRIỂN KHAI PHÙ HỢP TIÊU CHÍ NGHIỆM THU

1. **Bước 1: Chuẩn hóa Tokens & Utilities (`globals.css`)**
   - Nâng cấp palette màu neutral sẫm/sáng cao cấp, chuẩn hóa shadows (`--shadow-card`, `--shadow-elevated`).
   - Cập nhật focus ring đồng nhất cho tất cả tương tác bàn phím.
2. **Bước 2: Cải tổ App Shell & Layout Components**
   - Thiết kế lại Sidebar với gradient nền sẫm sang trọng và hiệu ứng active item mượt mà.
   - Polishing Header: tối ưu hóa breadcrumb, menu dropdown của User Profile.
3. **Bước 3: Chuẩn hóa UI Components cốt lõi**
   - Cải tiến Button hover/active transition, StatusBadge, Combobox, Dialog/Drawer overlay (blur nền nhẹ).
4. **Bước 4: Nâng cấp trải nghiệm Table & Form trong các Module Nghiệp vụ**
   - Áp dụng các class `.enterprise-table` chuẩn, bổ sung sticky headers, sticky action columns và cuộn ngang.
   - Thêm trạng thái disabled, loading spinner cho mọi hành động submit form để tránh double-submit.
5. **Bước 5: Kiểm thử Responsive & Khả năng tương tác**
   - Sử dụng static check (`tsc`, `build`, `lint`) kết hợp xác minh UI thực tế trên các breakpoint phổ biến.
6. **Bước 6: Hoàn thiện báo cáo cuối cùng (`docs/qa/FULL_SYSTEM_PREMIUM_UI_UX_FINAL_REPORT.md`)**.
