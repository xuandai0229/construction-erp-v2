# USER MANAGEMENT AUDIT REPORT
**Topic:** Trạng thái, Khóa tài khoản, Xóa tài khoản, Email, Dữ liệu liên quan đến Quản lý User
**Date:** 2026-06-18
**Type:** READ-ONLY AUDIT

---

## 1. Tóm tắt hiện trạng

Qua kiểm tra toàn bộ file `schema.prisma`, `actions.ts`, component UI và các route xử lý Authentication, màn hình **Quản lý tài khoản** hiện tại đang ở trạng thái **Basic (Cơ bản)**. Các tính năng chính bao gồm Tạo tài khoản, Khóa/Mở khóa, Đổi mật khẩu và Gán/Gỡ công trình. 

Hệ thống **chưa có** tính năng Sửa thông tin cá nhân (name, email, role), **chưa có** tính năng Xóa tài khoản, và **không có** bất kỳ tích hợp gửi Email hay SMS nào.

---

## 2. Giải đáp chi tiết các câu hỏi

### 2.1 Khóa tài khoản nghĩa là gì trong hệ thống hiện tại?
- Khóa tài khoản (nút có icon 🔒) là hành động đổi trạng thái `isActive` của User từ `true` sang `false`.
- **Hậu quả của việc khóa:**
  - Tài khoản ngay lập tức **không thể đăng nhập** (bị chặn tại `api/auth/login/route.ts`).
  - Nếu user đang online, session sẽ tự động **bị vô hiệu hóa** ở các request tiếp theo (do `getSession()` trong `src/lib/auth.ts` kiểm tra `!user.isActive` và trả về `null`).
  - **Không mất dữ liệu**: Các công trình đã gán, nhật ký hay phiếu yêu cầu của user này đều được giữ nguyên.
- **Có confirm không?** Hiện tại bấm vào là khóa/mở khóa ngay lập tức, KHÔNG có dialog xác nhận.

### 2.2 Trạng thái Hoạt động / Đã khóa đang lấy từ đâu?
- Lấy trực tiếp từ trường `isActive` (Boolean) trong model `User`.
- `isActive = true` ➔ **Hoạt động**.
- `isActive = false` ➔ **Đã khóa**.
- Hệ thống **không có** trạng thái "Chưa kích hoạt" hay "Tạm khóa". 

### 2.3 Có xóa tài khoản không?
- **KHÔNG**. Hiện tại hệ thống không có nút xóa trên UI, và backend `actions.ts` cũng không có function nào để delete user.
- Model `User` có thiết kế sẵn trường `deletedAt` để hỗ trợ Soft Delete (Xóa mềm), và danh sách List User hiện tại đang query `where: { deletedAt: null }`. Tuy nhiên UI chưa cung cấp chức năng này.

### 2.4 Nếu chưa có xóa, hiện hệ thống xử lý bằng khóa tài khoản đúng không?
- **ĐÚNG**. Hiện tại nếu không muốn ai đó dùng hệ thống nữa, Admin chỉ có thể **Khóa tài khoản**. Điều này thực chất rất an toàn cho hệ thống ERP vì tránh đứt gãy dữ liệu (Foreign Key ràng buộc với các module khác).

### 2.5 Email có gửi thông báo thật không?
- **KHÔNG**. Không có bất kỳ cấu hình hay thư viện SMTP/Email Service nào (như Nodemailer, Resend) được sử dụng trong source code.
- Mật khẩu do Admin cấp lúc tạo là dùng để đăng nhập luôn, hệ thống không gửi email thông báo.

### 2.6 Số điện thoại/email có được xác minh thật không?
- **KHÔNG**. Không có cơ chế gửi mã OTP qua SMS hay link xác nhận qua Email.

### 2.7 Email/số điện thoại admin nhập có phải dữ liệu thủ công/ảo không?
- **ĐÚNG**. Nó chỉ là các chuỗi văn bản (text) được lưu vào Database để làm username đăng nhập hoặc làm thông tin liên hệ nội bộ (hiển thị cho người khác xem).

### 2.8 Nếu nhập số điện thoại, email, ghi chú thì có hiển thị lại ở đâu không?
- **Form UI có:** Họ tên, Email, Tên đăng nhập, SĐT, Mật khẩu, Vai trò, Công trình, Ghi chú.
- **Lưu vào Database:** `schema.prisma` có đủ trường cho email, SĐT, username... Tuy nhiên, trường **Ghi chú** không tồn tại trong model `User`. 
  - Code ở `actions.ts` đang lưu phần Ghi chú này vào **`ProjectMember.note`** (Ghi chú gán công trình) nếu có chọn công trình lúc tạo mới. Nếu không chọn công trình, Ghi chú bị bỏ đi.
