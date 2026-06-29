# PRE-BUILD MULTI-USER STABILITY / UX / DEPLOYMENT READINESS AUDIT REPORT

**Ngày kiểm:** 2026-06-18  
**Phiên bản:** Next.js 16.2.7 + PostgreSQL + Prisma 7.8.0  
**Trạng thái:** CHỈ AUDIT — CHƯA SỬA CODE

---

## 1. KẾT LUẬN: App có phù hợp nhiều người dùng qua mạng không?

**CÓ — nhưng cần fix một số lỗi CRITICAL trước khi đưa người dùng thật.**

App hiện chạy kiểu **web server** (Next.js). PostgreSQL là database chung. Nhiều người dùng CÓ THỂ truy cập đồng thời qua trình duyệt nếu cùng mạng LAN.

---

## 2. Điều kiện để nhiều người dùng nhập cùng lúc

- **1 máy chủ** chạy `npm run build && npm start` (port 3000)
- **1 PostgreSQL** chạy trên máy chủ (port 5432)
- Người dùng khác truy cập qua `http://<IP-máy-chủ>:3000`
- Cần mở firewall port 3000 + 5432 (nếu DB riêng)
- Nếu mỗi máy chạy localhost riêng → dữ liệu BỊ TÁCH nếu DB khác nhau
- Nếu mất mạng → app **không hoạt động**, không có offline mode

---

## 3. Mô hình deploy đề xuất

**Đề xuất: LAN Server** — 1 máy tính cố định chạy Next.js + PostgreSQL, các máy khác truy cập qua IP nội bộ. Đơn giản nhất cho giai đoạn đầu.

Máy chủ cần: PostgreSQL service + Next.js server. Người dùng truy cập bằng `http://192.168.x.x:3000`.

---

## 4. Kết quả test multi-user

| Tiêu chí | Kết quả |
|----------|---------|
| Database chung | ✅ PostgreSQL duy nhất |
| Session lẫn user | ✅ Không — cookie auth_session per-browser |
| Refresh thấy dữ liệu mới | ✅ Có — Server Components + revalidatePath |
| Redirect sai quyền | ✅ Không — RBAC check mỗi page/action |

**Rủi ro:** Không có middleware.ts → auth check ở component level, có thể flash content. Session token Base64 không ký → giả mạo được nếu biết userId.

---

## 5. Kết quả test concurrency/ghi đè

### Daily Entry (2 tab cùng ngày/công việc)
- Tab A lưu qty=10, Tab B lưu qty=15 → **Dữ liệu cuối = 15** (last-write-wins)
- ❌ Không có cảnh báo ghi đè
- ❌ Không có optimistic locking / updatedAt check
- ✅ Có audit log

### Material Request (2 tab cùng phiếu)
- Cùng pattern last-write-wins
- ❌ Có thể mất dữ liệu nếu Tab B không có data mới nhất

---

## 6. Kết quả test double-click/double-submit

| Nút | Loading? | Disabled? | Toast/Confirm? |
|-----|---------|-----------|----------------|
| Đăng nhập | ✅ | ✅ | ✅ |
| Tạo tài khoản | ✅ | ✅ | ✅ |
| Sửa tài khoản | ✅ | ✅ | ✅ |
| Khóa/Mở khóa | ✅ | ✅ | ✅ ConfirmDialog |
| Xóa mềm/Khôi phục | ✅ | ✅ | ✅ ConfirmDialog |
| Đổi mật khẩu | ✅ | ✅ | ✅ |
| Lưu khối lượng ngày | ✅ | ✅ | ✅ |
| Thêm công việc phát sinh | ✅ | ✅ | ✅ |
| **Xóa công trình** | ❌ | ❌ | ❌ Thiếu ConfirmDialog |
| **Tạo phiếu vật tư** | ❌ | ❌ | ⚠️ Cần kiểm |
| Hủy phiếu vật tư | ✅ | ✅ | ✅ |

**CRITICAL:** `createMaterialRequest` dùng `count+1` sinh requestNo → race condition khi 2 user tạo cùng lúc.

---

## 7. Kết quả test click UX có mượt không

Phần lớn nút có loading state và disabled khi xử lý → UX mượt. Ngoại trừ:
- deleteProject thiếu confirm
- Material Request Form thiếu loading pattern rõ ràng
- Không có request timeout → loading vĩnh viễn nếu server die

---

## 8. Kết quả test mobile

Phân tích code responsive patterns:
- `/login`: ✅ max-w-md centered
- `/users`: ✅ Desktop table + Mobile cards (breakpoint lg:)
- `/projects`: ✅ Grid responsive
- `/field-progress/daily`: ✅ Desktop table + Mobile grouped cards + sticky save bar + pb-24
- `/field-progress/summary`: ✅ Desktop/Mobile views riêng
- `/material-requests`: ✅ Desktop/Mobile views
- ConfirmDialog: ✅ max-w-md w-full p-4, không tràn
- Toast: ✅ fixed bottom-4 right-4, z-[100], auto-dismiss 3s

---

## 9. Kết quả test network/mất kết nối

| Kịch bản | Kết quả |
|----------|---------|
| Server tắt khi đang nhập | ❌ App treo, không hiện lỗi rõ |
| Submit khi server không phản hồi | ❌ Loading vĩnh viễn |
| Mất mạng LAN | ❌ Không có banner cảnh báo |
| Autosave/local draft | ❌ Không có |
| beforeunload warning | ⚠️ Chỉ cho date change, không có global |

