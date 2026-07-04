# QA Report: Site Report Modal Bottom Cutoff & Textarea UX Fix - 2026/07/04

## A. Kết luận
**PASS**

Toàn bộ các lỗi liên quan đến việc Modal tạo báo cáo hiện trường bị che lấp nội dung ở chân form đã được khắc phục triệt để. Các Textarea nhập liệu đã được nâng cấp chiều cao, chia cột layout hợp lý, cho phép người dùng dễ dàng nhập liệu thực tế ngay cả nội dung dài.

## B. Phân tích lỗi từ ảnh

| Lỗi nhìn thấy | Nguyên nhân code | File sửa | Cách sửa |
| :--- | :--- | :--- | :--- |
| **Bị khuyết/cắt phần dưới** | `pb-32` chưa đủ lớn so với footer cao hơn dự tính, làm body scroll bị hụt không gian hiển thị nội dung phần footer che mất. | `create-report-dialog.tsx` | Chuyển cấu trúc Footer từ `absolute bottom-0` thành `shrink-0` nằm trong flex column gốc. Nội dung cuộn sẽ nằm gọn ở giữa Header và Footer mà không bị che đè. Gỡ bỏ `pb-32` thừa thãi. |
| **Textarea quá thấp/nhỏ** | Đang dùng `min-h-[100px]` và layout 3 cột bị ép chật chội. | `resources-and-quality.tsx` | Nâng `min-h-[130px]`. "Chất lượng thi công" đổi sang chiếm trọn 2 cột. "Vấn đề phát sinh" và "Kiến nghị" chia 50-50 ở hàng tiếp theo. |
| **Lỗi scroll/focus** | Khi focus ô cuối không scroll hết do Footer dùng `absolute` che mất dòng cuối của trình duyệt. | Cả 2 file trên | Xóa Absolute Footer. Bổ sung `scroll-mt-24` để nếu form cuộn tự động đến field báo lỗi, nó sẽ có khoảng đệm phía trên, không bị sát lề gây khó nhìn. |

## C. Layout Trước / Sau
### Trước khi sửa:
- **Modal container:** `flex flex-col`
- **Body scroll:** `flex-1 overflow-y-auto pb-32` (cố tạo khoảng trống ảo)
- **Footer:** `absolute bottom-0 left-0 right-0 z-20` (đè lên body).
- **Textarea height:** `min-h-[100px]` với 3 cột ngang hàng.

### Sau khi sửa:
- **Modal container:** Giữ nguyên `flex flex-col` chiều cao max `92vh`.
- **Body scroll:** `flex-1 overflow-y-auto` (loại bỏ padding-bottom ảo).
- **Footer:** `shrink-0 z-20` (Nằm ngay sau body, hoàn toàn độc lập với vùng scroll, đảm bảo không bao giờ đè lên nội dung).
- **Textarea height:** `min-h-[130px]` với layout `grid-cols-2` ưu tiên nội dung dài.

## D. Textarea UX
1. **Min-height mới:** Nâng từ 100px lên 130px.
2. **Desktop layout:**
   - Nhân công / Vật tư: 2 cột ngang hàng.
   - Kỹ thuật / Chất lượng: Chiếm trọn 100% width (Do đây thường là phần giải trình dài nhất).
   - Vấn đề phát sinh & Kiến nghị / Đề xuất: Chia đôi 50-50 width ngay bên dưới phần Chất lượng.
3. **Mobile layout:** Tự động stack dọc từng khối một (Grid col-span 1), đảm bảo các Textarea giữ nguyên chiều cao 130px để nhập phím ảo dễ dàng.

## E. Các File đã sửa
1. `src/components/reports/create-report-dialog.tsx`
2. `src/components/reports/create-dialog/resources-and-quality.tsx`

## F. Kết quả Lệnh Build
- `npx tsc --noEmit`: **PASS** (Exit code 0)
- `npm run build`: **PASS** (Exit code 0)

## G. Checklist Test Thủ công
- [x] Mở `/reports` > `Tạo báo cáo mới`.
- [x] Cuộn xuống phần dưới cùng của Form báo cáo.
- [x] Xác nhận Footer cố định ở đáy Modal và KHÔNG CÒN CHE LẤP nội dung của thẻ "Kiến nghị/ Đề xuất".
- [x] Focus vào thẻ "Kiến nghị / Đề xuất", nhập một nội dung gồm 5-7 dòng và nhận thấy Textarea có chiều cao 130px, scroll được phần chữ bên trong rõ ràng, không bị Footer che khuất kể cả khi resize dọc xuống.
- [x] Resize màn hình xuống nhỏ (Mobile Size), xác nhận tất cả Textarea xếp dọc gọn gàng và nhập liệu ổn định khi bật bàn phím ảo.
- [x] Đóng mở Modal liên tục, form không bị vỡ Layout. Cấu trúc cuộn mượt mà ngay từ lần đầu tiên mở.
