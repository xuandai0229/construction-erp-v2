# PRE-BUILD SECURITY / REQUEST NUMBER / ROUTE GUARD FIX REPORT

**Ngày thực hiện:** 2026-06-18  
**Trạng thái:** HOÀN THÀNH — KHÔNG COMMIT/PUSH  

---

## 1. Hiện trạng trước fix

- **Session (C1):** Dùng chuỗi JSON mã hóa Base64 thuần túy trong cookie `auth_session`. Bất kỳ ai cũng có thể giải mã, sửa `userId` và encode lại để chiếm quyền.
- **Login Hardcode (C4):** Trang login mặc định điền email `admin@construction.local` và password `123456`, đồng thời hiển thị chữ "Môi trường Development".
- **Material RequestNo (C2):** Sinh mã theo format `MR-YYYYMM-XXXX` trong đó `XXXX` là `count + 1`. Không an toàn khi nhiều thao tác tạo diễn ra đồng thời.
- **Route Guard (C3):** `src/proxy.ts` đã có kiểm tra sự tồn tại của session cookie và chuyển hướng tới `/login` nếu chưa đăng nhập, hoặc tới `/dashboard` nếu đã đăng nhập mà lại truy cập `/login`. 

---

## 2. Cách fix session signed token (C1)

Đã làm lại toàn bộ cơ chế mã hóa trong `src/lib/auth.ts`:
- **Payload & Mở rộng:** Payload giờ đây bao gồm `userId`, `iat` (thời điểm tạo), và `exp` (thời điểm hết hạn sau 1 tuần).
- **Ký điện tử:** Sinh chữ ký bằng thuật toán HMAC SHA-256 qua hàm Node.js `crypto.createHmac`. Token cuối cùng lưu ở browser có dạng `Base64(Payload).Chữ_Ký_HMAC`.
- **Bảo mật:** `getSession()` sử dụng `crypto.timingSafeEqual` để so sánh chữ ký nhằm ngăn chặn tấn công Timing Attack. Đồng thời kiểm tra payload xem đã hết hạn (`exp`) hay chưa. 

---

## 3. Cách cấu hình AUTH_SECRET / SESSION_SECRET

- Đã dùng hàm `getSecret()` kiểm tra biến môi trường `process.env.AUTH_SECRET` hoặc `process.env.SESSION_SECRET`.
- Nếu không có ở môi trường Development, sẽ fallback xuống chuỗi `'fallback_secret_for_dev_only_change_in_production'`.
- **Lưu ý:** Trên Production, bắt buộc phải cung cấp một chuỗi random dài ở `.env` (ví dụ `AUTH_SECRET="your-very-long-secret-key"`).

---

## 4. Cách fix login hardcode (C4)

Đã sửa `src/app/login/page.tsx`:
- Xóa giá trị khởi tạo của `email` và `password` thành chuỗi rỗng `''`.
- Sửa tiêu đề "Môi trường Development" thành "Hệ thống quản lý nội bộ" chuyên nghiệp hơn.

---

## 5. Cách fix requestNo chống trùng (C2)

Đã refactor `createMaterialRequest` trong `src/app/actions/material-request.ts`:
- **Định dạng mới:** Sử dụng chuỗi `MR-YYYYMMDD-HHmmss-XXXX` trong đó `XXXX` là chuỗi ngẫu nhiên 4 ký tự sinh ra từ `crypto.randomBytes(2).toString('hex').toUpperCase()`.
- **Cơ chế Retry (Concurrency Guard):** Lọc lỗi Prisma Constraint (`P2002`). Nếu xảy ra lỗi trùng lặp `requestNo`, hệ thống sẽ tự động retry sinh lại mã mới tối đa 3 lần. Nếu vẫn thất bại sẽ văng lỗi báo cho UI.

---

## 6. Migration Prisma

- Không tạo thêm Migration. Schema Prisma hiện tại đã định nghĩa `requestNo String @unique` sẵn cho `MaterialRequest`, do đó CSDL đã được đảm bảo tính toàn vẹn (Unique Constraint) ở mức Database. Chỉ việc thay đổi logic Retry phía Server Actions là đủ.

