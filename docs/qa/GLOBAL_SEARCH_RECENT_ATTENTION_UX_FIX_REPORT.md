# Báo Cáo Sửa Lỗi UX Global Search & Recent Attention (Bản Cập Nhật QA)

**Ngày báo cáo:** 01/07/2026
**Người thực hiện:** Senior Frontend QA + Senior Fullstack Engineer

---

## 1. Vấn đề ban đầu & Phản biện
Báo cáo trước đó có một số điểm lỏng lẻo cần phải siết chặt lại để đảm bảo tính minh bạch:
- **Deduplication rủi ro:** Lần trước dùng `notification.id` để khử trùng lặp là sai sót. Nếu một báo cáo vừa sinh ra cảnh báo `app-123` (chờ duyệt) và `rep-123` (có vấn đề), chúng sẽ lọt qua lưới lọc do ID notification khác nhau.
- **Lọc Issues (Empty strings):** Báo cáo trước dùng `{ issues: { not: null, notIn: ["", " "] } }` bằng Prisma. Tuy nhiên, nó vẫn bỏ sót các biến thể chữ thường/hoa như "không có vấn đề gì", "khong co", "none".
- **Chưa UAT Browser:** Báo cáo cũ mâu thuẫn khi ghi lỗi đăng nhập nhưng vẫn ghi PASS. Điều này đã được chấn chỉnh lại.

---

## 2. Giải pháp kỹ thuật đã cập nhật

### 2.1 Chuẩn hóa Dedupe (Khử trùng lặp) bằng Target
Logic khử trùng lặp tại `project-context.ts` đã được viết lại sử dụng `targetType` và `targetId`:
```typescript
const dedupeKey = notification.targetType && notification.targetId 
  ? `${notification.targetType}_${notification.targetId}` 
  : notification.id;
```
Nhờ vậy, nếu cùng một báo cáo có 2 cảnh báo, hệ thống sẽ gộp chúng làm một.
Đồng thời, **luật ưu tiên** đã được thiết lập: 
- Giữ lại bản ghi có `severity = 'HIGH'`.
- Nếu cùng `severity`, giữ lại bản ghi có thời gian `createdAt` mới nhất.

### 2.2 Chuẩn hóa Filter Issues bằng JavaScript (JS-level normalization)
Mở rộng query Prisma (`take: 20`) và áp dụng JS normalization:
- `trim()`, `toLowerCase()`
- Loại bỏ các mảng rác: `["", "không có", "khong co", "không có vấn đề", "không có vấn đề gì", "none", "n/a", "na"]`
- Chặn các câu bắt đầu bằng `"không có"` hoặc `"khong co"`.
- Cắt lại `slice(0, 3)` để lấy 3 báo cáo có vấn đề mới nhất.

### 2.3 Làm rõ Giới hạn (Limit)
- Dữ liệu "Cần chú ý gần đây" được cung cấp thông qua `globalContext.notifications`.
- Quá trình lấy dữ liệu: Tối đa 5 Approvals + Tối đa 3 Issue Reports (sau khi filter JS).
- Sau khi gộp và Dedupe, kết quả cuối cùng bị cắt bởi `uniqueNotifications.slice(0, 5)`.
- **Kết luận Limit:** Cả Popup Global Search và Dashboard Notification Center (vì dùng chung data) hiện tại đều hiển thị **tối đa 5 items** quan trọng nhất.

---

## 3. UI/UX Global Search
- **Nút X Đóng Popup:** Tồn tại ở góc trên bên phải thay cho chữ `ESC` cũ. Layout không bị lệch. (Vẫn hỗ trợ phím Esc và Click outside).
- **Nút X Xóa Query:** Hiện ra trong ô input khi có text. Click vào chỉ xóa text, con trỏ chuột auto-focus lại ô input, popup KHÔNG BỊ ĐÓNG.

---

## 4. Xác minh Phạm Vi Công Trình (Selected Project Scope)
**Tình trạng:** Đã xác minh qua code path (logic truyền `selectedProjectId` vào query an toàn).

### Checklist Manual UAT cho Tester:
- [ ] Chọn "Dự án Trần Quang Hiếu" trên Header -> Mở Global Search -> Kiểm tra "Cần chú ý gần đây" chỉ hiện dữ liệu dự án này.
- [ ] Chọn "Dự án Tây Hồ" -> Mở lại Global Search -> Kiểm tra danh sách đổi sang dữ liệu Tây Hồ, không còn dính dữ liệu dự án cũ.
- [ ] Chọn "Toàn hệ thống" -> Mở Global Search -> Kiểm tra danh sách hiển thị dữ liệu tổng hợp theo quyền user (tối đa 5 item).

---

## 5. Xác minh Điều hướng (Deep Linking)
- Phê duyệt: `/approvals?projectId=...&id=...&open=1`
- Báo cáo: `/reports?projectId=...&reportId=...&open=1`
Popup search sẽ đóng sau khi click và drawer chi tiết mở ra đúng nội dung ở trang đích.

---

## 6. Kết quả Verification
- **Prisma Validate:** PASS 🚀 (Đã chạy thực tế `npx prisma validate` thành công)
- **TypeScript Check (`npx tsc --noEmit`):** PASS 🚀 (Đã chạy thực tế thành công)
- **Build Server (`npm run build`):** PASS 🚀 (Đã chạy thực tế compile thành công)
- **UAT Browser Runtime:** **CHƯA THỰC HIỆN ĐƯỢC** do lỗi đăng nhập/môi trường bot. Hiện mới xác minh bằng code-review, typecheck và build. Cần manual UAT trên trình duyệt thật theo Checklist ở phần 4.

---

## 7. Kết luận
- Toàn bộ các điểm mâu thuẫn đã được làm rõ và trung thực báo cáo.
- **Sẵn sàng cho manual UAT nội bộ. Chưa chốt production PASS cho đến khi test trình duyệt thật.**
