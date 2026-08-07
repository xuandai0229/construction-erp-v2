# BÁO CÁO FIX VẬN HÀNH & TINH GỌN UI/UX PHÂN HỆ NHÂN SỰ V1
## HR V1 — OVERVIEW & EMPLOYEES FIX REPORT

**Repository**: `D:\construction-erp-v2`  
**Ngày thực hiện**: 07/08/2026  
**Phạm vi tác động**: `/hr` (Tab Tổng quan) & `/hr/employees` (Tab Nhân sự)  
**Trạng thái kiểm thử**: PASS (TypeScript `0 errors`, Vitest HR Test Suite `100% PASS`)

---

## 1. KHÁI QUÁT VÀ NGUYÊN TẮC THIẾT KẾ (PRINCIPLES)

1. **Chuẩn hóa khái niệm Lực lượng lao động hiện tại (Current Workforce)**:
   - Trước đây: Hệ thống gọi duy nhất `ACTIVE` là "Đang làm việc", bỏ sót `PROBATION` (Thử việc) — người thực tế đang làm việc tại doanh nghiệp.
   - Sau fix: `CURRENT_WORKFORCE = ACTIVE + PROBATION`. Nhân sự `RESIGNED` (Đã nghỉ) và `RETIRED` (Nghỉ hưu) hoàn toàn bị loại trừ khỏi lực lượng lao động hiện tại.

2. **Nhất quán toán học Quản lý Nguồn lực (Resource Management Metrics)**:
   - Công thức bắt buộc:  
     $$\text{CURRENT\_WORKFORCE} = \text{AT\_PROJECT} + \text{NOT\_ASSIGNED\_TO\_PROJECT}$$
   - Mọi nhân sự trong `CURRENT_WORKFORCE` nếu có điều động công trình đang hoạt động (`status: ACTIVE`, chưa hết hạn) sẽ tính vào `AT_PROJECT` ("Đang ở công trình").
   - Nếu không có bất kỳ điều động công trình hoạt động nào, tính vào `NOT_ASSIGNED_TO_PROJECT` ("Chưa bố trí công trình").
   - Toàn bộ dữ liệu tính toán thời gian thực từ cơ sở dữ liệu.

3. **Tinh gọn Từ vựng & Giao diện Doanh nghiệp Xây dựng**:
   - Loại bỏ hoàn toàn từ ngữ không thích hợp như "Rảnh". Đổi thành "Chưa bố trí công trình".
   - Loại bỏ các chuỗi nút lặp lại "Xem danh sách →". Biến toàn bộ KPI Card thành thành phần tương tác (`Link`), hỗ trợ hiệu ứng hover, shadow và keyboard focus.
   - Đổi tên block "Cần chú ý (Attention Required)" thành "Cần chú ý". Zero từ tiếng Anh rác.

---

## 2. CHI TIẾT CÁC THAY ĐỔI & REMEDIATION MATRIX

### 2.1 Tab "Tổng quan" (`/hr/page.tsx`)

| Thành phần | Trước khi fix | Sau khi fix | Ghi chú / Trạng thái |
| :--- | :--- | :--- | :--- |
| **KPI Card 1** | "Tổng nhân sự" (Count all) | "Nhân sự hiện tại" (`ACTIVE` + `PROBATION`) | Đã chuẩn hóa workforce |
| **KPI Card 2** | "Đang làm việc" | "Đang ở công trình" (`AT_PROJECT`) | Lọc đúng nhân sự có công trình |
| **KPI Card 3** | "Chưa điều động (Rảnh)" | "Chưa bố trí công trình" | Bỏ từ "Rảnh", bảo đảm toán học |
| **KPI Card 4** | "Đang ở công trình" (Lặp) | "Quá tải (>100%)" | Đo lường nhân sự bị phân bổ >100% |
| **KPI UX** | Chữ "Xem danh sách →" | Clickable card toàn bộ + hover & focus ring | Chuẩn UX hiện đại |
| **Block Alert** | Có 3 card mặc định, count = 0 vẫn hiện | Chỉ hiện Card có `count > 0`. Nếu tất cả = 0 hiện thông báo xanh sạch | Tinh gọn 100% |
| **Account Alert** | Card "Chưa liên kết tài khoản" hiện mặc định | Đã ẩn khỏi Dashboard chính (chỉ giữ ở Bộ lọc nâng cao tab Nhân sự) | Đơn giản hóa |

### 2.2 Tab "Nhân sự" (`/hr/employees/page.tsx`, `employee-list-filters.tsx`, `employee-data-table.tsx`)

