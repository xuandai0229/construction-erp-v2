# HR Workflow Catalog — Danh Mục Quy Trình Nghiệp Vụ Nhân Sự Doanh Nghiệp Xây Dựng

**Phiên bản:** 1.0.0  
**Tác giả:** Chuyên Gia Phân Tích Nghiệp Vụ ERP  
**Trạng thái:** Chính thức  

---

## I. MỤC TIÊU VÀ CÁC QUY TRÌNH NGHIỆP VỤ TRỌNG YẾU

Tài liệu này chuẩn hóa toàn bộ các quy trình thao tác nghiệp vụ nhân sự thực tế trong doanh nghiệp xây dựng, làm căn cứ cho việc phát triển giao diện, API và kiểm thử E2E.

---

## II. CHI TIẾT 10 QUY TRÌNH NGHIỆP VỤ CỐT LÕI

### Quy Trình 1: Tiếp Nhận & Khởi Tạo Hồ Sơ Nhân Sự Mới
1. **Bước 1:** Chuyên viên HR vào Workspace HR -> Tab "Hồ sơ nhân viên" -> Bấm "Thêm nhân viên".
2. **Bước 2:** Nhập các thông tin cơ bản: Họ tên, Ngày sinh, Giới tính, Số điện thoại, Email cá nhân, Ngày vào công ty.
3. **Bước 3:** Nhập Số CCCD (Hệ thống mã hóa AES-256-GCM ở backend và kiểm tra trùng qua Blind Index).
4. **Bước 4:** Chọn Phòng ban phân công ban đầu và Chức danh hành chính.
5. **Bước 5:** Bấm "Lưu hồ sơ". Backend sinh tự động Mã nhân viên `NV-YYYY-NNNN` và ghi nhận lịch sử `EMPLOYEE_CREATED`.

### Quy Trình 2: Điều Chuyển Phòng Ban / Bổ Nhiệm Chức Danh
1. **Bước 1:** Chọn Nhân viên từ danh sách -> Bấm "Điều chuyển / Bổ nhiệm".
2. **Bước 2:** Chọn Phòng ban mới, Chức danh mới, Số quyết định và Ngày hiệu lực (D).
3. **Bước 3:** Backend thực hiện Transaction: Đóng phân công cũ (`endDate = D`), tạo phân công mới (`startDate = D`, `endDate = null`).
4. **Bước 4:** Ghi nhận `EMPLOYEE_ORGANIZATION_TRANSFERRED` vào `EmployeeChangeHistory`.

### Quy Trình 3: Điều Động Nhân Sự Sang Công Trình Xây Dựng
1. **Bước 1:** Vào Tab "Điều động công trình" -> Bấm "Phân công công trình".
2. **Bước 2:** Chọn Nhân viên, Chọn Dự án/Công trình target, Chọn Vai trò hiện trường (Chỉ huy phó, Kỹ sư QS...), Ngày bắt đầu, Tỷ lệ phân bổ thời gian (%).
3. **Bước 3:** Kiểm tra cảnh báo trùng lịch hoặc tổng tỷ lệ phân bổ vượt 100%. Nối quyền override nếu được cho phép.
4. **Bước 4:** Lưu bản ghi `EmployeeProjectAssignment` (`status: ACTIVE`).

### Quy Trình 4: Rút Nhân Sự Khỏi Công Trình
1. **Bước 1:** Chọn bản ghi phân công dự án đang `ACTIVE` -> Bấm "Rút khỏi công trình".
2. **Bước 2:** Nhập Ngày kết thúc thực tế và Lý do hoàn thành.
3. **Bước 3:** Cập nhật trạng thái thành `RELEASED` / `COMPLETED` và đóng `endDate`.

### Quy Trình 5: Ký Hợp Đồng Lao Động & Phụ Lục
1. **Bước 1:** Chọn Nhân viên -> Tab "Hợp đồng" -> Bấm "Tạo hợp đồng".
2. **Bước 2:** Chọn Loại hợp đồng (Thử việc, Xác định thời hạn, Không xác định thời hạn), Số HĐ, Ngày ký, Ngày bắt đầu, Ngày kết thúc, Mức lương.
3. **Bước 3:** Tải file HĐ scan (Lưu dạng Private Object).
4. **Bước 4:** Khi có điều chỉnh lương hoặc thời hạn -> Bấm "Tạo Phụ Lục HĐ".

### Quy Trình 6: Quản Lý & Cảnh Báo Chứng Chỉ Hành Nghề
1. **Bước 1:** Nhập thông tin chứng chỉ: Loại chứng chỉ, Số chứng chỉ, Nơi cấp, Ngày cấp, Ngày hết hạn, Upload file chứng minh.
2. **Bước 2:** Hệ thống tự động kiểm tra định kỳ: Phát cảnh báo trước 30/60/90 ngày nếu chứng chỉ sắp hết hạn.
3. **Bước 3:** Hiển thị danh sách cảnh báo tại Dashboard HR.

### Quy Trình 7: Phân Quyền HR Cho Người Dùng (Access Grant)
1. **Bước 1:** Chuyên viên HR Admin vào Tab "Phân quyền HR".
2. **Bước 2:** Chọn User target -> Chọn Permission Code (`hr:employee:read`...) -> Chọn Data Scope (`OWN_ORGANIZATION_UNIT`...).
3. **Bước 3:** Nhập Lý do cấp quyền và Ngày hiệu lực -> Bấm "Cấp quyền".

### Quy Trình 8: Liên Kết Tài Khoản User & Employee
1. **Bước 1:** Chọn Hồ sơ Employee chưa có tài khoản -> Bấm "Liên kết tài khoản".
2. **Bước 2:** Chọn Tài khoản User target từ danh sách (chưa liên kết với Employee khác).
3. **Bước 3:** Backend kiểm tra 1-1 invariant và lưu `userId` vào Employee.

### Quy Trình 9: Ghi Nhận Nghỉ Việc & Lưu Trữ Hồ Sơ
1. **Bước 1:** Chọn Nhân viên -> Bấm "Ghi nhận nghỉ việc".
2. **Bước 2:** Nhập Ngày nghỉ việc, Lý do nghỉ việc, Số quyết định nghỉ việc.
3. **Bước 3:** Backend tự động: Đóng tất cả phân công phòng ban và công trình đang active (`endDate = resignedDate`), chuyển `status = RESIGNED`.
4. **Bước 4:** Giữ nguyên toàn bộ lịch sử lao động và hợp đồng (Không xóa bản ghi).

### Quy Trình 10: Xử Lý Sự Cố Bất Thường & Phục Hồi Dữ Liệu
1. **Bước 1:** Khi phát hiện nhầm lẫn trong điều chuyển, HR có quyền sửa thông tin sai sót hoặc hủy bỏ quyết định.
2. **Bước 2:** Mọi thao tác sửa/hủy đều ghi lại Audit Log để đối soát trách nhiệm.
