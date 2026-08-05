# HR PHASE 4 — CHIẾN LƯỢC KIỂM THỬ VÀ ĐẢM BẢO CHẤT LƯỢNG (TEST STRATEGY & QA GATE)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. CHIẾN LƯỢC KIỂM THỬ THỰC TẾ TRÊN MÔI TRƯỜNG KỸ THUẬT

Chiến lược kiểm thử Phase 4 tập trung vào kiểm tra các trường hợp biên (Boundary Cases), định dạng ngày Việt Nam `parseVietnamDateOnly` (DEC-03), vi phạm phân bổ time-overlap, locking đồng thời PostgreSQL với 2 DB connections (DEC-02) và nỗ lực truy cập trái phép IDOR (DEC-04).

---

## II. MA TRẬN TEST SUITE THỰC THI (TEST SUITE MATRIX)

### 1. Service & Allocation Unit Tests (`src/lib/hr/__tests__/project-assignment-service.test.ts`)
- **TC-01:** Phân công nhân sự hợp lệ (`allocationPercentage = 100%`) thành công.
- **TC-02 (DEC-03):** Validate định dạng ngày:
  - `2026-02-29` -> FAIL (năm không nhuận)
  - `2028-02-29` -> PASS (năm nhuận)
  - `2026-12-31` -> PASS
  - Server timezone UTC -> Vẫn giữ đúng ngày Việt Nam
  - Database round-trip -> Không đổi ngày
- **TC-03:** Phân công song song 2 dự án (50% + 50%) thành công.
- **TC-04:** Phân công 50% + 60% trùng thời gian -> Ném lỗi `ALLOCATION_OVERLAP_EXCEEDED` có danh sách chi tiết các dự án giao thoa.
- **TC-05:** Phân công 50% + 60% có `overrideReason` hợp lệ + User có quyền Override -> Phân công thành công.
- **TC-06 (DEC-01):** Phân công quá ngày `expectedEndDate` mà `endDate` vẫn null -> `allocationEffectiveEnd` tính bằng Infinity, giữ nguyên lực lượng tại công trường.
- **TC-07 (DEC-06):** Thay đổi vai trò nhân sự bằng `transferProjectRoleOrAllocationAction` -> Kết thúc bản ghi cũ tại ngày $D$ (`endDate = D`, `status = RELEASED`, `endReason = ROLE_TRANSFER`), tạo bản ghi mới từ ngày $D$ (`startDate = D`).
- **TC-08:** Rút nhân sự sớm (`releaseEmployeeFromProjectAction`) -> Cập nhật status `RELEASED`, `endReason = EARLY_RELEASE`, lưu `endDate` và ghi lịch sử biến động.
- **TC-09 (DEC-02):** Concurrency Test: Chạy các giao dịch phân công đồng thời cho cùng 1 nhân sự qua **2 database connections thật** -> Kiểm tra `SET LOCAL lock_timeout = '5s'` và cơ chế retry cho lỗi `55P03`/`40001`/`40P01`.

### 2. IDOR Security Tests (`scripts/qa/hr-phase4-idor-denial.spec.ts`)
- **TC-SEC-01:** User A (Quản lý Đơn vị 1) gửi Server Action điều động Nhân sự thuộc Đơn vị 2 -> Bị chặn 403 Forbidden.
- **TC-SEC-02 (DEC-04):** User B gửi Server Action điều động Nhân sự vào Dự án ngoài phạm vi `ProjectStaffingScope` -> Bị chặn 403 Forbidden.
- **TC-SEC-03 (DEC-05):** Chỉ huy trưởng (`CHIEF_COMMANDER`) gọi Server Action `releaseEmployeeFromProjectAction` -> Bị chặn 403 (release = DENY).
- **TC-SEC-04:** User D (HR Manager không có quyền Override) truyền `overrideReason` để điều động 120% -> Bị chặn 403 (Thiếu quyền `hr:project_allocation:override`).
- **TC-SEC-05 (DEC-08):** Kiểm tra Payload DTO điều động và file Excel -> Đảm bảo không chứa thông tin PII (CMND/CCCD, email cá nhân, lương, tài khoản ngân hàng).

### 3. Playwright E2E UI Tests (`scripts/qa/hr-phase4-runtime.spec.ts`)
- **TC-UI-01:** Đăng nhập tài khoản HR Admin -> Điều hướng đến `/hr/project-assignments` -> Kiểm tra giao diện Workspace Shell & Dashboard KPI.
- **TC-UI-02:** Mở Hộp thoại "Tạo điều động mới" -> Chọn Nhân sự, Dự án, Vai trò -> Submit -> Kiểm tra bản ghi xuất hiện trên bảng dữ liệu.
- **TC-UI-03:** Chọn nhân sự đã có 100% allocation -> Tạo điều động mới 50% -> Kiểm tra Hộp thoại `AllocationOverlapDialog` xuất hiện đúng thông tin cảnh báo.
- **TC-UI-04:** Chạy kiểm thử trên môi trường QA isolated DB, đảm bảo không làm nhiễm bẩn CSDL.
