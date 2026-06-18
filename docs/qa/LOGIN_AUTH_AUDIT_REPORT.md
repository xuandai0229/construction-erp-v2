# Báo Cáo Kiểm Tra Lỗi Đăng Nhập (Login Auth Audit Report)

## 1. Mô tả lỗi người dùng gặp
Khi người dùng nhập tài khoản và mật khẩu, ấn nút đăng nhập thì hệ thống báo lỗi chung chung: **"Đã xảy ra lỗi khi đăng nhập"**. Người dùng không thể truy cập vào hệ thống mặc dù có thể đã nhập đúng thông tin.

## 2. Các file đã kiểm tra
- `src/app/login/page.tsx` (Giao diện đăng nhập)
- `src/app/api/auth/login/route.ts` (API xử lý đăng nhập)
- `src/lib/auth.ts` (Hàm thiết lập session)
- `src/lib/session-token.ts` (Hàm tạo và ký JWT/session token)
- `.env` và `.env.example` (Biến môi trường)
- `prisma/schema.prisma` (Database Schema)

## 3. Nguyên nhân gốc rễ
1. **Thiếu biến môi trường quan trọng:** Trong file `.env` hiện tại chỉ có `DATABASE_URL` và hoàn toàn thiếu biến `AUTH_SECRET` (hoặc `SESSION_SECRET`).
2. **Crash ở hàm tạo token:** Khi API login gọi hàm `setSession(user.id)`, hàm này gọi tiếp `createSessionToken` và sau đó gọi `sign(encodedPayload)`. Trong `sign`, hệ thống lấy secret từ `getSessionSecret()`. Vì thiếu biến môi trường, hàm này ném ra lỗi (throw Error): `"AUTH_SECRET hoặc SESSION_SECRET chưa được cấu hình."`.
3. **Bắt lỗi (Try/Catch) chung chung:** Lỗi throw từ việc thiếu secret bị catch lại ở `src/app/api/auth/login/route.ts`. API log lỗi ra console nhưng trả về cho UI một message cứng là `Đã xảy ra lỗi khi đăng nhập` với status 500.

## 4. Mức độ lỗi
**Critical (Nghiêm trọng)** - Chặn toàn bộ người dùng đăng nhập vào hệ thống, làm tê liệt quy trình sử dụng app.

## 5. Phương án sửa
1. **Bổ sung Env:** Thêm biến `AUTH_SECRET` vào `.env` với một chuỗi bảo mật ngẫu nhiên (hoặc cung cấp script để tạo tự động).
2. **Cải thiện API Error Handling:** Ở route đăng nhập, nếu cần, log chi tiết lỗi ra console và giữ nguyên logic trả về lỗi 500 cho UI, nhưng kèm theo việc check lại các thông báo lỗi 401 cho trường hợp sai email/mật khẩu để hiển thị thân thiện hơn (hiện tại đã có `"Email và mật khẩu không được bỏ trống"`, `"Tài khoản không tồn tại, đã bị khóa hoặc đã bị xóa"`, `"Mật khẩu không chính xác"`).
3. **Cập nhật UI/UX (Phần 3):** Làm lại toàn bộ giao diện màn đăng nhập hiện đang bị cứng và tối màu, chuyển sang giao diện chuyên nghiệp, sáng sủa, theo phong cách ERP công trình hiện đại (responsive 2 cột trên desktop, 1 cột trên mobile).

## 6. Rủi ro nếu sửa sai
- Nếu tạo `AUTH_SECRET` quá yếu hoặc hardcode trong code: sẽ dễ bị tấn công giả mạo phiên đăng nhập (Session Hijacking / Forging).
- Nếu vô tình tắt bảo vệ middleware để bypass: sẽ gây ra lỗ hổng bảo mật nghiêm trọng (IDOR, Unauthorized Access) cho toàn hệ thống.

## 7. Checklist test sau sửa
- [ ] Chạy lại lệnh tạo `AUTH_SECRET` và đưa vào `.env`.
- [ ] Đăng nhập đúng: Chuyển hướng vào trang Dashboard.
- [ ] Đăng nhập sai: Báo lỗi "Mật khẩu không chính xác".
- [ ] Đăng nhập không tồn tại: Báo "Tài khoản không tồn tại, đã bị khóa hoặc đã bị xóa".
- [ ] Trải nghiệm UI/UX mới: Responsive tốt trên Mobile, Desktop. Không bị vỡ form. Contrast rõ ràng.
- [ ] Autofocus vào input email, enter để submit form.
- [ ] Vẫn giữ an toàn bảo mật, route protected hoạt động tốt.
