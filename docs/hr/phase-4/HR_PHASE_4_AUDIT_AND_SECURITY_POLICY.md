# HR PHASE 4 — BẢO MẬT DỮ LIỆU VÀ CHÍNH SÁCH KIỂM TOÁN VẾT LỊCH SỬ (AUDIT & SECURITY POLICY)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. CHÍNH SÁCH KIỂM TOÁN THAY ĐỔI VÀ ĐẦY ĐỦ THÔNG TIN LỊCH SỬ

Mọi biến động điều động nhân sự dự án phải được ghi nhận đồng thời vào 2 hệ thống nhật ký:

1. **Bảng Lịch sử Nghiệp vụ Nhân sự (`EmployeeChangeHistory`):**
   - Phục vụ tra cứu quá trình làm việc của người lao động trên giao diện UI HR.
   - `changeType`: `EMPLOYEE_PROJECT_ASSIGNED` hoặc `EMPLOYEE_PROJECT_RELEASED`.
   - `details`: Lưu thông tin `projectId`, `roleId`, `allocationPercentage`, `decisionNo`, `status` và `endReason`.

2. **Bảng Nhật ký Kiểm toán Hệ thống (`AuditLog`):**
   - Phục vụ truy vết an ninh và tuân thủ pháp lý IT.
   - `entityType`: `EmployeeProjectAssignment`.
   - `action`: `CREATE_ASSIGNMENT`, `TRANSFER_ROLE`, `EXTEND_ASSIGNMENT`, `RELEASE_ASSIGNMENT`, `OVERRIDE_ALLOCATION`.
   - `beforeData` / `afterData`: Lưu snapshot JSON trước và sau biến động (bao gồm cả `status` và `endReason`).
   - `ipAddress`, `userAgent`: Ghi nhận nhật ký thiết bị kết nối.

---

## II. CHÍNH SÁCH BẢO VỆ PII VÀ XUẤT BÁO CÁO (DEC-08)

1. **Ranh giới Payload Assignment DTO:**
   Dữ liệu trả về từ các Server Actions điều động công trình (`getProjectAssignmentsQuery`, `assignEmployeeToProjectAction`) và file Excel xuất ra **tuyệt đối không chứa bất kỳ trường thông tin cá nhân nhạy cảm PII nào**:
   - Số CMND / CCCD
   - Số tài khoản ngân hàng
   - Mức lương / Thu nhập
   - Địa chỉ thường trú
   - Email cá nhân
   - Các chuỗi mã hóa Ciphertext, Blind index, Vector IV, Auth tag hoặc Khóa mã hóa.

2. **Áp dụng đồng nhất:**
   Quy tắc cách ly PII áp dụng cho toàn bộ người dùng, kể cả trường hợp tài khoản có quyền xem thông tin nhạy cảm. Thông tin PII chỉ được phép xem tại màn hình Hồ sơ Nhân sự riêng biệt với kiểm tra quyền và nhật ký kiểm toán độc lập.

---

## III. QUY TRÌNH NGHỈ VIỆC VÀ KHÓA ĐỒNG THỜI (DEC-02 & DEC-09)

1. **Xử lý Phân công khi Nhân viên Nghỉ việc (DEC-09):**
   - Khi nhân viên có trạng thái `Employee.status = RESIGNED`, hệ thống không tự động âm thầm đóng các phân công dự án.
   - Quy trình Offboarding kiểm tra các phân công đang hiệu lực. Việc hoàn tất thủ tục nghỉ việc bắt buộc xử lý các phân công trước đó hoặc đóng phân công trong cùng một giao dịch CSDL với lý do, tài khoản thực hiện và nhật ký kiểm toán đầy đủ.
   - Giao dịch Offboarding và điều động sử dụng chung protocol khóa nhân viên để đảm bảo an toàn dữ liệu.

2. **Chính sách Khóa Đồng thời PostgreSQL (DEC-02):**
   ```sql
   SET LOCAL lock_timeout = '5s';
   SELECT pg_advisory_xact_lock(hashtextextended(${employeeId}, 0));
   ```
   Toàn bộ mutation điều động nhân sự thực thi trong cùng Prisma transaction với cơ chế thử lại tối đa 3 lần cho các lỗi khóa `55P03`, `40001`, `40P01`.
