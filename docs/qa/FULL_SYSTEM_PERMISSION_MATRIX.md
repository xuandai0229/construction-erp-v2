# Ma trận quyền hiện hành — điều hành thi công

Cập nhật: 13/07/2026 (ICT).

Supplier, Contract, Payment và role ACCOUNTANT không còn trong schema, registry, route hoặc action. Chúng không phải capability của hệ thống.

| Nhóm capability | ADMIN | DIRECTOR | DEPUTY_DIRECTOR | Vai trò hiện trường + membership | VIEWER |
| --- | --- | --- | --- | --- | --- |
| Công trình | GLOBAL | GLOBAL | GLOBAL | ASSIGNED_PROJECTS | ASSIGNED_PROJECTS (xem) |
| Tài liệu xem/tải | GLOBAL | GLOBAL | GLOBAL | ASSIGNED_PROJECTS | ASSIGNED_PROJECTS |
| Tài liệu upload/sửa/xóa | GLOBAL | GLOBAL | GLOBAL | theo ProjectRole/owner | DENY |
| Báo cáo hiện trường | GLOBAL | GLOBAL | GLOBAL | theo ProjectRole/owner | xem theo scope |
| Vật tư/kho | GLOBAL | GLOBAL | GLOBAL | theo ProjectRole | DENY mutation |
| Phê duyệt thi công | GLOBAL | GLOBAL | GLOBAL | approver ProjectRole | DENY |
| Tài khoản/cài đặt | GLOBAL theo hierarchy | GLOBAL theo hierarchy | GLOBAL theo hierarchy | DENY | DENY |
| Audit global | ADMIN | DENY | DENY | DENY | DENY |

Trạng thái hardening cross-project: policy tĩnh có registry/resolver; runtime QA vẫn cần database QA riêng để xác minh.
