# Báo cáo cấp tài khoản Chỉ huy trưởng công trình

Ngày thực hiện: 13/08/2026  
Database: `construction_erp_v2_dev` tại `127.0.0.1:5432`  
Kết luận: **PARTIAL PASS**

## 1. Kết luận điều hành

Hệ thống đã được audit, backup, bổ sung cơ chế cấp tài khoản an toàn, bắt buộc đổi mật khẩu lần đầu, UI quản trị trạng thái tài khoản và kiểm soát RBAC theo `ProjectMember`. Migration và build đã thành công.

Không có tài khoản Chỉ huy trưởng nào được tạo vì database hiện tại không chứa Employee hoặc `EmployeeProjectAssignment` role `CHT` tương ứng với 11 người trong Excel. Tạo User, Employee hoặc assignment từ tên trong Excel sẽ vi phạm yêu cầu không tạo dữ liệu giả và không tự ý ghi đè phân công.

Kết quả chạy provisioning thực tế:

```text
eligibleEmployees: 0
accountsCreated: 0
existingAccountsReconciled: 0
projectMembershipsCreated: 0
```

## 2. Bằng chứng nguồn dữ liệu và backup

- File đối chiếu: `D:\ZaloData\CÁC CT CÁC BAN.xlsx`
- SHA-256 Excel: `3B6FB90C492F55CD3FD5FA78EDF35D9E971362644A6A2CBE4808CEF133D890E3`
- Sheet: `2HN và PTN (3)`, vùng dữ liệu `A1:O91`
- Cột Chỉ huy trưởng: cột H, tiêu đề `Tên chỉ huy trưởng`
- Backup trước migration/provisioning: `backups/site-commander-account-provisioning/pre-provisioning-2026-08-13T08-25-30-539Z.json`
- SHA-256 backup: `a9449af600e483b84b20dbcc8ec47e755fd203a9557c6489e92f03d7547daab6`

Đối soát số lượng trước và sau:

| Bảng | Trước | Sau | Chênh lệch |
| --- | ---: | ---: | ---: |
| User | 5 | 5 | 0 |
| Employee | 1 | 1 | 0 |
| Project | 21 | 21 | 0 |
| EmployeeProjectAssignment | 0 | 0 | 0 |
| ProjectMember | 0 | 0 | 0 |

Migration chỉ thêm `User.mustChangePassword` và `User.passwordChangedAt`. Không chạy seed, không reset database và không sửa Project thật.

## 3. Schema và mapping thực tế

Mapping được xác nhận trong schema hiện hữu:

```text
Employee.userId -> User.id
EmployeeProjectAssignment.employeeId -> Employee.id
EmployeeProjectAssignment.projectId -> Project.id
EmployeeProjectAssignment.projectPersonnelRoleId -> ProjectPersonnelRole.id
ProjectMember.userId -> User.id
ProjectMember.projectId -> Project.id
```

Role hiện hữu được sử dụng, không tạo role mới:

- `ProjectPersonnelRole.code = CHT`, tên `Chỉ huy trưởng`
- `UserRole.CHIEF_COMMANDER`
- `ProjectRole.CHIEF_COMMANDER`

`EmployeeProjectAssignment` là nguồn xác minh phân công nhân sự. `ProjectMember` là nguồn phạm vi truy cập sau đăng nhập. Dịch vụ provisioning chỉ tạo `ProjectMember` từ assignment CHT đang hiệu lực, không sửa hoặc xóa assignment.

## 4. Đối chiếu Excel với database

Excel có 18 dòng công trình mang tên Chỉ huy trưởng, gồm 11 người duy nhất. Cả 21 mã công trình trong Excel đều tìm thấy Project tương ứng trong database; không có Project Excel bị thiếu trong DB.