**Đánh giá rủi ro:** MEDIUM — chấp nhận được cho UAT nội bộ, cần cải thiện trước production.

---

## 10. Kết quả RBAC

| Quy tắc | Code check | Kết quả |
|---------|-----------|---------|
| Admin/Director/Deputy xem toàn bộ | `HIGH_LEVEL_ROLES` | ✅ |
| Commander chỉ xem CT được giao | `canAccessProject` | ✅ |
| Commander không vào /users | `canManageUsers` + redirect | ✅ |
| Commander không vào /projects/new | `requireManagementAccessOrRedirect` | ✅ |
| Commander không vào CT khác bằng URL | `requireProjectAccessOrRedirect` | ✅ |
| Soft-deleted user không login | `deletedAt !== null → null` | ✅ |
| Sidebar ẩn mục Commander | `getVisibleNavItems` | ✅ |

Script `qa-rbac-direct-url-access-test.ts`: ⚠️ SKIP — cần seed RBAC test data.

---

## 11. Kết quả kiểm dữ liệu sau cleanup

| Tiêu chí | Kết quả |
|----------|---------|
| safeToCleanup.projects | ✅ = 0 |
| safeToCleanup.materialRequests | ✅ = 0 |
| safeToCleanup.users | ✅ = 0 |
| needsConfirmation.projects | ⚠️ = 6 |
| needsConfirmation.fieldProgressEntries | ⚠️ = 40 (qty=266.4 duplicates) |
| keep.projects | ✅ = 1 (CT-001) |
| keep.users | ✅ = 6 |

---

## 12. Kết quả build/test

| Test | Kết quả |
|------|---------|
| prisma validate | ✅ PASS |
| prisma generate | ✅ PASS |
| tsc --noEmit | ✅ PASS |
| npm run build | ✅ PASS (21 routes) |
| qa-user-management-edit-detail | ✅ PASS |
| qa-user-management-soft-delete-restore | ✅ PASS |
| qa-rbac-direct-url-access | ⚠️ SKIP (thiếu seed) |
| qa-field-progress-rollup | ✅ PASS |
| qa-field-progress-volume-guard | ✅ PASS (13/13) |
| qa-material-requests-integration | ✅ PASS |

Script `qa-material-requests-crud-test.ts`: KHÔNG chạy (tạo rác, không cleanup).

---

## 13. Danh sách lỗi cần fix ngay trước build

### CRITICAL (Không được build nếu còn)

| # | Lỗi | File |
|---|------|------|
| C1 | Session token Base64 không ký — giả mạo được | `src/lib/auth.ts:57` |
| C2 | Race condition sinh requestNo (count+1) | `src/app/actions/material-request.ts:16` |
| C3 | Không có middleware.ts — thiếu route-level auth | Thiếu file |
| C4 | Login page hardcode credentials mặc định | `src/app/login/page.tsx:10-11` |

### HIGH (Nên fix trước user thật)

| # | Lỗi | File |
|---|------|------|
| H1 | Không có optimistic locking (concurrency) | Daily + Material actions |
| H2 | Material Request Form thiếu loading/disabled | `material-request-form.tsx` |
| H3 | deleteProject thiếu ConfirmDialog | `projects/page.tsx` |
| H4 | Không có cảnh báo mất mạng | Toàn app |
| H5 | Không có beforeunload warning | Daily entry, forms |
| H6 | 40 duplicate entries cần dọn | Database CT-001 |
| H7 | 6 test projects chưa dọn | Database |
| H8 | qa-material-requests-crud-test.ts tạo rác | Script |

---

## 14. Danh sách lỗi có thể để sau

### MEDIUM

| # | Lỗi |
|---|------|
| M1 | RBAC test script cần seed data |
| M2 | Toast có thể che nút mobile (tạm OK vì auto-dismiss) |
| M3 | ConfirmDialog nút X absolute positioning |
| M4 | Không có request timeout |

### LOW

| # | Lỗi |
|---|------|
| L1 | Login text "Môi trường Development" |
| L2 | Default password "Test@123456" trong form tạo TK |

---

## 15. Đề xuất có nên build/deploy bản dùng thử chưa

**CÓ THỂ build bản thử nội bộ** sau khi fix C1-C4.

Điều kiện tối thiểu:
1. Fix C1: Ký session token
2. Fix C2: Unique constraint cho requestNo
3. Fix C3: Thêm middleware.ts
4. Fix C4: Xóa credentials mặc định
5. Fix H6+H7: Dọn dữ liệu test

Nếu chỉ thử nội bộ 3-5 người: chấp nhận H1 (optimistic locking), H4 (offline warning) tạm.

---

## 16. Xác nhận không commit/push

- [x] Báo cáo đầy đủ 16 mục
- [x] Build/test chính đã chạy
- [x] Kiểm multi-user (code analysis)
- [x] Kiểm mobile (responsive pattern analysis)
- [x] Kiểm double-click/double-submit
- [x] Kiểm RBAC
- [x] Kiểm dữ liệu sau cleanup
- [x] Chỉ báo cáo, CHƯA sửa code
- [x] **KHÔNG commit/push**
