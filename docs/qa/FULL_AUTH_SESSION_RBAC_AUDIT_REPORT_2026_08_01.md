# BÁO CÁO KIỂM THỬ VÀ TỐI ƯU HỆ THỐNG XÁC THỰC, PHIÊN LÀM VIỆC VÀ PHÂN QUYỀN (AUTH, SESSION & RBAC)

**Ngày thực hiện:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Trạng thái kiểm thử:** 🟢 **GO FOR PRODUCTION** (100% Passed)

---

## 1. BỐI CẢNH VÀ NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### 1.1 Hiện trạng lỗi thực tế người dùng gặp phải
Người dùng bị văng khỏi phiên đăng nhập, trình duyệt điều hướng về URL:
`/login?reason=session_expired`

Sau đó nhập đúng tài khoản (`daicongtu2910@gmail.com`) và mật khẩu nhưng giao diện lập tức phản hồi thông báo lỗi chung:
> *"Hệ thống đăng nhập đang gặp sự cố. Vui lòng thử lại hoặc liên hệ quản trị."*

### 1.2 Kết quả điều tra nguyên nhân gốc rễ (Root Causes)

1. **Nguyên nhân 1: Sai lệch cấu hình Database URL giữa môi trường hệ thống và `.env`**
   - Cấu hình trong `.env` chỉ định `DATABASE_URL="postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_dev?schema=public"`.
   - Tuy nhiên, trên máy chủ PostgreSQL local, cơ sở dữ liệu `construction_erp_v2_dev` **không hề tồn tại** (P1003 DatabaseDoesNotExist). Database chuẩn của sản phẩm đã chạy full 16 migrations là `construction_erp_v2_qa`.
   - Mỗi khi người dùng bấm "Đăng nhập", Prisma Client gửi truy vấn tới DB không tồn tại, phát sinh lỗi kết nối cơ sở dữ liệu (500 Error).

2. **Nguyên nhân 2: Khối `catch(error)` che giấu lỗi thực và hiển thị sai thông báo**
   - API `/api/auth/login` chứa khối `try { ... } catch (error)` cấp cao nhất. Mọi lỗi bất kể từ đâu (Database down, SQL error, sai tham số) đều bị biến thành message cứng: *"Hệ thống đăng nhập đang gặp sự cố..."*.
   - Điều này ngăn cản việc hiển thị chính xác lý do đăng nhập thất bại (như Sai mật khẩu, Tài khoản bị khóa, hoặc Mất kết nối DB).

3. **Nguyên nhân 3: Bug render lặp trong Component `LoginPage` (`useEffect` dependency bug)**
   - Trong `src/app/login/page.tsx`, `useEffect` lắng nghe biến `[email]` trong dependency array.
   - Khi có tham số `?reason=session_expired` trên URL, mỗi lần người dùng gõ 1 ký tự vào ô Email, `useEffect` tự động chạy lại và ghi đè trạng thái `error` về *"Phiên đăng nhập đã hết hạn..."*, làm đè lên các phản hồi từ server.

4. **Nguyên nhân 4: Chưa chuẩn hóa dữ liệu đầu vào Email (Whitespace & Case sensitivity)**
   - Email không được `trim()` hoặc tra cứu case-insensitive (`mode: 'insensitive'`), khiến các trường hợp gõ thừa khoảng trắng hoặc ký tự hoa bị từ chối truy cập.

---

## 2. DÃY GIẢI PHÁP VÀ MÃ NGUỒN ĐÃ REMEDIATION

### 2.1 Cấu hình môi trường `.env`
Đã cập nhật `.env` kết nối chính xác tới cơ sở dữ liệu `construction_erp_v2_qa`:
```env
DATABASE_URL="postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa?schema=public"
QA_DATABASE_URL="postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa?schema=public"
AUTH_SECRET="7d0df714335ae7d984444d9791ecb19ca384d31289fcba2f0ed3b5bbc5d2c4db"
```

### 2.2 Chuẩn hóa API Đăng nhập (`src/app/api/auth/login/route.ts`)
- Thêm `trim()` và tra cứu email/username case-insensitive bằng `mode: 'insensitive'`.
- Ánh xạ mã lỗi chuẩn HTTP:
  - `400`: `Email và mật khẩu không được bỏ trống.`
  - `401`: `Email hoặc mật khẩu không chính xác.`
  - `403`: `Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.` (dành cho `deletedAt !== null`)
  - `403`: `Tài khoản hiện không được phép truy cập hệ thống.` (dành cho `!isActive`)
  - `500`: Log lỗi chi tiết lên server console, trả về `Hệ thống đang gặp sự cố. Vui lòng thử lại sau.`

### 2.3 Sửa lỗi UI Client (`src/app/login/page.tsx`)
- Đưa `useEffect` lắng nghe URL parameters về chỉ chạy **1 lần duy nhất trên Mount (`[]`)**.
- Bổ sung bắt lỗi mạng (Fetch Network Error) hiển thị: `Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.`
- Thêm `submittingRef` chống spam click submit liên tục.

---

## 3. MA TRẬN PHÂN QUYỀN VÀ ĐIỀU HƯỚNG BÁO CÁO (9/9 ROLES)