| Chỉ huy trưởng | Employee | User | Role | Công trình được giao theo Excel | Account | Kết quả |
| --- | --- | --- | --- | --- | --- | --- |
| Lê Mạnh Hùng | Không tìm thấy | Không | N/A | CT-2026-0002 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Đoàn Văn Giang | Không tìm thấy | Không | N/A | CT-0003, CT-0004, CT-0005 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Lê Trọng Hạ | Không tìm thấy | Không | N/A | CT-0006 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Trần Quốc Dũng | Không tìm thấy | Không | N/A | CT-0007, CT-0008 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Nguyễn Văn Hưng | Không tìm thấy | Không | N/A | CT-0009 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Phạm Anh Tuấn | Không tìm thấy | Không | N/A | CT-0010, CT-0013, CT-0017, CT-0018 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Nguyễn Đức Mùi | Không tìm thấy | Không | N/A | CT-0011 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Nguyễn Tư Mạnh | Không tìm thấy | Không | N/A | CT-0012 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Lương Văn Công | Không tìm thấy | Không | N/A | CT-0014 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Vũ Hưng | Không tìm thấy | Không | N/A | CT-0015, CT-0020 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |
| Nguyễn Minh Hùng | Không tìm thấy | Không | N/A | CT-0016 | Không tạo | `EMPLOYEE_NOT_FOUND`, `ASSIGNMENT_NOT_FOUND` |

Các trường hợp cần đối chiếu thủ công:

- 11 người trong Excel không có Employee tương ứng trong DB.
- 18 phân công công trình trong Excel không có bản ghi `EmployeeProjectAssignment` tương ứng trong DB.
- 5 User hiện hữu đều chưa liên kết Employee; không tự động ghép theo tên.
- Employee duy nhất `NV-2026-0001 - Nguyễn Văn A` không phải Chỉ huy trưởng, không có email, số điện thoại, User hoặc project assignment; không bị thay đổi.
- CT-0017 và CT-0018 có tên công trình gần như trùng nhau nhưng là hai Project thật khác mã và khác gói thầu; không gộp hoặc xóa.
- Database không có Chỉ huy trưởng khác với Excel; database hoàn toàn chưa có assignment CHT để so sánh xung đột.

## 5. Cơ chế đã triển khai

### Provisioning an toàn

- Chỉ cho phép `Employee` đang làm việc hoặc thử việc, có assignment `CHT` đang hiệu lực.
- Chuẩn hóa Unicode, dấu tiếng Việt, hoa thường và khoảng trắng để phát hiện tên gần trùng.
- Chặn duplicate assignment cùng người/cùng công trình.
- Chặn User rời liên kết dùng cùng email, mã nhân viên hoặc số điện thoại.
- Chặn User hoặc Employee gần trùng tên để Admin đối chiếu.
- Chặn tự động đổi role của User đã tồn tại.
- Chặn công trình đã có `SITE_COMMANDER` hoặc `CHIEF_COMMANDER` khác.
- Một transaction và một advisory lock cho mỗi Employee.
- Một User duy nhất được liên kết với N `ProjectMember` role `CHIEF_COMMANDER`.
- Không tạo Employee, Project hoặc `EmployeeProjectAssignment`.

### Mật khẩu

- Mật khẩu tạm được sinh bằng `crypto.randomBytes`, hash bằng bcrypt cost 12.
- Không hard-code mật khẩu, không ghi plaintext vào DB, audit log hoặc batch log.
- UI chỉ hiển thị mật khẩu tạm đúng trong kết quả tạo tài khoản hiện tại.
- Token mang cờ `mustChangePassword`; proxy chặn mọi màn hình/API khác cho đến khi đổi mật khẩu.
- Mật khẩu mới tối thiểu 10 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
- Đổi mật khẩu cập nhật `passwordChangedAt`, xóa cờ bắt buộc đổi và làm mất hiệu lực token cũ qua `User.updatedAt`.

### UI quản trị

Trang Nhân sự hiển thị:

- `Chưa có tài khoản`
- `Đã có tài khoản · Đang hoạt động`
- `Đã có tài khoản · Chờ đổi mật khẩu`
- `Đã có tài khoản · Đã khóa`
- `Công trình phụ trách` được suy ra từ assignment role `CHT`
- `Tạo tài khoản` cho Employee CHT chưa có User
- `Xem tài khoản` khi đã có User

