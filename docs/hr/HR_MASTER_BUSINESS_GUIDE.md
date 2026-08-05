# HR Master Business Guide — Hướng Dẫn Nghiệp Vụ Nhân Sự Doanh Nghiệp Xây Dựng

**Phiên bản:** 1.1.0  
**Tác giả:** Ban Kiến Trúc & Chuyên Gia Nghiệp Vụ HR ERP  
**Trạng thái Kiểm toán:** PARTIALLY VERIFIED  

---

## I. MỤC TIÊU VÀ TỔNG QUAN HỆ THỐNG HR CONSTRUCT-ERP

Hệ thống Quản lý Nhân sự (HR) thuộc Doanh nghiệp Xây dựng được thiết kế nhằm đáp ứng các đặc thù quản trị lao động trong ngành xây dựng. Lực lượng lao động bao gồm khối văn phòng tổng công ty và khối dự án công trường, từ cán bộ kỹ thuật cố định đến lao động thời vụ / khoán việc theo tiến độ công trình.

---

## II. 40 KHÁI NIỆM NGHIỆP VỤ CỐT LÕI

### 1. Tài Khoản Hệ Thống (User) — VERIFIED CURRENT
- **Định nghĩa:** Tài khoản định danh đăng nhập phần mềm, sở hữu email/username, mật khẩu và vai trò phân quyền.
- **Mục đích:** Xác thực và phân quyền truy cập hệ thống.
- **Ví dụ xây dựng:** Tài khoản `nguyenvana@congty.com` đăng nhập duyệt đề xuất vật tư.
- **Quan hệ:** Liên kết tùy chọn 1–1 với `Employee`.
- **Rủi ro thiết kế sai:** Nhầm lẫn giữa User và Employee dẫn đến xóa tài khoản đăng nhập gây hỏng lịch sử công tác.
- **Model chịu trách nhiệm:** `User`

### 2. Hồ Sơ Nhân Sự (Employee) — VERIFIED CURRENT
- **Định nghĩa:** Lý lịch con người làm việc cho doanh nghiệp, chứa giấy tờ cá nhân, quá trình làm việc và biến động lao động.
- **Mục đích:** Quản lý lịch sử lao động và pháp lý con người.
- **Ví dụ xây dựng:** Kỹ sư Nguyễn Văn A, Mã NV: `NV-2026-0042`, CCCD mã hóa.
- **Quan hệ:** Liên kết tùy chọn với `User`, liên kết với `OrganizationUnit`, `EmployeeProjectAssignment`.
- **Rủi ro thiết kế sai:** Coi Employee là User khiến công nhân hiện trường không có email không thể lưu hồ sơ.
- **Model chịu trách nhiệm:** `Employee`

### 3. Đơn Vị Tổ Chức (OrganizationUnit) — VERIFIED CURRENT
- **Định nghĩa:** Nút trong cây sơ đồ tổ chức của công ty (Ban giám đốc, Phòng ban văn phòng).
- **Mục đích:** Phân cấp hành chính và gom nhóm nhân sự chính.
- **Ví dụ xây dựng:** `Phòng Kỹ thuật - Công nghệ` trực thuộc `Khối Kỹ thuật`.
- **Quan hệ:** Phân cấp cây (parent-child), liên kết với `EmployeeOrganizationAssignment`.
- **Model chịu trách nhiệm:** `OrganizationUnit`

### 4. Chức Danh (Position) — VERIFIED CURRENT
- **Định nghĩa:** Vị trí công việc hành chính chính thức trong danh mục doanh nghiệp.
- **Mục đích:** Xác định cấp bậc hành chính (Level 1..10) và thang lương.
- **Ví dụ xây dựng:** `Trưởng phòng Kỹ thuật`, `Chuyên viên Kế toán`.
- **Model chịu trách nhiệm:** `Position`

### 5. Lịch Sử Công Tác Tại Phòng Ban — VERIFIED CURRENT
- **Định nghĩa:** Chuỗi bản ghi phân công phòng ban chính theo khoảng thời gian `[startDate, endDate)`.
- **Mục đích:** Theo dõi lịch sử điều chuyển hành chính và bổ nhiệm.
- **Model chịu trách nhiệm:** `EmployeeOrganizationAssignment`

### 6. Người Quản Lý Đơn Vị — VERIFIED CURRENT
- **Định nghĩa:** Cán bộ giữ vai trò lãnh đạo chính của đơn vị tổ chức trong một khoảng thời gian.
- **Model chịu trách nhiệm:** `OrganizationUnitManagerAssignment`

### 7. Phân Công Nhân Sự Công Trình — PARTIALLY VERIFIED
- **Định nghĩa:** Việc điều động nhân viên tham gia làm việc tại công trình xây dựng.
- **Model chịu trách nhiệm:** `EmployeeProjectAssignment`

