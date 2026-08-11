# BÁO CÁO NGHIỆM THU ỔN ĐỊNH HỆ THỐNG ĐỀ XUẤT VẬT TƯ V2 (MATERIAL PROPOSAL V2)

**Dự án:** construction-erp-v2  
**Mô-đun:** Đề xuất vật tư V2  
**Trạng thái nghiệm thu:** **PASSED (HOÀN THÀNH 100%)**  
**Thời gian kiểm tra:** 11/08/2026  

---

## 1. TỔNG QUAN KẾT QUẢ THỰC HIỆN

Tất cả các tồn đọng và lỗi kỹ thuật thuộc phân hệ **Đề xuất vật tư V2** đã được xử lý triệt để và kiểm tra toàn diện trên môi trường runtime. Phân hệ đã hoàn toàn ổn định, hoạt động độc lập với kho/tồn kho và đáp ứng đầy đủ yêu cầu nghiệp vụ quản lý thi công công trình.

---

## 2. KẾT QUẢ NGHỆM THU THEO TỪNG HẠNG MỤC (GATE CHECKS)

### Gate 1: Cơ sở dữ liệu & Migration Schema
- **Thực thi Migration:** 
  - `20260810180000_remove_legacy_material_request`: Đã dọn dẹp hoàn toàn bảng legacy (`MaterialRequest`, `MaterialRequestItem`) an toàn bằng `CASCADE`.
  - `20260810190000_material_proposal_v2`: Đã apply thành công trên cả hai cơ sở dữ liệu **DEV** (`construction_erp_v2_dev`) và **QA** (`construction_erp_v2_qa`).
- **Chỉ mục Partial Index:** Đã xác nhận partial unique index trên `MaterialProposalApproval` cho trạng thái `PENDING` hoạt động đúng để ngăn ngừa phê duyệt trùng lặp.

### Gate 2: Giao diện UI/UX & Tự động điền dữ liệu (Auto-fill)
- **Header thông tin đề xuất:**
  - `Công trình`: Tự động nhận diện theo ngữ cảnh hoặc cho phép chọn (với cấp quản lý).
  - `Địa điểm`: Tự động điền (snapshot từ `Project.location`).
  - `Người đề nghị`: Tự động lấy từ phiên làm việc (`User.name`).
  - `Chức danh / Vai trò`: Tự động điền chuẩn hóa theo vai trò công trình/hệ thống (Chỉ huy trưởng, Phó chỉ huy, Kỹ sư, Quản trị viên...).
  - `Ngày đề nghị`: Tự động lấy ngày hiện tại.
  - `Ngày cấp về công trình` & `Lý do mua hàng`: Cho phép nhập/chỉnh sửa với thông báo lỗi rõ ràng nếu bỏ trống.

### Gate 3: Chọn vật tư Trong Catalog / Ngoài Catalog & Phân nhóm (Sections)
- **Loại vật tư:**
  - **Trong danh mục (Catalog):** Hiển thị Combobox tìm kiếm danh mục vật tư công trình. Tự động điền Tên, Đơn vị tính, Quy cách.
  - **Ngoài danh mục (Outside Catalog):** Cho phép nhập tự do. Khi phê duyệt **KHÔNG** tự động chèn vào bảng danh mục `MaterialItem` gây ô nhiễm dữ liệu.
- **Phân nhóm vật tư (Sections):**
  - Hỗ trợ thêm nhóm / phần (ví dụ: `PHẦN ĐIỆN NHẸ`).
  - Hiển thị thanh nhóm trực quan, hỗ trợ sửa tên nhóm trực tiếp.
  - Đánh số thứ tự (STT) liên tục 1, 2, 3... cho các dòng vật tư chính.

### Gate 4: Luồng Phê duyệt 2 Bước & Phân quyền RBAC
- **Tiến trình phê duyệt:**
  - `Bước 1 (Kỹ thuật)`: Duyệt bởi cán bộ được ủy quyền kỹ thuật tại công trình.
  - `Bước 2 (Ban Giám đốc)`: Duyệt bởi Phó Giám đốc (`DEPUTY_DIRECTOR`) hoặc Giám đốc (`DIRECTOR`).
- **Quy tắc Admin Non-signer:** Admin hệ thống không tự động thay thế người ký nghiệp vụ nếu không được phân công hoặc cấp quyền trực tiếp.
- **Tính chống trùng lặp (Idempotency):** Áp dụng `idempotencyKey` ngăn ngừa bấm đúp hoặc gửi trùng lặp yêu cầu phê duyệt.

### Gate 5: Cách ly hoàn toàn với Hệ thống Tồn kho (Inventory Isolation)
- **Xác minh nghiệp vụ:** Việc phê duyệt đề xuất vật tư (`APPROVED`) chỉ thay đổi trạng thái đề xuất thành "Đã duyệt chính thức".
- **Không biến động kho:** **KHÔNG** tác động đến bảng `ProjectMaterialStock` và **KHÔNG** tạo thẻ kho `MaterialMovement`.

### Gate 6: Xuất file Excel (Golden Template Snapshot)
- **Template Excel:** Sử dụng mẫu chuẩn `material-proposal-golden.xlsx`.
- **Dữ liệu động:** Đã kiểm tra runtime export qua API `/materials/proposals/[id]/export`. File sinh ra chứa đầy đủ snapshot công trình, địa điểm, người đề nghị, các nhóm vật tư và danh sách dòng vật tư chuẩn xác.

### Gate 7: Không lỗi Hydration & React Console Warnings
- **Cấu trúc DOM:** Đã sửa dọn dẹp các ký tự khoảng trắng thừa trong bảng `<table>`, `<thead>`, `<tbody>`.
- **React Hydration:** Không phát sinh bất kỳ thông báo lỗi hydration mismatch nào trên console trình duyệt.

---

## 3. KẾT LUẬN VÀ QUYẾT ĐỊNH CUỐI CÙNG

**FINAL DECISION: PASS**

Mô-đun **Đề xuất vật tư V2** trên hệ thống `construction-erp-v2` đã đạt 100% các tiêu chí ổn định, sẵn sàng đưa vào vận hành thực tế (Production-Ready).
