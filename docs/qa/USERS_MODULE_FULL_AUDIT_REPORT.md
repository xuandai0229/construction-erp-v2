# BÁO CÁO KIỂM TRA MÔ-ĐUN USERS (QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN)

---

## 1. Kết luận

* **Users module**: **FAIL**
* **Có sẵn sàng quản lý tài khoản thật chưa?**: **CHƯA SẴN SÀNG**. Do tồn tại lỗ hổng P0 về phân quyền (Privilege Escalation) cực kỳ nghiêm trọng liên quan đến Role Admin và Director.
* **Rủi ro lớn nhất là gì?**: Bất kỳ người dùng nào có quyền `HighLevelUser` (như Phó giám đốc) cũng có thể tự nâng quyền lên `ADMIN`, xóa hoặc khóa tải khoản của `ADMIN`, và đổi mật khẩu của `ADMIN`.
* **Migration status có vấn đề không?**: Migration `20260626090000_approvals_center` vẫn đang FAILED (chưa được resolve từ vòng trước, nhưng không trực tiếp ảnh hưởng đến DB Users).

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/users`, `/api/auth/login`
* **Components**: `UserManagementClient`, `LoginPage`, `UserFormDialog` (tích hợp trong ManagementClient).
* **API/actions**: `getUsers`, `createUser`, `updateUser`, `resetUserPassword`, `toggleUserActive`, `assignProjectToUser`, v.v.
* **Prisma models**: `User`, `ProjectMember`, `AuditLog`.
* **Auth/session**: An toàn. Session token chỉ dùng cookie httpOnly. Check active/deleted ngay trong `getSession()`.
* **RBAC**: Sử dụng `requireHighLevelUser` lỏng lẻo. Lỗ hổng nâng quyền.
* **Project membership**: Kiểm soát qua `assignProjectToUser`. Hoạt động đúng.
* **CRUD user**: Đầy đủ tính năng.
* **Role escalation**: **THỦNG LỖ HỔNG CRITICAL**.
* **Audit log**: Có gọi `writeAuditLog` trên tất cả action (tuy nhiên UI chưa có tab hiển thị).
* **UI/UX**: `UserManagementClient` xử lý list/create/edit/delete/resetPassword. Đầy đủ các role option không có bộ lọc quyền hạn. UI hiển thị gọn gàng.
* **Performance**: Hiện tại tải danh sách User bằng SSR. Truy vấn không quá nặng.
* **Security**: Safe khỏi XSS, không leak mật khẩu băm (`passwordHash`), không leak session. Tuy nhiên bị IDOR/Privilege Escalation.
* **Build/typecheck**: Hoàn toàn PASS (Turbopack, TypeScript compiler).

---

## 3. Sơ đồ luồng

* **User list flow**: `Page.tsx` SSR -> Fetch DB -> Filter/Serialize mảng (xóa `password` khỏi payload) -> Trả về Client Component -> Hiển thị dạng bảng (hoặc thẻ trên mobile).
* **Create user flow**: Client Form -> Action `createUser` -> Hash bcrypt -> DB transaction -> Insert User -> Gán quyền `ProjectMember` (nếu có) -> `revalidatePath`.
* **Update user flow**: Nhập thông tin -> Action `updateUser` -> Cho phép đổi `role` (nguy hiểm) -> Xóa quyền cũ/Tạo quyền project mới -> `revalidatePath`.
* **Login/session flow**: `login/route.ts` -> So sánh `bcrypt` -> Gọi `setSession` -> Phát hành cookie. `getSession` trên mọi Route Server.

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Tổng số users | 36 |
| Active users | 10 |
| Soft-deleted users | 26 |
| Inactive/disabled users | 0 |
| Role CHIEF_COMMANDER | 5 |
| Role DEPUTY_DIRECTOR | 1 |
| Role DIRECTOR | 5 |
| Role ENGINEER | 11 |
| Role ACCOUNTANT | 3 |
| Role ADMIN | 4 |
| Role MANAGER | 1 |
| Role STAFF | 6 |
| Users thuộc ít nhất 1 project | 10 |
| Duplicate emails | 0 |
| Dữ liệu rác (prefix `qa`) | 1 |

---

## 5. RBAC matrix

| Role/User | View Users | Create | Update | Change Role | Assign Project | Disable/Delete | Reset Password | Direct API | Kết quả |
| --------- | ---------- | ------ | ------ | ----------- | -------------- | -------------- | -------------- | ---------- | ------- |
| ADMIN | CÓ | CÓ | CÓ | CÓ | CÓ | CÓ | CÓ | Bị chặn if disabled | PASS |
| DIRECTOR | CÓ | CÓ | CÓ (Thủng) | CÓ (Lên ADMIN) | CÓ | CÓ (Xóa ADMIN) | CÓ (Đổi pw ADMIN)| Thủng | **FAIL** |
| DEPUTY_DIR | CÓ | CÓ | CÓ (Thủng) | CÓ (Lên ADMIN) | CÓ | CÓ (Xóa ADMIN) | CÓ (Đổi pw ADMIN)| Thủng | **FAIL** |
| ACCOUNTANT | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | Bị chặn 401 | PASS |
| PROJECT_MGR| KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | Bị chặn 401 | PASS |
| ENGINEER | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | Bị chặn 401 | PASS |
| STAFF | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | KHÔNG | Bị chặn 401 | PASS |

---

## 6. Auth/session matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Cookie HttpOnly | CÓ | - | Bảo mật XSS tốt. |
| Invalidate Session khi Disable/Delete | CÓ | - | Hàm `getSession` tự động check `deletedAt` và `isActive` của user tươi mỗi request. Khá tuyệt vời. |
| Password hash | Bcrypt (salt round 10) | - | Không bị lộ plaintext. |

---

## 7. Project membership matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Gán User vào Project | Hoạt động | - | |
| Gỡ User khỏi Project | Hoạt động (Soft delete isActive) | - | |
| Orphan Project Member | Không có | - | DB bắt buộc `userId` và `projectId`. |

---

## 8. Security matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Privilege Escalation / IDOR | Có thể | **CRITICAL** | `DEPUTY_DIRECTOR` update chính mình thành `ADMIN` hoặc thay đổi role/reset password của `ADMIN`. |
| Leak Password Hash | Không | - | SSR đã filter bỏ `password`. API không trả về payload này. |

---

## 9. UI/UX matrix

| Khu vực | Vấn đề | Viewport | Severity | Ghi chú |
| ------- | ------ | -------- | -------- | ------- |
| Chọn Role (Create/Edit) | Cho phép Phó GĐ chọn "Quản trị hệ thống" | Mọi thiết bị | **HIGH** | UI không ẩn role cấp cao khỏi những role thấp hơn đang sử dụng tool. |

---

## 10. Danh sách lỗi phát hiện

### USR-BUG-001 — Lỗ hổng nâng quyền và chiếm đoạt tài khoản (Privilege Escalation)
* Severity: **CRITICAL**
* Khu vực: API/RBAC
* File liên quan: `src/app/(dashboard)/users/actions.ts`, `src/lib/rbac.ts`
* Cách tái hiện: Tài khoản `DEPUTY_DIRECTOR` (có quyền `requireHighLevelUser`) gọi hàm `updateUser` sửa chính mình và truyền parameter `role: "ADMIN"`. Hoặc gọi `resetUserPassword` truyền `userId` của Admin thật.
* Kết quả hiện tại: Thành công 100%. `DEPUTY_DIRECTOR` trở thành `ADMIN` hoặc đổi mật khẩu của `ADMIN` và đăng nhập vào.
* Kết quả mong muốn: Chỉ `ADMIN` mới được tạo/sửa `ADMIN` hoặc `DIRECTOR`. User không được sửa role cao hơn mình. Không được quyền reset password của user cao hơn mình.
* Phương án fix đề xuất: Bổ sung Logic ràng buộc trong `updateUser` và `resetUserPassword`: "Level của actor phải >= level của target user và level role mục tiêu".
* Có cần fix ngay không: **CÓ! CỰC KỲ KHẨN CẤP.**

### USR-BUG-002 — Form UI cho phép chọn role tùy tiện
* Severity: HIGH
* Khu vực: UI
* File liên quan: `src/components/users/user-management-client.tsx`
* Kết quả hiện tại: Dropdown "Vai trò" luôn hiển thị `ADMIN`, `DIRECTOR` dù người duyệt UI chỉ là `DEPUTY_DIRECTOR`.
* Có cần fix ngay không: CÓ.

---

## 11. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
* `USR-BUG-001`: Ngăn chặn User không đủ quyền tạo/sửa/xóa/đổi password của Admin/Director. Ngăn chặn tự ý đổi role thành cao hơn chính mình (Self role escalation).
* Ngăn `DEPUTY_DIRECTOR` khóa tài khoản của `ADMIN`.

### P1 — Fix trước UAT
* Sửa UI `user-management-client.tsx` để vô hiệu hóa (disabled) việc chọn các Role cao hơn Role hiện tại của người đăng nhập. (Cần đẩy Actor Role từ Server xuống Client).

### P2 — Tối ưu sau
* Bổ sung trang `Audit Log` để có thể xem lại ai đã update role người khác.

---

## 12. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/qa-users-audit.ts` | **PASS** | Đã check dữ liệu hiện có (36 users) |
| `npx prisma validate` | **PASS** | Schema hợp lệ |
| `npx prisma generate` | **PASS** | Prisma Client sinh ra thành công |
| `npx tsc --noEmit` | **PASS** | Không lỗi TypeScript |
| `npm run build` | **PASS** | Build thành công trên Next.js 16 (Turbopack) |

---

## 13. Git status cuối

```bash
?? docs/qa/USERS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-users-audit.ts
```

## 14. Cam kết

* Chưa fix code.
* Chưa commit.
* Chưa push.
* Không reset DB.
* Không xóa/sửa user thật.
* Không tạo user thật nào.
