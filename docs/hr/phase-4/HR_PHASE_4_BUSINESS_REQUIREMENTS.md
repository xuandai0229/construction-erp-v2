# HR PHASE 4 — YÊU CẦU NGHIỆP VỤ ĐIỀU ĐỘNG NHÂN SỰ CÔNG TRÌNH (BUSINESS REQUIREMENTS)

- **Phiên bản:** 1.0.3
- **Trạng thái:** APPROVED — FROZEN FOR PHASE 4.1
- **Mã nguồn khảo sát (Surveyed Source SHA):** `8c1e1c89084a27eccacc3bc5fdf12aa3af160925`
- **Người phê duyệt:** Chủ dự án

---

## I. MỤC TIÊU PHẠM VI BẮT BUỘC VÀ TẠM HOÃN (SCOPE DEFINITION - DEC-10)

### 1. Phạm vi Bắt buộc triển khai trong HR Phase 4:
- **Nghiệp vụ Điều động Đơn lẻ:** Tạo mới điều động, chỉnh sửa hành chính trước ngày bắt đầu, gia hạn ngày dự kiến, thay đổi vai trò hoặc tỷ lệ phân bổ có bảo toàn lịch sử, rút nhân sự công trình và hủy điều động chưa bắt đầu.
- **Xác thực Phân quyền 2 Chiều (DEC-04):** Kiểm tra độc lập phạm vi nhân viên (`EmployeeTargetScope`) và phạm vi công trình (`ProjectStaffingScope`).
- **Kiểm soát Tỷ lệ Phân bổ (DEC-01):** Thuật toán Sweep-Line kiểm tra giao thoa khoảng thời gian và phê duyệt ngoại lệ Override có lý do giải trình.
- **Giao diện & Báo cáo (DEC-08):** Trang trung tâm quản lý điều động, Dashboard KPI metrics và Xuất Báo cáo danh sách nhân sự công trình ra Excel (`.xlsx`) không chứa thông tin PII nhạy cảm.

### 2. Phạm vi Tạm hoãn (Deferred Scope):
- **Xuất báo cáo PDF:** Tạm hoãn.
- **Điều động hàng loạt (Bulk Assignment):** Tạm hoãn.
- **Import danh sách điều động từ Excel:** Tạm hoãn.
- **Quy trình phê duyệt yêu cầu rút nhân sự nhiều cấp:** Tạm hoãn (DEC-05).
- **Tích hợp Phụ cấp Lương (Payroll Allowance):** Tạm hoãn sang Phase 5.
- **Tích hợp Nhật ký Thi công:** Tạm hoãn.

---

## II. DANH SÁCH USE CASE BẮT BUỘC (20 USE CASES)

### UC-01: Xem danh sách điều động toàn công ty
- **Actor:** Trưởng phòng Nhân sự, Ban Giám đốc (`ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`).
- **Nội dung:** Xem và lọc danh sách điều động nhân sự theo công trình, phòng ban nguồn, vai trò công trường và khoảng thời gian.

### UC-02: Xem nhân lực của một công trình cụ thể
- **Actor:** Quản lý dự án, Chỉ huy trưởng (`ProjectStaffingScope` hoặc `ProjectMember` đang hiệu lực).
- **Nội dung:** Danh sách toàn bộ nhân sự đang cắm tại dự án, vai trò công trường, ngày bắt đầu và tỷ lệ phân bổ thời gian.

### UC-03: Xem lịch sử điều động công trình của một nhân viên
- **Actor:** Trưởng phòng chuyên môn, Chính nhân viên (Self-service), Quản lý Nhân sự.
- **Nội dung:** Timeline chi tiết các công trình nhân viên đã và đang tham gia từ trước đến nay.

### UC-04: Tạo điều động nhân sự mới đến công trình
- **Actor:** Chuyên viên Điều động HR, Trưởng phòng Nhân sự.
- **Ràng buộc:** Kiểm tra giao thoa thời gian và tổng tỷ lệ phân bổ của nhân viên không vượt quá 100%.

### UC-05: Lập kế hoạch điều động trong tương lai (Planned Assignment)
- **Actor:** Chuyên viên Điều động HR.
- **Nội dung:** Đăng ký điều động có `startDate > now()`. Trạng thái lưu CSDL là `ACTIVE` với `startDate` tương lai, giao diện hiển thị nhãn "Kế hoạch".

### UC-06: Điều động bổ sung vai trò mới tại công trình đang tham gia
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Đảm nhận thêm vai trò thứ hai tại cùng dự án. Kiểm tra tổng phân bổ trong khoảng thời gian không vượt quá 100%.

