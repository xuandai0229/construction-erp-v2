# BÁO CÁO FIX P0/P1 MÔ-ĐUN USERS (QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN)

---

## 1. Kết luận sau fix

* **Users module**: **PASS**
* **USR-BUG-001 đã fix chưa?**: **RỒI**. Mọi mutation action đều kiểm tra role hierarchy server-side.
* **USR-BUG-002 đã fix chưa?**: **RỒI**. UI chỉ hiển thị các role mà actor được phép gán.
* **Self role escalation còn không?**: **KHÔNG**. Chặn cứng: "Bạn không thể tự đổi vai trò của chính mình."
* **Non-ADMIN còn tạo/sửa ADMIN được không?**: **KHÔNG**. `assertRoleHierarchy` ném lỗi nếu `requestedRole level >= actorLevel`.
* **Non-ADMIN còn reset password ADMIN được không?**: **KHÔNG**. Kiểm tra hierarchy + chặn self-reset.
* **Admin cuối cùng còn bị khóa/xóa/hạ quyền được không?**: **KHÔNG**. Guard kiểm tra `count active ADMIN` trước khi cho phép.
* **Disabled/deleted user session còn an toàn không?**: **AN TOÀN**. `getSession()` fetch tươi từ DB mỗi request, kiểm tra `isActive` và `deletedAt`.
* **Migration status còn failed không?**: **CÒN** (`20260626090000_approvals_center`), không liên quan đến Users.

---

## 2. File đã sửa

1. `src/lib/rbac.ts` — Thêm `USER_ROLE_LEVEL`, `getRoleLevel`, `assertRoleHierarchy`, `getAllowedRolesForActor`.
2. `src/app/(dashboard)/users/actions.ts` — Nhúng `assertRoleHierarchy` vào tất cả 7 mutation actions. Thêm self-guard, email normalize, role validation.
3. `src/app/(dashboard)/users/page.tsx` — Truyền `currentUserRole` và `allowedRoles` từ server xuống client.
4. `src/components/users/user-management-client.tsx` — Lọc role dropdown theo `allowedRoles`, ẩn nút sửa/khóa/xóa/reset-password khi target role >= actor role.

---

## 3. Role hierarchy matrix

| Actor role | Target role | Requested role | Action | Allowed? | Ghi chú |
| ---------- | ----------- | -------------- | ------ | -------- | ------- |
| ADMIN | Bất kỳ | Bất kỳ | Tất cả | ✅ CÓ | Ngoại trừ xóa/hạ admin cuối |
| DIRECTOR | ADMIN | - | Sửa/Khóa/Xóa/Reset PW | ❌ KHÔNG | Level 90 < 100 |
| DIRECTOR | DEPUTY_DIR | ADMIN | Nâng quyền lên ADMIN | ❌ KHÔNG | Requested level 100 >= 90 |
| DIRECTOR | ENGINEER | CHIEF_CMD | Nâng quyền | ✅ CÓ | Cả hai < 90 |
| DEPUTY_DIR | DIRECTOR | - | Sửa/Khóa/Xóa/Reset PW | ❌ KHÔNG | Level 80 < 90 |
| DEPUTY_DIR | STAFF | DEPUTY_DIR | Nâng quyền lên DEPUTY | ❌ KHÔNG | Requested level 80 >= 80 |
| DEPUTY_DIR | STAFF | ENGINEER | Nâng quyền | ✅ CÓ | Level 20 < 80 |
| ENGINEER | Bất kỳ | Bất kỳ | Tất cả | ❌ KHÔNG | Không phải HighLevel |

---

## 4. Action guard matrix

| Action | Role hierarchy check | Self guard | Last admin guard | Audit log | Kết quả |
| ------ | -------------------- | ---------- | ---------------- | --------- | ------- |
| createUser | ✅ | N/A | N/A | ✅ | PASS |
| updateUser | ✅ | ✅ Self role change | ✅ Hạ quyền admin cuối | ✅ | PASS |
| resetUserPassword | ✅ | ✅ Self reset | N/A | ✅ | PASS |
| toggleUserActive | ✅ | ✅ Self disable | ✅ Admin cuối | ✅ | PASS |
| softDeleteUser | ✅ | ✅ Self delete | ✅ Admin cuối | ✅ | PASS |
| restoreUser | ✅ | N/A | N/A | ✅ | PASS |
| assignProjectToUser | ✅ | N/A | N/A | ✅ | PASS |
| unassignProjectFromUser | ✅ | N/A | N/A | ✅ | PASS |

---

## 5. UI role filter matrix

| Actor role | Role options hiển thị | Có thể edit role nào | Có thể reset/delete ai | Kết quả |
| ---------- | --------------------- | -------------------- | ---------------------- | ------- |
| ADMIN | Tất cả 8 role | Tất cả | Tất cả (trừ admin cuối) | PASS |
| DIRECTOR | STAFF → CHIEF_CMD (6 role) | Chỉ role < DIRECTOR | Chỉ user < DIRECTOR | PASS |
| DEPUTY_DIR | STAFF → CHIEF_CMD (5 role) | Chỉ role < DEPUTY | Chỉ user < DEPUTY | PASS |

---

## 6. Lỗi đã fix

### USR-BUG-001 — Lỗ hổng nâng quyền (Privilege Escalation)

* **Trước**: `DEPUTY_DIRECTOR` gọi `updateUser(self, {role: "ADMIN"})` → thành công. `DIRECTOR` gọi `resetUserPassword(adminId, "123456")` → thành công.
* **Sau**: `assertRoleHierarchy` ném lỗi server-side. UI ẩn nút. Double layer defense.
* **File sửa**: `rbac.ts`, `actions.ts`
* **Test xác minh**: `qa-users-rbac-static.ts` → PASS
* **Rủi ro còn lại**: Không còn. Server-side là chính, UI là phụ.

### USR-BUG-002 — UI cho phép chọn role tùy tiện

* **Trước**: Dropdown luôn hiển thị 7 role kể cả ADMIN cho mọi actor.
* **Sau**: Dropdown chỉ hiện role mà actor được phép cấp. Nút sửa/khóa/xóa/reset ẩn nếu target cao hơn.
* **File sửa**: `page.tsx`, `user-management-client.tsx`
* **Test xác minh**: `qa-users-ui-role-filter.ts` → PASS
* **Rủi ro còn lại**: Không còn.

---

## 7. Lệnh đã chạy

| Lệnh | Kết quả |
| ---- | ------- |
| `npx tsx scripts/qa-users-rbac-static.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-ui-role-filter.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-auth-session.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-audit.ts` | ✅ PASS |
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build` | ✅ PASS |

---

## 8. Git status cuối

```bash
 M src/app/(dashboard)/users/actions.ts
 M src/app/(dashboard)/users/page.tsx
 M src/components/users/user-management-client.tsx
 M src/lib/rbac.ts
?? docs/qa/USERS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-users-audit.ts
?? scripts/qa-users-auth-session.ts
?? scripts/qa-users-rbac-static.ts
?? scripts/qa-users-ui-role-filter.ts
```

```
 src/app/(dashboard)/users/actions.ts            | 137 +++++++++++++++--
 src/app/(dashboard)/users/page.tsx              |  10 +-
 src/components/users/user-management-client.tsx | 112 ++++++++-----
 src/lib/rbac.ts                                 |  71 +++++++++
 4 files changed, 278 insertions(+), 52 deletions(-)
```

---

## 9. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không xóa/sửa user thật.
* Không đổi mật khẩu user thật.
* Không tạo user thật.