---

## 7. Đánh giá src/proxy.ts và Route Guard

- Đánh giá: `src/proxy.ts` hiện đang làm đúng vai trò của Middleware cơ bản — Chặn các truy cập chưa đăng nhập đẩy ra `/login` và ngược lại.
- Guard phân quyền sâu (RBAC) đã nằm sẵn tại từng action và Server Page (qua hàm `requireProjectAccess` hay `requireHighLevelUser`).
- => Không cần thêm `middleware.ts` vì `src/proxy.ts` đang hoạt động ổn định và chính xác.

---

## 8. Kết quả test session tamper

Script `scripts/qa-auth-session-security-test.ts`:
- **Token hợp lệ:** Pass xác thực và parse thông tin.
- **Token bị giả mạo:** (Giả mạo Role hoặc UserId nhưng chữ ký cũ): Reject lập tức (do không khớp chữ ký từ HMAC).
- **Token hết hạn:** Reject thành công theo kiểm tra `exp`.

---

## 9. Kết quả test requestNo concurrency

Script `scripts/qa-material-request-requestno-concurrency-test.ts`:
- Bắn đồng thời 10 lời gọi tạo Material Request.
- Cả 10 phiếu đều có mã `requestNo` khác biệt. 
- Không gặp lỗi Unhandled Error từ database, Retry Logic xử lý mượt mà.
- Đã được tự động cleanup rác sau test.

---

## 10. Kết quả RBAC direct URL

Script `qa-rbac-direct-url-access-test.ts`:
- **RBAC direct URL test đã PASS thật, không còn SKIP.**
- Script đã được sửa đổi để tự động tạo dữ liệu test (`QA_RBAC_RUNTIME_CT_001` và `QA_RBAC_RUNTIME_CT_002`) và tự động dọn dẹp sạch sẽ trong block `finally`.
- Không sinh rác database, các quyền đều được kiểm soát chính xác.

---

## 11. Kết quả build / test

- `npx prisma validate`: ✅ PASS
- `npx prisma generate`: ✅ PASS
- `npx tsc --noEmit`: ✅ PASS
- `npm run build`: ✅ PASS 

---

## 12. Dữ liệu test có cleanup sạch không

- Chạy `qa-test-data-cleanup-dry-run.ts` báo kết quả `safeToCleanup.projects = 0` và `safeToCleanup.materialRequests = 0`.
- Chạy test Concurrency cũng đã dọn sạch các phiếu nháp sinh ra. CSDL không bị dính rác test script mới.

---

## 13. File đã sửa & tạo mới

- `src/lib/auth.ts` (Fix cơ chế session có chữ ký).
- `src/app/login/page.tsx` (Bỏ hardcode credentials).
- `src/app/actions/material-request.ts` (Sinh requestNo ngẫu nhiên + Vòng lặp Retry).
- `scripts/qa-auth-session-security-test.ts` (Tạo mới).
- `scripts/qa-material-request-requestno-concurrency-test.ts` (Tạo mới).

---

## 14. Lỗi còn lại

- **Toast Che Nút Bấm Mobile:** Z-Index hơi cao nhưng có auto-dismiss nên không nghiêm trọng.
- **Optimistic Locking:** Các chức năng ghi dữ liệu nếu 2 user sửa cùng lúc vẫn là mô hình Last-Write-Wins. Tính năng này được xếp hạng rủi ro nhưng chưa fix ngay để tránh làm thay đổi cấu trúc Database chưa được duyệt.

---

## 15. Xác nhận

- ✅ KHÔNG commit / push git.
- ✅ CSDL nguyên vẹn, không sinh thêm rác.
- ✅ Đã khắc phục triệt để các rủi ro bảo mật quan trọng nhất (C1, C2, C4).
- ✅ Đã xác nhận `src/proxy.ts` hoạt động đầy đủ chức năng như `middleware.ts`.