## 6. Kiểm thử

| Nhóm | Kết quả | Bằng chứng |
| --- | --- | --- |
| TypeScript | PASS | `npx tsc --noEmit`, 0 lỗi |
| Unit/RBAC/Auth | PASS | 5 test files, 21 tests PASS |
| 1 Person = 1 User, 1 User = N Projects | PASS ở tầng service | Test tạo 1 User và 2 ProjectMember trong cùng transaction |
| Thiếu assignment | PASS | Test xác nhận không gọi `User.create` |
| Commander conflict | PASS | Test xác nhận không gọi `User.create` |
| RBAC project A/project B | PASS | 6 policy cases cho phép project được giao và từ chối project ngoài assignment |
| API chưa xác thực | PASS | list project 401, project detail 401, change-password 401 |
| UI route guard | PASS | `/hr/employees` chuyển về login; `/change-password` không có session chuyển về login; console 0 lỗi |
| Production build | PASS | Next.js 16.2.7 compiled successfully |
| Provisioning apply | PASS an toàn | 0 eligible, 0 account, 0 membership; không có dữ liệu giả |
| Login thực tế từng Chỉ huy trưởng | NOT EXECUTABLE | DB không có Employee/assignment/account hợp lệ |
| API/UI E2E bằng tài khoản Chỉ huy trưởng thật | NOT EXECUTABLE | DB không có tài khoản Chỉ huy trưởng để đăng nhập |

Không dùng 5 tài khoản Admin hiện hữu để giả lập Chỉ huy trưởng và không sửa role của họ phục vụ test.

## 7. Thống kê bắt buộc

```text
Tổng Chỉ huy trưởng tìm thấy: 11 trong Excel; 0 được xác minh bằng assignment DB
Đã có tài khoản: 0
Tài khoản mới được tạo: 0
Thiếu email/thông tin đăng nhập: 0 ACCOUNT_REQUIRES_INFORMATION; 11 chưa có Employee để kiểm tra email
Một người phụ trách nhiều công trình: 4
Assignment bất thường: 18 assignment Excel bị thiếu trong DB
Duplicate phát hiện: 0 duplicate User/Assignment thực tế; 1 cặp tên Project gần trùng CT-0017/CT-0018 đã xác minh là hai Project khác
Test đăng nhập PASS: 0/0, chưa thể thực thi bằng tài khoản thật
Test RBAC PASS: 6/6 policy cases; E2E tài khoản thật chưa thể thực thi
```

## 8. Release gate

| Gate | Trạng thái |
| --- | --- |
| 1 PERSON = 1 USER | PASS ở schema/service/test; chưa có bản ghi thật để nghiệm thu E2E |
| 1 USER = N PROJECT ASSIGNMENTS | PASS ở service/test; chưa có assignment thật |
| Chỉ thấy công trình được phân | PASS ở policy/API code/test; chưa có account thật để nghiệm thu E2E |
| Không duplicate User | PASS, không tạo User nào; các guard duplicate đã có test |
| Không Project demo | PASS |
| Không Employee demo | PASS |
| Không dữ liệu giả | PASS |
| Không phá dữ liệu công trình thật | PASS, Project trước/sau đều 21 |

### Kết luận cuối cùng: PARTIAL PASS

Phần code, schema, migration, RBAC, UI, backup và kiểm thử kỹ thuật đã hoàn tất. Release chưa thể đạt `PASS` vì thiếu dữ liệu Employee và assignment CHT thực tế trong database. Bước nghiệp vụ bắt buộc tiếp theo là người có thẩm quyền xác minh hoặc nhập 11 Employee thật cùng 18 assignment thật bằng quy trình HR hiện hữu; sau đó Admin dùng nút `Tạo tài khoản` để nhận mật khẩu tạm đúng một lần và chạy lại 10 test E2E cho từng tài khoản.