### UC-07: Thay đổi vai trò công trường (Role Transfer - Historical Mutation)
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Kết thúc hiệu lực bản ghi vai trò cũ tại ngày $D$ (`endDate = D`, `status = RELEASED`, `endReason = ROLE_TRANSFER`), tạo bản ghi mới từ ngày $D$ (`startDate = D`) với vai trò mới.

### UC-08: Điều chỉnh tỷ lệ phân bổ (Allocation Change - Historical Mutation)
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Khi thay đổi % phân bổ của phân công đang hiệu lực, đóng bản ghi cũ tại ngày $D$ (`endDate = D`, `status = RELEASED`, `endReason = ALLOCATION_CHANGE`) và tạo bản ghi mới từ ngày $D$ với tỷ lệ % mới.

### UC-09: Gia hạn thời gian điều động dự kiến (Extension)
- **Actor:** Quản lý Nhân sự phê duyệt.
- **Nội dung:** Cập nhật trường `expectedEndDate` gia hạn thêm thời gian làm việc tại dự án, ghi Audit Event `PROJECT_ASSIGNMENT_EXTENDED`. Trạng thái giữ nguyên `ACTIVE`.

### UC-10: Kết thúc điều động đúng hạn (Natural Completion)
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Cập nhật `endDate = expectedEndDate`, chuyển trạng thái `COMPLETED` và `endReason = COMPLETED`.

### UC-11: Rút nhân sự / Kết thúc điều động sớm (Early Release)
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Cập nhật `endDate = releaseDate`, chuyển trạng thái `RELEASED` và `endReason = EARLY_RELEASE`, bắt buộc nhập lý do rút nhân sự.

### UC-12: Hủy bỏ quyết định điều động chưa bắt đầu (Cancel Assignment)
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Chuyển trạng thái bản ghi phân công tương lai sang `CANCELLED`.

### UC-13: Điều chuyển nhân sự trực tiếp từ Công trình A sang Công trình B
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Đóng phân công tại Công trình A vào ngày $D$ (`endReason = PROJECT_TRANSFER`), mở phân công mới tại Công trình B bắt đầu từ ngày $D$.

### UC-14: Một nhân viên tham gia song song nhiều công trình
- **Actor:** Quản lý Nhân sự.
- **Nội dung:** Ví dụ 50% thời gian tại Dự án A, 50% thời gian tại Dự án B. Tổng phân bổ thời gian = 100%.

### UC-15: Phát hiện và Cảnh báo vượt 100% tỷ lệ phân bổ
- **Actor:** Hệ thống tự động (Allocation Engine).
- **Nội dung:** Khi tạo/chuyển điều động làm tổng % phân bổ vượt 100%, hiển thị hộp thoại cảnh báo chi tiết các khoảng giao thoa và công trình xung đột.

### UC-16: Phê duyệt ngoại lệ vượt tỷ lệ phân bổ (Allocation Override)
- **Actor:** Trưởng phòng Nhân sự / Ban Giám đốc (có quyền `hr:project_allocation:override`).
- **Nội dung:** Phê duyệt cho phép lưu phân công vượt 100% trong giai đoạn cao điểm. Bắt buộc nhập `overrideReason` và lưu Audit Log.

### UC-17: Tra cứu danh sách nhân viên chưa có điều động công trình (Unassigned Pool)
- **Actor:** Quản lý Nhân sự / Trưởng phòng Kỹ thuật.
- **Nội dung:** Danh sách nhân viên đang hiệu lực thuộc khối công trình hiện chưa có phân công dự án nào (0 assignments).

### UC-18: Tra cứu danh sách nhân viên còn dung lượng phân bổ (Available Capacity Pool)
- **Actor:** Quản lý Nhân sự / Trưởng phòng Kỹ thuật.
- **Nội dung:** Danh sách nhân viên đang có phân công hiệu lực nhưng tổng tỷ lệ phân bổ < 100%.

### UC-19: Cảnh báo danh sách nhân sự sắp hết hạn điều động (Expiring Staffing Alert)
- **Actor:** Quản lý Nhân sự / Chỉ huy trưởng.
- **Nội dung:** Danh sách nhân sự có `expectedEndDate` trong vòng 14/30 ngày tới để chủ động lập kế hoạch gia hạn hoặc rút về.

### UC-20: Xuất báo cáo danh sách nhân sự công trình ra Excel
- **Actor:** Quản lý Nhân sự / Quản lý Dự án.
- **Nội dung:** Xuất dữ liệu điều động nhân sự theo công trình ra file Excel (.xlsx) không chứa thông tin PII nhạy cảm.