| Thành phần | Trước khi fix | Sau khi fix | Ghi chú / Trạng thái |
| :--- | :--- | :--- | :--- |
| **Tiêu đề trang** | "Hồ sơ nhân viên" | "Nhân sự" | Đúng chuẩn brief |
| **Mô tả trang** | "Quản lý danh sách nhân sự..." | "Tra cứu nhân viên, phòng ban, chức danh và tình trạng bố trí công trình." | Ngắn gọn, rõ nghiệp vụ |
| **Cột Bảng (Col 1)** | Tách riêng "Nhân viên" và "Mã NV" | Gộp: Avatar + Họ và tên (dòng 1) + Mã NV (dòng 2) | Tiết kiệm diện tích ngang |
| **Cột Bảng (Col 2)** | Tách riêng "Phòng ban" và "Chức danh" | Gộp: Phòng ban (dòng 1) + Chức danh (dòng 2) + Ellipsis | Hiển thị gọn gàng |
| **Cột Bảng (Col 3)** | Không có cột Công trình | **Cột P0 "Công trình hiện tại"**: Hiển thị tên công trình hoặc "N công trình" | Trực quan cho XD |
| **Cột Bảng (Col 4)** | Không có cột Phân bổ | **Cột "Phân bổ"**: Hiển thị `%` tổng phân bổ, cảnh báo ⚠ nếu > 100% | Phát hiện quá tải tức thì |
| **Header Bảng** | ALL CAPS ("NHÂN VIÊN", "MÃ NV") | Title Case ("Nhân viên", "Phòng ban / Chức danh", "Công trình hiện tại") | Thẩm mỹ hiện đại |
| **No-wrap** | Thẻ trạng thái và ngày bị xuống dòng | Gắn `whitespace-nowrap` cho Mã NV, Trạng thái, Ngày vào, Thao tác | Không bị vỡ layout |
| **Mặc định Sắp xếp** | `createdAt:desc` (Ngày tạo bản ghi) | `joinedDate:desc` ("Ngày vào làm: mới nhất") | Sửa bug logic sắp xếp |
| **Bộ lọc Nơi làm việc** | Có "Văn phòng / Chưa đi công trường" trùng lặp | Gộp lại 3 lựa chọn duy nhất: Đang ở công trình, Chưa bố trí công trình, Quá tải | Loại bỏ semantic trùng lặp |
| **Thẻ bộ lọc (Chips)** | Không có | Hiển thị Chip bộ lọc đang chọn + nút xóa từng chip + nút Đặt lại | Trực quan |
| **Thanh phân trang** | Dài dòng | Ngắn gọn: `1–15 / 31 nhân viên` + `‹ Trang 1/3 ›` | Tinh gọn |

---

## 3. BẰNG CHỨNG KIỂM THỬ VÀ XÁC THỰC (QA VALIDATION EVIDENCE)

### 3.1 Kiểm tra Cú pháp & Kiểu dữ liệu (TypeScript Compiler)
```bash
npx tsc --noEmit
# Output: Exit code 0 (0 errors)
```

### 3.2 Kiểm tra Unit Test & Integration Test Phân hệ HR (Vitest)
```bash
npx vitest run
# HR Test Modules Passed:
#  ✓ src/lib/hr/__tests__/employee-service.test.ts (6 tests)
#  ✓ src/lib/hr/__tests__/permission-service.test.ts (4 tests)
#  ✓ src/lib/hr/__tests__/project-assignment-ui.test.ts (3 tests)
#  ✓ src/lib/hr/__tests__/project-assignment-actions.test.ts (9 tests)
#  ✓ src/lib/hr/__tests__/pii-encryption.test.ts (8 tests)
#  ✓ src/lib/hr/__tests__/hr-projection.test.ts (3 tests)
#  ✓ scripts/qa/__tests__/hr-phase4-4-reporting.test.ts (7 tests)
```

---

## 4. KẾT LUẬN

Phân hệ Nhân sự (Tab **Tổng quan** và Tab **Nhân sự**) đã được tối ưu hoàn toàn theo đúng tư duy quản lý nguồn lực doanh nghiệp xây dựng:
- Dashboard gọn gàng, 4 KPI chính xác và nhất quán toán học.
- Bảng danh sách nhân sự tập trung vào Công trình và Phân bổ %, không vỡ dòng.
- Không đụng chạm vào Backend core, RBAC, PII Encryption hay database migration.
