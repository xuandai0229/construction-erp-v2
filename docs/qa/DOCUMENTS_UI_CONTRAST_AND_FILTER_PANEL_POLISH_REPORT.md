# Báo cáo Triển khai: Documents UI Contrast & Filter Panel Polish

## 1. Executive Summary
Sau đợt tổng vệ sinh UX trước đó, báo cáo UAT đã chỉ ra một vài điểm yếu về tương phản màu sắc (Color Contrast), đặc biệt là các dropdown native trên điện thoại và Chrome Windows. Nền của các `option` bị trong suốt hoặc quá nhạt khiến cho văn bản bị chìm, cực kỳ khó đọc khi sử dụng ngoài trời.

Lần cập nhật này tập trung vào việc **Ép khuôn giao diện Dropdown/Select** để đảm bảo khả năng đọc hiển thị 100% rõ nét, đồng thời tinh chỉnh lại Filter Panel để có nút "Hoàn tất" rõ ràng cho phiên bản mobile.

## 2. Vấn đề UAT phát hiện
- Tương phản kém: `<select>` và `<option>` hiển thị quá trắng, chữ xám nhạt gây mù màu hoặc mờ trên điện thoại khi bật darkmode hoặc ở ngoài trời.
- Placeholder vô nghĩa: Lặp lại từ "Tất cả" liên tục ở 5 cột lọc, gây hoang mang.
- Trạng thái kẹt Filter: Panel mở ra tốn màn hình nhưng không có nút thu gọn rõ ràng ngoài việc bấm lại nút Bộ Lọc.

## 3. Select/dropdown contrast đã sửa
- Bổ sung class `className="bg-white text-slate-900"` cứng cho tất cả các thẻ `<option>` bên trong 8 dropdown của `document-workspace.tsx`.
- Option mặc định được tô đậm `font-medium` để người dùng dễ phân biệt đây là lựa chọn đang nhắm tới toàn bộ danh sách.
- Placeholder của thẻ select upload (Upload Preflight) được chỉnh sang màu xám `text-slate-500` nhưng có nền trắng, giúp nhận biết rõ ràng mục chưa được chọn.

## 4. Placeholder wording đã sửa
- "Tất cả" → "Tất cả loại file"
- "Tất cả" → "Tất cả trạng thái"
- "Tất cả" → "Tất cả phân loại"
- "Tất cả" → "Tất cả thời gian"
- "Tất cả" → "Tất cả người tải"
- "Bình thường" / "Không nhóm" → "Hiển thị bình thường"

Việc thay đổi nhãn giúp thao tác tự tin hơn mà không cần đọc lại tiêu đề label phía trên.

## 5. Filter panel behavior
- Panel mặc định đóng.
- Đã bổ sung thêm một nút **Hoàn tất** (Nền đen slate-800, chữ trắng) ở góc dưới cùng bên phải của Filter Panel. Khi bấm nút này, Panel sẽ thu gọn lại, trả lại 100% không gian cho danh sách tài liệu. Rất hữu ích trên Mobile.
- Dòng Active Filters siêu mảnh gọn gàng, không bị đội giao diện lên khi chọn nhiều bộ lọc.

## 6. Desktop & Mobile Test
- **Desktop:** Các dropdown select xổ xuống đều có chữ màu đen trên nền trắng tuyệt đối. Không còn hiện tượng mờ / xám / trong suốt. Nút "Hoàn tất" của panel tạo cảm giác dứt khoát.
- **Mobile:** `<select>` native của iOS/Android bây giờ nhận được style ép buộc nền trắng chữ đen. Dễ nhìn ngoài nắng.

## 7. Build result
- `npx prisma validate`: Pass
- `tsc --noEmit`: Pass
- `npm run build`: Pass
- Tốc độ compile không ảnh hưởng. Hệ thống chạy trơn tru.

## 8. Kết luận
- **UI contrast**: PASS
- **Filter panel UX**: PASS
- **Mobile usability**: PASS
- **Có migration không**: KHÔNG
- **Push repo cũ**: KHÔNG
- **Production**: NO-GO
