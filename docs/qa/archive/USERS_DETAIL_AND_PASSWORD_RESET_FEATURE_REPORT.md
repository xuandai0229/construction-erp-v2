# BÁO CÁO TÍNH NĂNG CHI TIẾT TÀI KHOẢN & RESET MẬT KHẨU (USERS MODULE)

---

## 1. Kết luận

* **Đã thêm xem chi tiết tài khoản chưa?**: **RỒI**. Giao diện modal xem thông tin tài khoản hiển thị đầy đủ thông tin (Họ tên, Username, Email, Số điện thoại, Vai trò, Trạng thái, Ngày tạo, và danh sách Công trình).
* **Có hiển thị mật khẩu gốc không?**: **KHÔNG**. Có dòng cảnh báo: "Mật khẩu hiện tại không thể xem lại vì được mã hóa một chiều. Nếu người dùng quên mật khẩu, hãy dùng chức năng Reset mật khẩu."
* **Reset mật khẩu an toàn chưa?**: **RỒI**. Chuyển sang Mode B (Sinh mật khẩu tạm thời ngẫu nhiên an toàn).
* **Role hierarchy còn đảm bảo không?**: **CÒN**. Server-side giữ nguyên logic `assertRoleHierarchy`. UI cũng ẩn nút "Reset mật khẩu" đối với những người dùng có phân quyền cao hơn actor.
* **Build/typecheck pass chưa?**: **PASS 100%**.

---

## 2. File đã sửa

1. `src/components/users/user-management-client.tsx`
   - Cập nhật giao diện modal "Chi tiết tài khoản" với đầy đủ thông tin và thông báo bảo mật.
   - Thêm nút "Reset mật khẩu" dựa trên quyền (`canManageUser`).
   - Cập nhật giao diện modal "Đổi mật khẩu" để sử dụng Mode B (Sinh mật khẩu tạm thời) thay vì nhận input trực tiếp.
   - Chuyển logic từ `newPassword` sang `tempPassword`.

2. `src/app/(dashboard)/users/actions.ts`
   - Đổi tham số của hàm `resetUserPassword`: loại bỏ input `newPassword` từ client.
   - Thêm hàm `generateSecurePassword(length = 12)` sinh mật khẩu tạm ngẫu nhiên đáp ứng đủ yêu cầu an toàn.
   - Mật khẩu được mã hóa bởi `bcrypt` trước khi lưu vào DB.
   - Hàm trả về `tempPassword` (chỉ 1 lần) thông qua Response object.

3. `scripts/qa-users-password-reset-static.ts`
   - Tạo mới script QA tĩnh xác nhận không leak password qua client, mode B hoạt động và không lưu plaintext.

---

## 3. Detail modal/drawer

Giao diện "Chi tiết tài khoản" hiển thị:
- **Thông tin cơ bản**: Họ tên, Username, Email, Số điện thoại.
- **Trạng thái**: Hoạt động / Đã khóa / Đã xóa (bằng huy hiệu StatusBadge).
- **Vai trò hệ thống**.
- **Ngày tạo**.
- **Công trình được giao**: Liệt kê các danh sách Project đã gán cùng mã (code).
- **Bảo mật tài khoản**: Thông báo bảo mật nổi bật và nút "Reset mật khẩu" (có xác thực quyền truy cập qua hàm `canManageUser()`).

---

## 4. Password policy

* **Mật khẩu gốc**: Mật khẩu hiện tại không thể xem lại. Không có API nào truy vấn `password` hoặc trả `password` về client.
* **Cách phục hồi**: Sử dụng chức năng "Reset mật khẩu" là quy trình duy nhất.
* **Cách lưu trữ**: Password luôn được hash bằng `bcrypt` (cơ chế an toàn 1 chiều) ở server.
* **Mật khẩu tạm**: Khi reset, hệ thống sinh ra một chuỗi ngẫu nhiên 12 ký tự (có đủ HOA, thường, số, ký tự đặc biệt). Chuỗi plaintext này chỉ được hiển thị một lần duy nhất trên UI cho Admin copy và gửi cho người dùng, tuyệt đối không được ghi vào DB hay audit logs.

---

## 5. Permission matrix

| Actor role      | Target role        | Xem chi tiết | Reset password | Ghi chú                                   |
| --------------- | ------------------ | ------------ | -------------- | ----------------------------------------- |
| ADMIN           | Bất kỳ ai          | ✅ Có         | ✅ Có           | Ngoại trừ chính mình                      |
| DIRECTOR        | CHIEF_COMMANDER    | ✅ Có         | ✅ Có           | Mọi quyền < DIRECTOR                      |
| DIRECTOR        | ADMIN              | ✅ Có         | ❌ Không        | Bị vô hiệu hóa nút + Server chặn          |
| DEPUTY_DIRECTOR | DIRECTOR           | ✅ Có         | ❌ Không        | Bị vô hiệu hóa nút + Server chặn          |
| CHIEF_COMMANDER | ENGINEER           | ✅ Có         | ❌ Không        | Chức năng chỉ dành cho High-Level Users   |

---

## 6. Security checklist

| Check                              | Kết quả   |
| ---------------------------------- | --------- |
| Không trả password/hash về client  | ✅ PASS   |
| Không lưu plaintext password       | ✅ PASS   |
| Không log plaintext password       | ✅ PASS   |
| Reset password có role hierarchy   | ✅ PASS   |
| Không self-reset bằng admin action | ✅ PASS   |
| Audit log reset password           | ✅ PASS   |

---

## 7. Lệnh đã chạy

| Lệnh | Kết quả |
| ---- | ------- |
| `npx tsx scripts/qa-users-audit.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-rbac-static.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-ui-role-filter.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-auth-session.ts` | ✅ PASS |
| `npx tsx scripts/qa-users-password-reset-static.ts` | ✅ PASS |
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build` | ✅ PASS |

---

## 8. Git status cuối

```bash
 M src/app/(dashboard)/users/actions.ts
 M src/components/users/user-management-client.tsx
?? docs/qa/USERS_DETAIL_AND_PASSWORD_RESET_FEATURE_REPORT.md
?? scripts/qa-users-password-reset-static.ts
```

```
 src/app/(dashboard)/users/actions.ts            |  21 ++--
 src/components/users/user-management-client.tsx |  83 +++++++++++----
 2 files changed, 76 insertions(+), 28 deletions(-)
```

---

## 9. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không đổi mật khẩu user thật.
* Không xóa/sửa user thật.