- **Hiển thị ở List:** Có hiển thị SĐT, Email, Username, Role, Project, Status.
- **KHÔNG hiển thị:** Ghi chú không được hiển thị ở đâu trên list.

### 2.9 Có cần thêm màn Chi tiết tài khoản không?
- **CÓ CẦN THIẾT**. Hiện tại các thông tin bị nén hết vào bảng list, rất khó xem đầy đủ các thông tin (đặc biệt khi user gán nhiều công trình hoặc muốn xem các record Audit Logs / Lịch sử hoạt động của người đó).

### 2.10 Có cần thêm màn Sửa tài khoản không?
- **RẤT CẦN THIẾT (CRITICAL)**. Hiện tại tạo xong, nếu nhập sai tên, sai SĐT hay email, Admin **không có cách nào sửa lại** trên UI (do chưa có nút Edit). Backend `actions.ts` đã có hàm `updateUser` nhưng UI chưa gọi đến.

---

## 3. Rủi ro dữ liệu nếu thực hiện Xóa tài khoản (Hard Delete)
Nếu sau này làm chức năng Xóa, **TUYỆT ĐỐI KHÔNG DÙNG Hard Delete** (Xóa hẳn khỏi DB). Lý do:
Model `User` có dính dáng đến rất nhiều bảng:
- `AuditLog`: Lịch sử thao tác.
- `SiteReport`, `SiteReportLine`: Nhật ký thi công.
- `MaterialRequest`: Phiếu yêu cầu vật tư.
- `FieldProgressEntry`: Khối lượng thi công.
- Nếu xóa Hard Delete, tất cả dữ liệu trên một là bị cascade delete (mất sạch dữ liệu dự án), hai là bị lỗi mồ côi (orphan records).
- **Phương án đúng:** Chỉ sử dụng chức năng **Khóa tài khoản**, hoặc làm **Xóa mềm (Soft Delete - cập nhật `deletedAt`)**.

---

## 4. Danh sách Lỗi & Đề xuất (Cần xử lý ở Phase sau)

### 🔴 Mức độ: HIGH (Cần làm ngay)
1. **Chưa có Sửa thông tin tài khoản:** Tạo xong nếu nhập sai email/sđt thì không thể sửa (chưa có Modal Edit). Đề xuất làm ngay Modal Sửa lấy giao diện tương tự Modal Tạo.
2. **Nút Khóa / Mở khóa dễ bấm nhầm:** Khi click icon 🔒 thì action chạy ngay, không có Confirm Dialog. Cần thêm Dialog xác nhận: *"Bạn có chắc chắn muốn khóa/mở khóa tài khoản này?"*

### 🟡 Mức độ: MEDIUM
1. **Trường "Ghi chú" gây hiểu lầm:** Trong form tạo User có ô Ghi chú, nhưng thực chất DB không có trường này cho User, mà lưu vào `ProjectMember.note`. Nếu User không được chọn công trình lúc tạo, Ghi chú sẽ bị "bốc hơi". Đề xuất: Đổi tên thành *"Ghi chú gán công trình"* hoặc bỏ hẳn ô này.
2. **Wording (Câu chữ):** Email và SĐT không được xác minh, nhưng người dùng có thể hiểu lầm là sẽ có gửi email thông báo. Đề xuất UI cần có dòng Note rõ: *"Hệ thống không tự động gửi email, vui lòng gửi thông tin đăng nhập (email & mật khẩu) trực tiếp cho người sử dụng."*

### 🟢 Mức độ: LOW
1. **Màn hình Chi tiết User:** Cần có Modal hoặc Page riêng (ví dụ `/users/[id]`) để hiển thị thông tin đầy đủ, danh sách công trình, và lịch sử hoạt động (Audit Logs).
2. **Chức năng Xóa mềm:** Có thể bổ sung nút "Xóa" tài khoản ẩn trong Edit Modal (cập nhật `deletedAt`).

---

## 5. Kết luận
- **Cái gì đã dùng được:** Luồng tạo User, gán công trình, đổi mật khẩu và đổi trạng thái (Active/Inactive) hoạt động tốt và bảo mật (kick user ngay khi bị khóa).
- **Cái gì chưa có:** Hoàn toàn thiếu màn hình Sửa Thông Tin và Xem Chi Tiết. Không có tích hợp Email thật.
- **Cái gì cần làm phase tiếp theo:** 
  1. Thêm Modal Edit User. 
  2. Thêm Confirm Dialog cho nút Khóa. 
  3. Bỏ/sửa logic ô Ghi chú ở form tạo.