Đã khởi tạo và xác minh thành công tài khoản QA cho toàn bộ 9 vai trò trong hệ thống:

| STT | User Role | Test Account Email | Default Workspace Route | Verified |
| :--- | :--- | :--- | :--- | :---: |
| 1 | **ADMIN** | `qa_admin_2026_07@construction-erp-qa.local` | `/dashboard` | 🟢 PASS |
| 2 | **DIRECTOR** | `giamdoc12@gmail.com` | `/dashboard` | 🟢 PASS |
| 3 | **DEPUTY_DIRECTOR** | `qa.ewr.deputy@company.com` | `/dashboard` | 🟢 PASS |
| 4 | **CHIEF_COMMANDER** | `qa.commander.tuhiep@example.test` | `/projects` | 🟢 PASS |
| 5 | **MANAGER** | `qa.accountant.tuhiep@example.test` | `/projects` | 🟢 PASS |
| 6 | **ENGINEER** | `qa.outsider@example.test` | `/tasks?mine=1` | 🟢 PASS |
| 7 | **STAFF** | `qa.viewer.tuhiep@example.test` | `/tasks?mine=1` | 🟢 PASS |
| 8 | **SUPERVISION_HEAD** | `giamsat12@gmail.com` | `/reports/weekly-inspection` | 🟢 PASS |
| 9 | **CONSTRUCTION_SUPERVISOR** | `qa.supervisor.field@example.test` | `/reports/weekly-inspection` | 🟢 PASS |

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (E2E & UNIT TESTS)

### 4.1 Vitest Unit Suite (`src/lib/__tests__/auth-session-security.test.ts`)
- **Tạo & Verify JWT Session Token:** 🟢 PASS
- **Từ chối Token bị thay đổi (Tampered Token):** 🟢 PASS
- **Từ chối Token sai định dạng:** 🟢 PASS
- **Chống tấn công Open Redirect (`//evil.com`, `https://phishing.com`):** 🟢 PASS
- **Kiểm tra ma trận phân quyền 9 vai trò:** 🟢 PASS

### 4.2 Playwright/Script E2E Test Suite (`scripts/qa/qa-auth-session-security-test.ts`)
```text
==========================================================================
QA AUTOMATED E2E AUTHENTICATION & SESSION SECURITY SUITE (FULL AUDIT)
==========================================================================
[PASS] Validation - Missing Credentials: Status: 400, Error: "Email và mật khẩu không được bỏ trống."
[PASS] Authentication - Invalid Password: Status: 401, Error: "Email hoặc mật khẩu không chính xác."
[PASS] Authentication - Non-existent User: Status: 401, Error: "Email hoặc mật khẩu không chính xác."
[PASS] Authentication - Email Normalization & Case Insensitivity: Status: 200, RedirectTo: "/dashboard", Cookie Set: true
[PASS] RBAC Login - ADMIN: Role: ADMIN, Redirect: "/dashboard" (Expected: "/dashboard")
[PASS] RBAC Login - DIRECTOR: Role: DIRECTOR, Redirect: "/dashboard" (Expected: "/dashboard")
[PASS] RBAC Login - DEPUTY_DIRECTOR: Role: DEPUTY_DIRECTOR, Redirect: "/dashboard" (Expected: "/dashboard")
[PASS] RBAC Login - CHIEF_COMMANDER: Role: CHIEF_COMMANDER, Redirect: "/projects" (Expected: "/projects")
[PASS] RBAC Login - MANAGER: Role: MANAGER, Redirect: "/projects" (Expected: "/projects")
[PASS] RBAC Login - ENGINEER: Role: ENGINEER, Redirect: "/tasks?mine=1" (Expected: "/tasks?mine=1")
[PASS] RBAC Login - STAFF: Role: STAFF, Redirect: "/tasks?mine=1" (Expected: "/tasks?mine=1")
[PASS] RBAC Login - SUPERVISION_HEAD: Role: SUPERVISION_HEAD, Redirect: "/reports/weekly-inspection" (Expected: "/reports/weekly-inspection")
[PASS] RBAC Login - CONSTRUCTION_SUPERVISOR: Role: CONSTRUCTION_SUPERVISOR, Redirect: "/reports/weekly-inspection" (Expected: "/reports/weekly-inspection")
[PASS] Session Expiry - Cookie Deletion on /login?reason=session_expired: Status: 200, Set-Cookie Header: auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
==========================================================================
SUMMARY: 14 / 14 TESTS PASSED.
==========================================================================
```

---

## 5. HƯỚNG DẪN VẬN HÀNH & PHÒNG NGỪA TÁI PHÁT

1. **Chạy lại kiểm thử tự động xác thực bất kỳ lúc nào:**
   ```bash
   npx vitest run src/lib/__tests__/auth-session-security.test.ts
   npx tsx scripts/qa/qa-auth-session-security-test.ts
   ```
2. **Quy tắc bảo mật khi thêm vai trò mới:**
   - Đăng ký vai trò mới trong cả `UserRole` Enum (`schema.prisma`) và `ROLE_WORKSPACE_REGISTRY` (`src/lib/roles/role-workspace-policy.ts`).
   - Cập nhật test case trong `auth-session-security.test.ts` để duy trì độ phủ 100%.
