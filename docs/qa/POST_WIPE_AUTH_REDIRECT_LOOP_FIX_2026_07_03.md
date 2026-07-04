# BÁO CÁO FIX LỖI REDIRECT LOOP SAU KHI WIPE DỮ LIỆU
Ngày: 2026-07-03
Mã Phase: POST_WIPE_AUTH_REDIRECT_LOOP_FIX_2026_07_03

## 1. KẾT LUẬN
- **Trạng thái:** PASS
- Lỗi `ERR_TOO_MANY_REDIRECTS` tại `/dashboard` đã được khắc phục hoàn toàn.
- Hệ thống Session/Cookie đã được cấu hình tự động dọn dẹp các phiên đăng nhập ảo (Stale Cookies) bị mồ côi sau sự kiện xóa sạch dữ liệu.

## 2. NGUYÊN NHÂN LỖI (REDIRECT LOOP)
Lý do gây ra vòng lặp vô hạn là do thiết kế Middleware tách biệt với Database (chạy trên Edge):
1. User cũ có JWT Cookie (`auth_session`) hợp lệ về mặt chữ ký số và chưa hết hạn, nên Middleware (`src/proxy.ts`) cho phép đi vào `/dashboard`.
2. Khi vào `/dashboard`, các Server Guard (`requireAuth` trong `src/lib/rbac.ts`) truy vấn DB và phát hiện User ID này không còn tồn tại (bị wipe). `requireAuth` liền ném lệnh `redirect('/login')`.
3. Trình duyệt quay về `/login` với Cookie cũ.
4. Middleware đọc Cookie cũ, thấy hợp lệ (không check DB), lại bẻ hướng `redirect('/dashboard')`. Vòng lặp tiếp diễn vô tận.

## 3. CÁC FILE ĐÃ SỬA
- `src/proxy.ts` (Middleware): Bổ sung luật cho phép truyền query param `?reason=session_expired` vào đường dẫn `/login`. Nếu thấy param này, Middleware tự động XÓA Cookie `auth_session` và cho phép Request đi tiếp thay vì ép redirect về `/dashboard`.
- `src/lib/rbac.ts`: Hàm `requireAuth()` (và các guard tương tự nếu dùng chung logic) khi từ chối người dùng sẽ redirect về `/login?reason=session_expired` thay vì `/login` trơn.
- `src/app/login/page.tsx`: Cập nhật logic `useEffect` để bắt query param `reason=session_expired` và hiển thị thông báo lỗi thân thiện thay vì im lặng.

## 4. XỬ LÝ STALE COOKIE
- Mọi người dùng đã bị xóa (nhưng cookie vẫn lưu ở browser) khi cố vào `/dashboard` sẽ lập tức bị gửi tới `/login?reason=session_expired`.
- Tại đây, Middleware xóa ngay Cookie của họ ở cấp HTTP Header. Người dùng bị force đăng xuất sạch sẽ.

## 5. RULE /LOGIN SAU FIX
- Có Cookie JWT hợp lệ + Không có `reason`: Redirect `/dashboard`.
- Có Cookie JWT + Có `reason=session_expired`: Clear Cookie, Render trang form Login với thông báo phiên hết hạn.
- Không Cookie: Render trang Login.

## 6. RULE /DASHBOARD SAU FIX
- Truy cập không Cookie: Redirect `/login`.
- Truy cập có Cookie nhưng User bị xóa: Redirect `/login?reason=session_expired` (để xóa Cookie và hiển thị thông báo).
- Việc Count Project = 0 (Empty State) là hợp lệ, không gây lỗi Auth.

## 7. TEST VÀ QA
- Chạy thành công chuỗi script `qa-post-wipe-auth-session-test.ts`.
- Ghi nhận `GET /login` trả về 200 (hết bị loop).
- Ghi nhận `GET /dashboard` không Cookie sẽ bắn 307 về `/login` chuẩn chỉ.
- Tất cả protected users và SystemSetting bảo toàn.

## 8. CÓ XÓA/MOVE/SEED GÌ KHÔNG
**KHÔNG.** Hệ thống hiện đang giữ nguyên trạng thái Blank App chuẩn xác, không có file bị move hay data mới bị nhập vào.

## 9. KHUYẾN NGHỊ THAO TÁC CỦA BẠN (BROWSER QA)
1. Hãy vào URL `localhost:3000/dashboard` trên trình duyệt đang test.
2. Trình duyệt sẽ nhận diện DB Wipe và tự động bật ra trang đăng nhập với lỗi "Phiên đăng nhập đã hết hạn".
3. Đăng nhập lại bằng tài khoản Admin duy nhất.
4. Vào Dashboard và các trang `/projects`, `/materials` kiểm tra Empty State không crash.
5. Nếu mọi thứ xanh tươi, hãy xác nhận để tiến hành Quarantine File!
