# HR Phase 2 — Bằng chứng bảo mật và data scope

## Permission

Workspace chỉ hiện khi có ít nhất một quyền HR phù hợp. Server page, server action và query đều kiểm tra lại quyền; ẩn nút frontend không được dùng như lớp bảo mật duy nhất.

Các quyền dùng theo registry Phase 1:

- `hr:employee:read`
- `hr:employee:create`
- `hr:employee:update`
- `hr:employee:delete` cho lưu trữ/nghỉ việc
- `hr:employee:read_sensitive`
- `hr:access_grant:manage` cho liên kết User khi không có update

ADMIN có scope hồ sơ toàn công ty nhưng mặc định `BASIC_ONLY`; quyền xem CCCD vẫn cần policy nhạy cảm phù hợp.

## Scope

`buildEmployeeScopeWhereClause` được dùng chung cho count, list, detail và server actions:

- `ALL_EMPLOYEES`: toàn bộ hồ sơ.
- `OWN_ORGANIZATION_UNIT`: chỉ assignment hiện hành thuộc đơn vị được giao trực tiếp trong `OrganizationUnitManagerAssignment`.
- `OWN_PROJECTS`: chỉ assignment công trình đang hiệu lực thuộc công trình người dùng được phép.
- `SELF_ONLY`: chỉ Employee có `userId` trùng người dùng hiện tại.
- `NONE`: predicate không thể khớp.

Không có fallback từ `SELF_ONLY` sang người khác và không tự mở rộng cây đơn vị.

## PII projection

API/page không đưa `identityNumberEncrypted`, `identityNumberBlindIndex`, envelope, key version hoặc audit payload nội bộ vào DTO. `BASIC_ONLY` không trả contact; `CONTACT` mới trả điện thoại/email; CCCD chỉ reveal qua action riêng, có permission, scope và audit. Giá trị reveal chỉ nằm trong state cục bộ của view và được xóa khi người dùng che lại.

Audit/history chỉ ghi mã, trạng thái, field names, masked last digits hoặc mã User; không ghi snapshot full before/after chứa PII.

## Kiểm tra đầu vào

CCCD được chuẩn hóa, blind-index HMAC và mã hóa AES-256-GCM; ngày sinh tương lai, ngày nghỉ trước ngày vào, assignment master data không hoạt động và User đã liên kết đều bị chặn.
