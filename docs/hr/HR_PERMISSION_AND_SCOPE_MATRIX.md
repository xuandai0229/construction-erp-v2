# HR Permission & Scope Matrix — Ma Trận Phân Quyền Phụ Thuộc Phạm Vi Dữ Liệu

**Phiên bản:** 1.1.0  
**Tác giả:** Chuyên Gia RBAC & Bảo Mật Dữ Liệu  
**Trạng thái Kiểm toán:** PARTIALLY VERIFIED  

---

## I. KIẾN TRÚC PHÂN QUYỀN 3 LỚP (3-TIER RBAC)

Hệ thống phân quyền HR kết hợp 3 lớp:

1. **System Role (Vai trò hệ thống):** `ADMIN`, `DIRECTOR`, `MANAGER`, `ENGINEER`, `STAFF`.
2. **Permission Code (Mã quyền nghiệp vụ):** Tên quyền dạng `hr:<domain>:<action>`.
3. **Data Scope (Phạm vi dữ liệu hiện có trong DB Enum):**
   - `ALL_EMPLOYEES` — Toàn bộ nhân viên.
   - `OWN_ORGANIZATION_UNIT` — Nhân viên thuộc đơn vị mình quản lý.
   - `OWN_PROJECTS` — Nhân viên thuộc công trình mình tham gia.
   - `SELF_ONLY` — Hồ sơ của chính bản thân.
   - `NONE` — Không có quyền tác động bản ghi nào.
   - `OWN_ORGANIZATION_TREE` — **[PROPOSED / NOT IN DB ENUM]** Cây phòng ban con.

---

## II. CANONICAL PERMISSION INVENTORY

| Permission Code | Có trong Registry | Có trong Seed | Có Call-site | Có Test | Trạng Thái |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `hr:employee:read` | YES | YES | YES | YES | **CURRENT** |
| `hr:employee:create` | YES | YES | YES | YES | **CURRENT** |
| `hr:employee:update` | YES | YES | YES | YES | **CURRENT** |
| `hr:employee:delete` | YES | YES | YES | YES | **CURRENT** |
| `hr:employee:read_sensitive` | YES | YES | YES | YES | **CURRENT** |
| `hr:organization:manage` | YES | YES | YES | YES | **CURRENT** |
| `hr:position:manage` | YES | YES | YES | YES | **CURRENT** |
| `hr:project_role:manage` | YES | YES | NO | NO | **PARTIAL** |
| `hr:access_grant:manage` | YES | YES | NO | NO | **PARTIAL** |
| `hr:project_assignment:manage` | NO | NO | NO | NO | **PROPOSED** |
| `hr:project_allocation:override` | NO | NO | NO | NO | **PROPOSED** |
| `hr:contract:read` / `create` / `update` | NO | NO | NO | NO | **PROPOSED** |
| `hr:certificate:read` / `manage` | NO | NO | NO | NO | **PROPOSED** |
| `hr:payroll:read` / `manage` | NO | NO | NO | NO | **DEFERRED** |

*Ghi chú Alias Mapping:* `hr:org_unit:manage` được tự động chuyển đổi thành `hr:organization:manage` trong `resolveUserHrPermission` để tương thích với bản ghi phân quyền cũ.

---

## III. MA TRẬN PHÂN QUYỀN THEO VAI TRÒ HỆ THỐNG

| Mã Quyền | ADMIN | Ban Giám Đốc | HR Công Ty | Trưởng Phòng | Chỉ Huy Trưởng | Kế Toán | Nhân Viên |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Data Scope Mặc Định** | `ALL` | `ALL` | `ALL` | `OWN_ORG` | `OWN_PROJECTS` | `ALL` | `SELF_ONLY` |
| `hr:employee:read` | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| `hr:employee:create` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| `hr:employee:update` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| `hr:employee:read_sensitive` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| `hr:organization:manage` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| `hr:project_role:manage` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