### 8. Vai Trò Nhân Sự Tại Công Trình — VERIFIED CURRENT
- **Định nghĩa:** Vị trí chức năng chuyên môn của nhân viên tại công trường.
- **Ví dụ xây dựng:** `Chỉ huy trưởng`, `Chỉ huy phó`, `Kỹ sư QS`, `Cán bộ An toàn (HSE)`.
- **Model chịu trách nhiệm:** `ProjectPersonnelRole`

### 9. Hợp Đồng Lao Động — PROPOSED
- **Định nghĩa:** Thỏa thuận pháp lý về công việc, tiền lương và thời hạn.
- **Trạng thái:** Chưa triển khai schema/code (Dự kiến Phase 5).

### 10. Phụ Lục Hợp Đồng — PROPOSED
- **Định nghĩa:** Văn bản bổ sung hoặc thay đổi điều khoản hợp đồng.
- **Trạng thái:** Chưa triển khai schema/code (Dự kiến Phase 5).

### 11. Hồ Sơ, Giấy Tờ Nhân Sự — PROPOSED
- **Định nghĩa:** Danh mục file tài liệu số hóa cá nhân của nhân viên.
- **Trạng thái:** Chưa triển khai schema/code (Dự kiến Phase 5).

### 12. Chứng Chỉ Và Bằng Cấp — PROPOSED
- **Định nghĩa:** Bằng cấp chuyên môn và chứng chỉ hành nghề xây dựng.
- **Trạng thái:** Chưa triển khai schema/code (Dự kiến Phase 5).

### 13. Kỹ Năng Nghề Nghiệp — PROPOSED
- **Trạng thái:** Đề xuất cho các Phase sau.

### 14. Cảnh Báo Hết Hạn — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 5.

### 15. Chấm Công — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 6.

### 16. Ca Làm Việc — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 6.

### 17. Làm Thêm Giờ (Overtime) — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 6.

### 18. Nghỉ Phép — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 6.

### 19. Nghỉ Không Lương — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 6.

### 20. Công Tác Phí — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 7.

### 21. Lương Và Phụ Cấp — DEFERRED
- **Trạng thái:** Tạm hoãn đến khi có quy trình nghiệp vụ lương chính thức.

### 22. Tuyển Dụng — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 8.

### 23. Tiếp Nhận Nhân Sự Mới (Onboarding) — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 8.

### 24. Đào Tạo — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 8.

### 25. Đánh Giá Nhân Sự — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 9.

### 26. Khen Thưởng — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 9.

### 27. Kỷ Luật — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 9.

### 28. Nghỉ Việc (Offboarding) — VERIFIED CURRENT
- **Định nghĩa:** Quy trình ghi nhận nhân viên nghỉ việc, đóng các phân công active.
- **Model chịu trách nhiệm:** `Employee` (`status: RESIGNED`)

### 29. Bàn Giao Công Việc — PROPOSED
- **Trạng thái:** Đề xuất cho Phase 9.

### 30. Lưu Trữ Hồ Sơ (Archive) — VERIFIED CURRENT
- **Định nghĩa:** Chuyển hồ sơ vào kho lưu trữ quá khứ mà không xóa bản ghi.
- **Model chịu trách nhiệm:** `Employee`

### 31. Báo Cáo Nhân Sự — PARTIALLY VERIFIED
- **Định nghĩa:** Dashboard thống kê cơ bản nhân số theo trạng thái và phòng ban.

### 32. Nhật Ký Hệ Thống (System Log) — VERIFIED CURRENT
- **Model chịu trách nhiệm:** System Logger / Audit Engine.

### 33. Nhật Ký Biến Động Hồ Sơ (`EmployeeChangeHistory`) — VERIFIED CURRENT
- **Model chịu trách nhiệm:** `EmployeeChangeHistory`

### 34. Permission (Mã Quyền) — VERIFIED CURRENT
- **Model chịu trách nhiệm:** `HrPermissionDefinition`, `UserAccessGrant`

### 35. Data Scope (Phạm Vi Dữ Liệu) — VERIFIED CURRENT
- **Giá trị schema có:** `ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `OWN_PROJECTS`, `SELF_ONLY`, `NONE`.
- **Giá trị đề xuất:** `OWN_ORGANIZATION_TREE` (Hiện chưa có trong DB Enum).

### 36. Target Scope — VERIFIED CURRENT
- **Chịu trách nhiệm:** Guard `validateTargetScope` trong `hr-auth-guard.ts`.

### 37. Effective-date — VERIFIED CURRENT
- **Chịu trách nhiệm:** Helper `effective-date-helper.ts`.

### 38. Soft Delete — VERIFIED CURRENT
- **Chịu trách nhiệm:** Tất cả các model lịch sử và danh mục.

### 39. Audit Log — VERIFIED CURRENT
- **Model chịu trách nhiệm:** `AuditLog` và `audit-sanitizer.ts`.

### 40. Dữ Liệu Nhạy Cảm Cá Nhân (PII) — VERIFIED CURRENT
- **Chịu trách nhiệm:** `pii-encryption.ts` & Sensitive Field Policy.
