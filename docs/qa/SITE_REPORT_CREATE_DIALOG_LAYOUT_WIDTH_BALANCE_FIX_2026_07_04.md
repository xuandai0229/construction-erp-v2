# QA Report: Site Report Create Dialog Layout Width Balance Fix - 2026/07/04

## A. Kết luận
**PASS**

Form "Tạo báo cáo mới" đã được tinh chỉnh mở rộng kích thước tối ưu trên màn hình Desktop (từ max-width 5xl ~1024px lên max-width 6xl ~1152px). Toàn bộ nội dung Body, đặc biệt là khu vực "Khối lượng thực hiện hôm nay", được phân bổ diện tích tối đa (1100px), giúp loại bỏ cảm giác tù túng, bó hẹp của layout cũ. Responsive trên Tablet/Mobile vẫn đảm bảo hiển thị hoàn hảo.

## B. Phân tích trước khi sửa
- **Modal cũ rộng bao nhiêu:** `max-w-5xl` (~1024px) với Container nội dung Body bên trong chỉ rộng `max-w-4xl` (~896px). Việc này dẫn đến form bị dư thừa khoảng trống 2 bên rất lớn trên màn hình to, trong khi nội dung (như bảng khối lượng, các ô text) lại bị ép nhỏ lại.
- **Vấn đề bố cục:** Layout 1 cột với khoảng biên thừa thải làm form trông thiếu chuyên nghiệp. Summary Cards tuy nhỏ gọn nhưng không tận dụng được màn hình rộng.
- **Vấn đề phần khối lượng:** Đây là phần quan trọng nhất nhưng có width khá hẹp. Nút bấm mang text dài `+ Thêm từ khối lượng gốc` gây tốn không gian và không thật sự tinh tế.
- **Vấn đề footer:** Tương tự Body, Footer cũng bị bó khung `max-w-4xl` ở giữa màn hình nên không cân đối với độ rộng tự nhiên của toàn modal.

## C. Thay đổi đã làm
- **File đã sửa:** `src/components/reports/create-report-dialog.tsx`
- **Class/layout đã đổi:**
  - Nới rộng Modal gốc từ `max-w-5xl` thành cấu trúc Responsive hiện đại: `w-[calc(100vw-16px)] md:w-[min(1180px,calc(100vw-48px))] max-w-6xl`.
  - Mở rộng Container nội dung Body từ `max-w-4xl` thành `max-w-none md:max-w-[1100px]`. Thay đổi này lập tức giải phóng diện tích cho toàn bộ các Section.
- **Khối lượng thực hiện hôm nay:** Được hưởng toàn bộ width mới (1100px) giúp bảng Table hiển thị cực kỳ thoáng. 
- **Đổi Text:** Nút `+ Thêm từ khối lượng gốc` đổi thành `<Plus Icon/> Thêm khối lượng` nằm bên góc phải, tinh giản, đẹp mắt.
- **Empty State khối lượng:** Rút gọn đoạn text trống thành: *"Chưa có khối lượng trong báo cáo. Bấm Thêm khối lượng để chọn công việc từ bảng khối lượng gốc."*
- **Footer:** Chỉnh Container của Footer thành `max-w-none md:max-w-[1100px] w-full`, kéo 2 nhóm nút ra sát 2 mép đồng bộ hoàn hảo với Body phía trên.

## D. Checklist UI

| Hạng mục | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| Modal rộng hơn | ✅ | Đã tăng lên max ~1152px. Không còn bị bó ở giữa. |
| Body thoáng hơn | ✅ | Các form control như File, Camera, Textareas dàn đều theo Grid cân xứng. |
| Khối lượng full width/nổi bật | ✅ | Bảng table trải dài 100% diện tích container (1100px). Không bị khuất chữ. |
| Nút `Thêm khối lượng` | ✅ | Đã đổi tên chuẩn xác, thêm icon `<Plus/>` cho sinh động. |
| Summary cards cân đối | ✅ | Grid chia 4 cột hiển thị cực kỳ sang trọng với Layout rộng. Không bị chen chúc. |
| Footer không che nội dung | ✅ | Căn lề đồng nhất theo width của Body (1100px). Trực quan. |
| Responsive không vỡ | ✅ | Trên mobile, form tự co lại về `100vw - 16px`, các thẻ tự stack thành 1 cột mượt mà. |
| Các section cũ còn đủ | ✅ | Không phá chức năng hay xóa đi bất kì logic/bước nhập liệu nào. |

## E. Kết quả lệnh
- `npx tsc --noEmit`: **PASS** (Exit code 0)
- `npm run build`: **PASS** (Exit code 0)
- Mọi chức năng Flow API không bị tác động, không cần kiểm thử lại DB Layer.

## F. Checklist test tay
- [x] 1. Mở `/reports`.
- [x] 2. Bấm `Tạo báo cáo mới`.
- [x] 3. Kiểm tra modal rộng hơn ảnh cũ rõ rệt (Trải đều ra 2 mép màn hình).
- [x] 4. Kiểm tra summary cards xếp dàn ngang đều đặn 4 thẻ trên desktop.
- [x] 5. Kiểm tra phần `Khối lượng thực hiện hôm nay` trải dài toàn bộ chiều rộng form, Header dễ nhìn.
- [x] 6. Kiểm tra góc phải phần khối lượng có nút màu xanh mang dòng chữ `Thêm khối lượng` kèm Icon.
- [x] 7. Bấm nút, WorkPicker mở đúng, mượt.
- [x] 8. Chọn công việc, bảng khối lượng hiển thị rõ, có không gian để nhập liệu thoải mái.
- [x] 9. Cuộn xuống cuối form, footer nằm tách biệt phía đáy không hề lấp nội dung Textarea cuối.
- [x] 10. Thu nhỏ cửa sổ trình duyệt xuống kích thước Mobile, xem các cột tự dồn thành hàng dọc hoàn hảo.
