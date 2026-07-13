# Ma trận quyền hiện hành sau Phase 2.6

Cập nhật: 13/07/2026 (ICT). Kết luận: **RBAC toàn hệ thống chưa PASS runtime**. Nhãn sau: **PASS tĩnh** = code/unit/static đã kiểm tra; **PASS runtime** = fixture QA cô lập đã chạy; **CHƯA XÁC MINH** = chưa có bằng chứng QA runtime; **CHƯA MIGRATE** = chưa dùng resolver tập trung ở đường thực thi.

`GLOBAL`, `ASSIGNED_PROJECTS`, `OWN_RECORDS`, `NONE` là scope. System role và Project role là hai lớp độc lập.

## Ma trận policy hiện hành

| Permission | ADMIN | DIRECTOR | DEPUTY_DIRECTOR | MANAGER | ACCOUNTANT | VIEWER project role | Scope | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `approvals.view` | ALLOW legacy business | ALLOW GLOBAL | ALLOW GLOBAL | ASSIGNED_PROJECTS khi membership active | ASSIGNED_PROJECTS khi membership active | ALLOW view assigned project | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| `approvals.create` | ALLOW legacy business | ALLOW GLOBAL | ALLOW GLOBAL | ASSIGNED_PROJECTS khi project role operator | ASSIGNED_PROJECTS khi project role operator | **DENY** | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh (VIEWER đã vá); runtime CHƯA XÁC MINH |
| `approvals.decide` | ALLOW legacy business | ALLOW GLOBAL | ALLOW GLOBAL | chỉ Project Approver | chỉ Project Approver | DENY | GLOBAL / ASSIGNED_PROJECTS; cấm self-approval tại pure evaluator | PASS tĩnh; runtime CHƯA XÁC MINH |
| `payments.view` | ALLOW legacy business | ALLOW GLOBAL | ALLOW GLOBAL | membership active | membership active | ALLOW view assigned project | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| `payments.create/update/mark_paid` | ALLOW legacy business | ALLOW GLOBAL | ALLOW GLOBAL | theo project role | ACCOUNTANT + membership non-VIEWER | DENY | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| `users.*` | ALLOW + hierarchy | ALLOW + hierarchy | ALLOW + hierarchy | DENY | DENY | DENY | GLOBAL | PASS tĩnh |
| documents API view/download | ALLOW | ALLOW GLOBAL | ALLOW GLOBAL | membership active | membership active | ALLOW assigned project | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| documents API upload/update/delete | ALLOW | ALLOW GLOBAL | ALLOW GLOBAL | project operator policy | project operator policy | DENY | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| report attachment/history API | ALLOW | ALLOW GLOBAL | ALLOW GLOBAL | membership required | membership required | membership required | GLOBAL / ASSIGNED_PROJECTS | PASS tĩnh; runtime CHƯA XÁC MINH |
| global search | ALLOW GLOBAL | ALLOW GLOBAL | ALLOW GLOBAL | assigned IDs only | assigned IDs only | assigned IDs only | query scoped before search | PASS tĩnh; runtime CHƯA XÁC MINH |
| notification mark read | per-user + project guard | per-user + project guard | per-user + project guard | per-user + project guard | per-user + project guard | per-user + project guard | own ledger / project check | PASS tĩnh; runtime CHƯA XÁC MINH |
| notification list/unread/detail/deep-link | not centrally migrated | not centrally migrated | not centrally migrated | not centrally migrated | not centrally migrated | not centrally migrated | conditional | CHƯA MIGRATE / CHƯA XÁC MINH |
| `audit.view_global` page | ALLOW | DENY | DENY | DENY | DENY | DENY | GLOBAL | PASS tĩnh |
| `audit.view_project`, `audit.export` | registry only | registry only | registry only | registry only | registry only | registry only | conditional | CHƯA MIGRATE |
| `settings.company` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | GLOBAL | registry PASS tĩnh; action CHƯA MIGRATE |
| `settings.system` | ALLOW | DENY | DENY | DENY | DENY | DENY | GLOBAL | registry PASS tĩnh; action CHƯA MIGRATE |

DIRECTOR và DEPUTY_DIRECTOR hiện cùng nằm trong `COMPANY_WIDE` ở registry. Không có code delegation/ủy quyền để suy ra khác biệt quyền; mọi khác biệt nghiệp vụ ngoài bảng là **CHƯA CHỐT POLICY**.

## Nguồn và gaps

| Hạng mục | Trạng thái |
| --- | --- |
| Registry/resolver | Đã có; chưa là nguồn duy nhất |
| Materials, Contracts, Reports workflow/export, Documents server actions, Settings, Audit export | CHƯA MIGRATE đầy đủ |
| ADMIN business authority | Legacy GLOBAL, chưa thu hẹp theo quyết định nghiệp vụ |
| Runtime cross-project | CHƯA XÁC MINH: không có QA database an toàn |
| Export/PDF/Excel/CSV chung | CHƯA MIGRATE |

## Phụ lục: policy trước Phase 2 (không còn hiệu lực)

| Policy cũ | Giá trị cũ | Giá trị hiện hành |
| --- | --- | --- |
| MANAGER approvals.view/create | ALLOW global | ASSIGNED_PROJECTS |
| ACCOUNTANT PAYMENT approvals.view/create | ALLOW global | ASSIGNED_PROJECTS |
| VIEWER approvals.create | ALLOW assigned project | DENY (Phase 2.6) |
| Permission registry | Chưa có | Có, nhưng chưa là nguồn duy nhất |
