# HR PHASE 4.0 — BÁO CÁO TỔNG QUAN HỆ THỐNG ĐIỀU ĐỘNG NHÂN SỰ CÔNG TRÌNH

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. MỤC TIÊU VÀ PHẠM VI PHASE 4.0.3

### 1. Mục tiêu duy nhất
Phase 4.0.3 hoàn tất phê duyệt đặc tả kiến trúc và nghiệp vụ phân hệ **HR Phase 4 — Điều động nhân sự công trình (Project Personnel Assignment)**, làm nền tảng triển khai cho Sub-phase 4.1.

### 2. Giới hạn thực hiện Phase 4.0.3
- Không thay đổi mã nguồn runtime sản xuất.
- Không thay đổi Prisma Schema và không tạo Migration database thực tế trong lượt này.
- Chỉ cập nhật 16 tài liệu đặc tả trong thư mục `docs/hr/phase-4/`.

---

## II. TÓM TẮT NÂNG CẤP KIẾN TRÚC VÀ NGHIỆP VỤ ĐÃ PHÊ DUYỆT

1. **Phân tách Ngày hiệu lực và Tỷ lệ Phân bổ (DEC-01):**
   - Phân công đã bắt đầu: `allocationEffectiveEnd = endDate ?? Infinity`. Trường `expectedEndDate` chỉ dùng tạo cảnh báo hết hạn, không tự động giải phóng tỷ lệ phân bổ hoặc kết thúc hiệu lực nhân sự tại công trường.
   - Phân công chưa bắt đầu: `allocationEffectiveEnd = endDate ?? expectedEndDate ?? Infinity`.
   - Điều kiện nhân sự cắm tại công trường thực tế: `status = ACTIVE AND startDate <= at AND (endDate IS NULL OR at < endDate)`.
   - Nhãn "Kế hoạch" được suy ra từ điều kiện `status = ACTIVE AND startDate > at`.

2. **Cơ chế Khóa Đồng thời PostgreSQL (DEC-02):**
   - Sử dụng `SET LOCAL lock_timeout = '5s'; SELECT pg_advisory_xact_lock(hashtextextended($1, 0));` trong Prisma transaction.
   - Tự động thử lại tối đa 3 lần cho các mã lỗi xung đột khóa `55P03`, `40001`, `40P01` với khoảng chờ tăng dần.

3. **Chuẩn định dạng Ngày Việt Nam (DEC-03):**
   - Chuỗi ngày đầu vào định dạng `YYYY-MM-DD`, xử lý qua helper `parseVietnamDateOnly` và `formatVietnamDateOnly` theo múi giờ `Asia/Ho_Chi_Minh`. Từ chối các ngày không hợp lệ trên lịch (ví dụ `2026-02-29`).

4. **Phân quyền Phạm vi Công trình (DEC-04 & DEC-05):**
   - Phân tách `ProjectReadScope` và `ProjectStaffingScope`. Quyền xem dự án hoặc quyền `ALL_EMPLOYEES` của HR không dùng để suy ra quyền điều động dự án.
   - Vai trò `CHIEF_COMMANDER` không trực tiếp thực hiện mutation rút nhân sự (`release = DENY`), chỉ gửi yêu cầu ngoài hệ thống trong Phase 4.

5. **Phân loại Lý do Kết thúc và Migration Đề xuất (DEC-06 & DEC-07):**
   - Bổ sung enum `EmployeeProjectAssignmentEndReason` (`COMPLETED`, `EARLY_RELEASE`, `ROLE_TRANSFER`, `ALLOCATION_CHANGE`, `PROJECT_TRANSFER`) và bổ sung chỉ mục composite `@@index([employeeId, status, startDate])`, `@@index([projectId, status, startDate])` trong migration additive của Phase 4.1.

6. **Bảo mật PII và Thu hẹp Phạm vi (DEC-08, DEC-09, DEC-10):**
   - DTO phân công và file Excel xuất ra không chứa thông tin PII nhạy cảm (CCCD, lương, tài khoản ngân hàng, email cá nhân).
   - Quy trình Offboarding bắt buộc xử lý phân công đang hiệu lực trong cùng giao dịch, không thực hiện đóng ngầm tự động.
   - Phạm vi Phase 4 tập trung vào điều động đơn lẻ, bảng dữ liệu, Dashboard KPI và xuất Excel. Tạm hoãn xuất PDF, điều động hàng loạt, import Excel, phụ cấp lương và quy trình phê duyệt nhiều cấp.

---

## III. BẢNG TỔNG HỢP 16 TÀI LIỆU PHASE 4.0.3

| Mã tài liệu | Tên tài liệu | Trạng thái |
| :--- | :--- | :---: |
| `DOC-01` | [HR_PHASE_4_0_EXECUTIVE_SUMMARY.md](./HR_PHASE_4_0_EXECUTIVE_SUMMARY.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-02` | [HR_PHASE_4_CURRENT_STATE_AUDIT.md](./HR_PHASE_4_CURRENT_STATE_AUDIT.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-03` | [HR_PHASE_4_BUSINESS_REQUIREMENTS.md](./HR_PHASE_4_BUSINESS_REQUIREMENTS.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-04` | [HR_PHASE_4_DOMAIN_MODEL.md](./HR_PHASE_4_DOMAIN_MODEL.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-05` | [HR_PHASE_4_DATA_MODEL_AND_MIGRATION_PLAN.md](./HR_PHASE_4_DATA_MODEL_AND_MIGRATION_PLAN.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-06` | [HR_PHASE_4_EFFECTIVE_DATE_AND_ALLOCATION_POLICY.md](./HR_PHASE_4_EFFECTIVE_DATE_AND_ALLOCATION_POLICY.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-07` | [HR_PHASE_4_PERMISSION_AND_SCOPE_MATRIX.md](./HR_PHASE_4_PERMISSION_AND_SCOPE_MATRIX.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-08` | [HR_PHASE_4_SERVER_ACTION_CONTRACTS.md](./HR_PHASE_4_SERVER_ACTION_CONTRACTS.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-09` | [HR_PHASE_4_AUDIT_AND_SECURITY_POLICY.md](./HR_PHASE_4_AUDIT_AND_SECURITY_POLICY.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-10` | [HR_PHASE_4_UI_UX_SPECIFICATION.md](./HR_PHASE_4_UI_UX_SPECIFICATION.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-11` | [HR_PHASE_4_REPORTING_AND_KPI_SPEC.md](./HR_PHASE_4_REPORTING_AND_KPI_SPEC.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-12` | [HR_PHASE_4_TEST_STRATEGY.md](./HR_PHASE_4_TEST_STRATEGY.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-13` | [HR_PHASE_4_IMPLEMENTATION_ROADMAP.md](./HR_PHASE_4_IMPLEMENTATION_ROADMAP.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-14` | [HR_PHASE_4_OPEN_DECISIONS.md](./HR_PHASE_4_OPEN_DECISIONS.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-15` | [HR_PHASE_4_RISK_REGISTER.md](./HR_PHASE_4_RISK_REGISTER.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
| `DOC-16` | [HR_PHASE_4_1_ENTRY_GATE.md](./HR_PHASE_4_1_ENTRY_GATE.md) | **APPROVED — FROZEN FOR PHASE 4.1** |
