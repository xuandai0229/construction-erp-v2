# Báo Cáo Đánh Giá UX Module Bảng Khối Lượng Hiện Trường (Trước Tối Ưu)

## 1. Đánh giá tổng quan các câu hỏi UX
1. **Người dùng có nhập nhanh được không?**
   - Tốc độ nhập đang ở mức trung bình. Việc nhập nhiều cột ngang (gồm cả Khó khăn, Ghi chú, Vật tư) làm phân tán sự tập trung.
2. **Có phải bấm quá nhiều nút không?**
   - Vẫn còn nhiều cột ngang trải dài trên Desktop khiến người dùng phải lướt chuột ngang (scroll ngang). 
3. **Bảng có quá nhiều cột không?**
   - **Có**. Màn Daily đang có tới 12 cột. Đối với kỹ sư ngoài công trường (thường dùng điện thoại hoặc laptop nhỏ), đây là một cực hình.
4. **Có dễ phân biệt cột nhập tay và cột tự tính không?**
   - Cột nhập "KL hôm nay" đã có nền `bg-blue-50` và viền input. Nhưng các cột readonly (Tổng thiết kế, Lũy kế trước/sau, %) dù đã readonly nhưng thiếu sự ngăn cách rõ ràng (màu sắc cảnh báo) với ô input chính.
5. **Người dùng có biết nên nhập vào đâu không?**
   - Ô Input "KL Hôm nay" tương đối dễ thấy do nằm ở giữa, nhưng bị chìm giữa các input của "Khó khăn" và "Ghi chú".
6. **Có thể nhập bằng Tab/Enter như Excel không?**
   - **Chưa tối ưu**. Bấm Tab sẽ nhảy ngang qua "Khó khăn" -> "Ghi chú" thay vì nhảy dọc xuống công việc tiếp theo như mong muốn khi đi công trường (thường chỉ nhập KL dọc). Bấm Enter chưa hỗ trợ focus xuống dòng dưới.
7. **Mobile có dễ nhập không?**
   - **Rất tệ**. Hiện tại mobile đang sử dụng Responsive Table (`overflow-x-auto`). Người dùng phải vuốt ngang bảng mỏi tay mới tới được ô nhập.
8. **Chữ/input có quá nhỏ hoặc quá nhiều không?**
   - Khá nhiều text nhỏ, đặc biệt là các cột ghi chú trống trải.
9. **Có dòng nào làm người dùng nhầm giữa “lũy kế” và “khối lượng hôm nay” không?**
   - "Lũy kế trước", "KL Hôm nay", "Lũy kế sau" xếp kề nhau, dễ gây rối mắt nếu số lượng dòng quá lớn (30-50 dòng).
10. **Màn daily có đang quá giống bảng quản trị thay vì màn nhập nhanh ngoài công trường không?**
    - **Có**. Giao diện bảng (Grid Table) rất phù hợp với Văn phòng (Master Table / Summary), nhưng đối với anh em đi công trường thì quá "cồng kềnh". Họ cần giao diện dạng Phiếu/Card hoặc Bảng rút gọn cực đỉnh.

## 2. Kế hoạch Tối Ưu UX
### Màn Master Table (`/field-progress`)
- Bổ sung Empty State rõ ràng hướng dẫn tạo "Hạng mục cha".
- Styling dòng cha nổi bật (Nền xanh/xám nhạt, font bold). Thụt lề dòng con rõ ràng.

### Màn Daily Entry (`/field-progress/daily`)
- **Desktop**: Ẩn các cột "Khó khăn", "Ghi chú", "Vật tư" vào một Drawer (mở bằng nút `Mở rộng`). Phóng to ô "KL Hôm nay", set `auto-select` khi click. Xử lý sự kiện bàn phím: Enter = Xuống dòng, Tab = Có thể skip Ghi chú để xuống dòng nếu cấu hình, hoặc ưu tiên di chuyển dọc.
- **Mobile**: Chuyển hoàn toàn từ `table` sang UI **Card List**. Mỗi công việc là một Card to, hiển thị KL trước, % và 1 input KL Hôm nay khổng lồ dễ bấm bằng ngón tay. Nút Lưu Sticky dưới màn hình.
- Thêm Drawer chi tiết thay vì nhập dàn hàng ngang.

### Màn Summary (`/field-progress/summary`)
- Rút gọn UI. 
- Cải thiện Mobile bằng Card. Dễ nhận diện cảnh báo vượt khối lượng.
