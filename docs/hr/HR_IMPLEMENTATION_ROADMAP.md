# HR Implementation Roadmap — Lộ Trình Triển Khai Phân Hệ HR (Phase 0 đến Phase 10)

**Phiên bản:** 1.0.0  
**Tác giả:** Ban Quản Lý Dự Án ERP  
**Trạng thái:** Chính thức  

---

## I. TỔNG QUAN LỘ TRÌNH LẦN LƯỢT 11 GIAI ĐOẠN

Phân hệ Quản lý Nhân sự được triển khai tuần tự theo 11 Phase (Phase 0 đến Phase 10). **Tuyệt đối không triển khai tất cả trong một lần thay đổi lớn.** Mỗi Phase có phạm vi riêng và một **Release Gate** bắt buộc để quyết định **GO / NO-GO**.

---

## II. CHI TIẾT CÁC GIAI ĐOẠN (PHASE 0 - 10)

### PHASE 0 — Khảo Sát & Khóa Kiến Trúc Master (Đang thực hiện)
- **Mục tiêu:** Kiểm kê repository, database, RBAC, User/Employee, file storage, audit, lập bộ tài liệu master. Không viết code chức năng mới.
- **Release Gate:** Master docs sẵn sàng, baseline clean, Prisma schema valid.

### PHASE 1 — Nền Tảng HR Core & Bảo Mật PII (Đã hoàn thành & GO)
- **Mục tiêu:** Dựng `Employee`, User-Employee 1-1 optional, PII encryption AES-256-GCM, Audit sanitizer, Mã nhân viên tự động.

### PHASE 2 — Hồ Sơ Nhân Viên (Đã hoàn thành & GO)
- **Mục tiêu:** Danh sách nhân viên, bộ lọc, tạo/sửa hồ sơ, chi tiết nhân viên, liên kết User, nghỉ việc, lịch sử biến động.

### PHASE 3 — Cơ Cấu Tổ Chức & Phòng Ban (Đã hoàn thành & GO)
- **Mục tiêu:** Cây đơn vị tổ chức, danh mục chức danh, phân công phòng ban, bổ nhiệm/mãn nhiệm quản lý đơn vị, sơ đồ tổ chức.

### PHASE 4 — Điều Động Nhân Sự Công Trình (Giai đoạn tiếp theo)
- **Phạm vi:**
  - Danh mục Vai trò công trình (`ProjectPersonnelRole`).
  - Phân công điều động công trình (`EmployeeProjectAssignment`).
  - Tỷ lệ phân bổ thời gian (%), cảnh báo trùng thời gian, cảnh báo vượt 100%.
  - Scope kiểm soát dữ liệu theo công trình (`OWN_PROJECTS`).
- **Release Gate Criteria:** 100% Vitest & E2E Mutation tests PASS trên QA database.

### PHASE 5 — Hợp Đồng Lao Động, Tài Liệu & Chứng Chỉ
- **Phạm vi:** Hợp đồng thử việc, xác định thời hạn, không xác định thời hạn, phụ lục hợp đồng, chứng chỉ hành nghề, cảnh báo hết hạn, private file storage.

### PHASE 6 — Chấm Công, Nghỉ Phép & Làm Thêm Giờ
- **Phạm vi:** Ca làm việc, chấm công văn phòng/công trường, điều chỉnh chấm công, đăng ký nghỉ phép, overtime, quy trình phê duyệt.

### PHASE 7 — Lương & Phụ Cấp (Tính Lương Doanh Nghiệp Xây Dựng)
- **Phạm vi:** Kỳ lương, thành phần lương, phụ cấp công trình, tạm ứng, thu nhập theo dự án. Chỉ triển khai khi quy trình nghiệp vụ lương được duyệt.

### PHASE 8 — Tuyển Dụng, Tiếp Nhận & Đào Tạo
- **Phạm vi:** Nhu cầu tuyển dụng, hồ sơ ứng viên, phỏng vấn, mời nhận việc, checklist tiếp nhận, khóa đào tạo an toàn.

### PHASE 9 — Đánh Giá, Khen Thưởng, Kỷ Luật & Nghỉ Việc
- **Phạm vi:** KPI/OKR công trình, quyết định khen thưởng, xử lý kỷ luật an toàn, quy trình bàn giao tài sản/công việc khi nghỉ việc.

### PHASE 10 — Báo Báo Nâng Cao, Mobile Integrity & Hardening
- **Phạm vi:** Dashboard tổng hợp toàn diện, báo cáo chi phí nhân sự dự án, tối ưu responsive mobile, hardening cuối cùng.
