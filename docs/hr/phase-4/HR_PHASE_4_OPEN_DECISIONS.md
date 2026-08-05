# HR PHASE 4 — NHẬT KÝ CÁC QUYẾT ĐỊNH THIẾT KẾ VÀ VẤN ĐỀ MỞ (OPEN DECISIONS LOG)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. NHẬT KÝ CÁC QUYẾT ĐỊNH KIẾN TRÚC ĐÃ ĐƯỢC CHỦ DỰ ÁN PHÊ DUYỆT (ADR & DECISIONS)

### ADR-01: Không tự động tạo `ProjectMember` khi điều động nhân sự (DEC-04)
- **Bối cảnh:** Ý kiến đề xuất tự động chèn `ProjectMember` khi phân công nhân sự tới công trình.
- **Quyết định chính thức:** **BÁC BỎ TỰ ĐỘNG TẠO.**
- **Lý do:** Nhân sự công trường (như công nhân, thợ chính, thủ kho) có thể không thao tác trên phần mềm ERP. Việc tự động tạo `ProjectMember` gây vi phạm nguyên tắc Least Privilege, gia tăng rủi ro IDOR và mở rộng quyền truy cập phần mềm không cần thiết.

### ADR-02: Cơ chế PostgreSQL Advisory Lock đồng thời (DEC-02)
- **Bối cảnh:** Khi 2 người dùng điều động cùng 1 nhân sự đồng thời, race condition có thể làm lọt bản ghi vượt 100% allocation.
- **Quyết định chính thức:** Áp dụng `SET LOCAL lock_timeout = '5s'; SELECT pg_advisory_xact_lock(hashtextextended(employeeId, 0))` trong Prisma transaction với tối đa 3 lần retry exponential backoff cho các lỗi `55P03`, `40001`, `40P01`.
- **Lý do:** Đảm bảo an toàn giao dịch đồng thời khi toàn bộ mutation điều động tuân thủ cùng một locking protocol.

### ADR-03: Bảo toàn lịch sử biến động (Immutability Policy - DEC-06)
- **Bối cảnh:** Việc sửa trực tiếp vai trò hoặc tỷ lệ phân bổ trên bản ghi đang hoạt động làm mất vết lịch sử lao động.
- **Quyết định chính thức:** Khi đổi vai trò hoặc tỷ lệ %, kết thúc bản ghi cũ tại ngày $D$ (`endDate = D`, `status = RELEASED`, `endReason = ROLE_TRANSFER` hoặc `ALLOCATION_CHANGE`), mở bản ghi mới từ ngày $D$ (`startDate = D`).

---

## II. MA TRẬN 20 QUYẾT ĐỊNH ĐÃ ĐƯỢC CHỦ DỰ ÁN PHÊ DUYỆT (DECISIONS MATRIX)

| Mã | Chủ đề | Nội dung quyết định đã duyệt | Mức độ | Người phê duyệt | Trạng thái |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `OD-01` | Composite Indexes | **Bắt buộc tạo Additive Migration** trong Sub-phase 4.1 cho `@@index([employeeId, status, startDate])` và `@@index([projectId, status, startDate])` (DEC-07) | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-02` | Dự án tiếp nhận | Chỉ cho phép công trình ở trạng thái `ACTIVE` và `PLANNING` tiếp nhận nhân sự | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-03` | Project Staffing Scope | Phân tách `ProjectReadScope` và `ProjectStaffingScope` (DEC-04). Thao tác điều động kiểm tra độc lập `EmployeeTargetScope` và `ProjectStaffingScope` | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-04` | Multi-role cùng dự án | Cho phép nhân sự đảm nhận 2 vai trò tại 1 dự án nếu tổng % phân bổ trong khoảng thời gian <= 100% | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-05` | Phân bổ số thập phân | Tỷ lệ phân bổ thời gian chỉ hỗ trợ số nguyên từ 1% đến 100% | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-06` | Công thức `effectiveEnd` | Phân công đã bắt đầu: `endDate ?? Infinity`. Phân công chưa bắt đầu: `endDate ?? expectedEndDate ?? Infinity` (DEC-01) | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-07` | Cơ chế trạng thái tương lai | Status CSDL = `ACTIVE`, UI suy ra nhãn "Kế hoạch" từ `startDate > now()` (DEC-01) | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-08` | Điều động hồi tố | Cho phép Quản lý Nhân sự tạo điều động có `startDate < today` kèm lý do giải trình bắt buộc | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-09` | Phân quyền Override | Chỉ các tài khoản vai trò `ADMIN` và `DIRECTOR` mới có quyền `hr:project_allocation:override` | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-10` | Số quyết định | Trường `assignmentDecisionNo` là trường tùy chọn (Optional String) | Low | Chủ dự án | **APPROVED — CLOSED** |
| `OD-11` | Sửa phân công chưa chạy | Cho phép sửa hành chính trực tiếp phân công chưa bắt đầu (`startDate > today`) | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-12` | Luồng phê duyệt yêu cầu | Workflow trình duyệt yêu cầu điều động nhiều cấp: **Tạm hoãn (DEC-10)** | Low | Chủ dự án | **APPROVED — DEFERRED** |
| `OD-13` | Điều động hàng loạt | Tính năng Bulk Assignment: **Tạm hoãn (DEC-10)** | Low | Chủ dự án | **APPROVED — DEFERRED** |
| `OD-14` | Import Excel | Nhập danh sách điều động từ Excel: **Tạm hoãn (DEC-10)** | Low | Chủ dự án | **APPROVED — DEFERRED** |
| `OD-15` | Export Báo cáo | Xuất Excel (.xlsx) không chứa PII (DEC-08). Xuất PDF **Tạm hoãn (DEC-10)** | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-16` | Múi giờ & Chuẩn ngày | Định dạng ISO Date-Only `YYYY-MM-DD` theo múi giờ `Asia/Ho_Chi_Minh` qua helper `parseVietnamDateOnly` (DEC-03) | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-17` | Vai trò công trường | Danh mục vai trò chủ chốt: `SITE_COMMANDER` và `HSE_OFFICER` | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-18` | Xử lý khi NV nghỉ việc | Khi `Employee.status = RESIGNED`, Offboarding bắt buộc xử lý đóng các phân công hiệu lực trong cùng giao dịch (DEC-09) | High | Chủ dự án | **APPROVED — CLOSED** |
| `OD-19` | Xử lý dữ liệu quá khứ | Đánh dấu cảnh báo trên UI đối với bản ghi bị vượt % từ quá khứ, không chặn dữ liệu quá khứ | Medium | Chủ dự án | **APPROVED — CLOSED** |
| `OD-20` | Tích hợp Phụ cấp Lương | Chuyển tiếp dữ liệu tính phụ cấp công trường sang Phase 5: **Tạm hoãn (DEC-10)** | Low | Chủ dự án | **APPROVED — DEFERRED** |
