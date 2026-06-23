# R1.3 Reports UX Declutter Decision Report

## A. Executive Summary
- **UI hiện tại có nên lược bỏ không**: Rất nên. Mặc dù R1.1 đã làm gọn gàng đi một phần, nhưng bản chất màn hình báo cáo vẫn đang dồn nén quá nhiều công cụ lọc, thông kê và trạng thái không cần thiết trên một không gian hẹp.
- **Vấn đề lớn nhất là gì**: Sự trùng lặp chức năng. Chúng ta có các nút ở Action Center trùng với các thẻ Tab (Chờ duyệt, Từ chối, Có phát sinh), đồng thời Filter Bar cũng có dropdown Trạng thái/Loại lặp lại chức năng của Tab. Quá nhiều "Cột" trong bảng không cần thiết cho góc nhìn tổng quan.
- **Khuyến nghị phương án**: **Phương án B — Sếp dùng là chính**. Sếp và Chỉ huy trưởng cần thấy ngay "Cần xử lý" thay vì bị ngợp bởi thông tin bảng biểu dư thừa.
- **Có được implement ngay không**: KHÔNG. Cần người dùng (sếp/PO) duyệt đề xuất này trước.
- **Production GO/NO-GO**: NO-GO.

## B. Current UI audit
- **Header**: Có tiêu đề, mô tả dài và nút "Tạo báo cáo". Mô tả hơi thừa.
- **Action Center**: 3 card (Chờ duyệt, Từ chối, Có phát sinh). Rất tốt cho sếp, nhưng đang chiếm diện tích nếu không có issue nào (số 0).
- **Summary**: Dòng chữ nhỏ hiển thị tổng số báo cáo, duyệt, chờ, từ chối, tỷ lệ duyệt. Khá trùng lặp với Action Center và không mang tính hành động.
- **Tabs**: Tất cả, Báo cáo ngày, Báo cáo tuần, Chờ duyệt, Từ chối, Có phát sinh. Quá nhiều tab, gây loãng và trùng hoàn toàn với Action Center.
- **Filter**: Có Search, Loại, Công trình, Khoảng ngày, Trạng thái. Quá cồng kềnh, đặc biệt khi chỉ có 1 công trình. Search box quá dài.
- **Table**: Mã BC, Công trình, Người tạo, Thời gian, Thời tiết, Trạng thái, Hình ảnh, Tác vụ. Cột "Công trình" là thừa khi xem dự án đơn lẻ. Cột "Thời tiết" ghép chung "Mục" dễ gây rối mắt.
- **Group header**: Group theo tuần, hiển thị full count trạng thái. Rất tốt nhưng chưa cho phép thu gọn (collapse).
- **Drawer**: Nội dung hiển thị dạng danh sách khá dài. Một số thông tin như "Vật tư", "Nhân công" luôn hiển thị chữ "Không có" rất tốn chỗ. Lịch sử duyệt nên để mặc định ẩn hoặc đưa xuống dưới cùng.
- **Mobile**: Action center trên mobile đã gọn hơn nhưng thanh Tabs vẫn quá dài, phải lướt ngang nhiều. Floating action button đôi khi che lấp dữ liệu.

## C. Keep / Remove / Simplify Matrix

| Thành phần | Hiện trạng | Vấn đề | Đề xuất | Mức ưu tiên |
| ---------- | ---------- | ------ | ------- | ----------- |
| **Mô tả Header** | Đang hiển thị dòng text dài | Tốn diện tích dọc | Ẩn mặc định | Ẩn mặc định |
| **Action Center** | 3 chỉ số ngang | Số 0 vẫn hiện màu đỏ/cam gây chú ý sai | Ẩn card có số 0 hoặc đổi sang màu xám | Giữ nhưng làm nhẹ |
| **Summary Line** | Chữ nhỏ tổng hợp toàn bộ | Trùng lặp thông tin với Action Center | Đưa vào tooltip hoặc 1 nút "Thống kê" | Bỏ ngay |
| **Tabs Trạng thái** | Chờ duyệt, Từ chối, Có phát sinh | Trùng lặp chức năng lọc của Action Center | Xóa bỏ, dùng Action Center để lọc luôn | Bỏ ngay |
| **Filter Bar** | Hiển thị dropdown trực tiếp | Chiếm 1 dòng ngang lớn | Gộp vào nút "Bộ lọc" (popover) trên cả Desktop | Giữ nhưng làm nhẹ |
| **Cột Công trình** | Hiển thị tên công trình | Trùng lặp khi user chỉ có 1 công trình | Ẩn khi chỉ có 1 công trình active | Ẩn mặc định |
| **Cột Thời tiết** | Nằm trong bảng tổng | Thông tin phụ, làm bảng bị chật | Bỏ khỏi bảng, chỉ xem trong detail drawer | Bỏ ngay |
| **Group Header** | Header cho từng tuần | Chưa collapse được | Thêm icon chevron để collapse/expand | Để R2/R3 xử lý |
| **Drawer Empty Sections**| Render section rỗng | Tốn chiều cao drawer | Không render section nếu không có data | Bỏ ngay |
| **Drawer Approval History**| Luôn xổ dài | Tốn không gian cuộn | Mặc định ẩn, bấm "Xem lịch sử" mới mở | Ẩn mặc định |

## D. Recommended Layout (Phương án B)

**Phương án B — Sếp dùng là chính**:
- **Tầng 1 (Top)**: Header ngắn gọn + Nút "Tạo mới". Không có mô tả rườm rà.
- **Tầng 2 (Action Center)**: Các khối block lớn như "Cần duyệt", "Bị từ chối", "Có phát sinh". Bấm vào block nào sẽ tự động lọc danh sách bên dưới. Nếu chỉ số = 0, block tự động làm mờ (dim).
- **Tầng 3 (Tabs & Search)**: Chỉ giữ lại tab phân loại: Tất cả, Báo cáo Ngày, Báo cáo Tuần. Kế bên là ô Search nhỏ và 1 nút "Bộ lọc nâng cao" chứa (Date, Trạng thái, Người tạo).
- **Tầng 4 (Table)**: Ẩn cột Công trình, ẩn cột Thời tiết. Tập trung vào: Mã BC, Người tạo, Ngày, Trạng thái, và nội dung công việc chính.
- **Tầng 5 (Drawer)**: Chỉ hiển thị các mục (vật tư, nhân công, kiến nghị) nếu thực sự có dữ liệu khác rỗng hoặc khác "Không có".

**Đánh giá**:
| Phương án | Dễ làm | Dễ dùng cho sếp | Ít rủi ro | Mobile tốt | Khuyến nghị |
| --------- | -----: | --------------: | --------: | ---------: | ----------- |
| A - Tối giản an toàn | 8/10 | 6/10 | 9/10 | 7/10 | Không |
| **B - Sếp dùng là chính** | **7/10** | **9/10** | **8/10** | **9/10** | **CÓ** |

## E. Implementation Scope nếu được duyệt sau
- **R1.3a Desktop declutter**: Loại bỏ Summary line, các Tab trùng lặp, Cột bảng thừa, gom Filter Bar vào Popover.
- **R1.3b Mobile declutter**: Rút gọn thanh Tabs, làm mờ các Action Card số 0, tối ưu chạm (touch target).
- **R1.3c Drawer cleanup**: Sửa logic render, ẩn hoàn toàn các Section không có dữ liệu thực tế, thu gọn Approval History.

## F. Risks
- Không có severity field riêng nên vẫn còn rủi ro "Có phát sinh" bị lạm dụng nếu người dùng điền linh tinh vào field issues.
- Weekly source linkage chưa làm (R2).
- Project-level RBAC chưa làm (R4) nên cột công trình tạm thời ẩn có thể gây nhầm lẫn nếu tương lai user có nhiều công trình.
- Lược bỏ cột "Thời tiết" có thể khiến một số kỹ sư mất đi thông tin tóm tắt nhanh, tuy nhiên họ vẫn có thể click vào xem chi tiết.

## G. Conclusion
- **Có nên sửa tiếp không**: CÓ, nhưng cần phê duyệt bản kế hoạch Declutter này trước.
- **Nên sửa gì trước**: Gom các bộ lọc dư thừa (Tabs + Filter Bar) lại để trả lại không gian chiều dọc cho bảng báo cáo.
- **Không nên sửa gì lúc này**: Không tự ý sửa code, logic, hay cơ sở dữ liệu cho đến khi phương án UX được chính thức phê duyệt.

## H. Confirmation
- Không sửa code.
- Không sửa database.
- Không tạo migration.
- Không xóa dữ liệu.
- Không commit.
- Không push.
