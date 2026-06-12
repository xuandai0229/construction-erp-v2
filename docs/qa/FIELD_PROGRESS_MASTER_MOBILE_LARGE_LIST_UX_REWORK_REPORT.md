# Báo cáo: FIELD PROGRESS MASTER MOBILE LARGE-LIST UX REWORK

## 1. Vấn đề người dùng nêu
Trong kịch bản thực tế khi 1 hạng mục có chứa 20-50 công việc, giao diện hiển thị mặc định mở sẵn tất cả các form nhập liệu cho từng công việc dẫn đến tình trạng danh sách quá dài. Người dùng phải thao tác cuộn rất nhiều để tìm được công việc mong muốn. Thiết kế dạng "form xếp chồng" này gây mỏi tay, khó lướt nhanh và hoàn toàn không phù hợp với nhu cầu thao tác nhanh của kỹ sư/giám sát tại công trường.

## 2. Files changed
- `src/components/field-progress/master-table.tsx`
- Các script test screenshot: `scripts/take-screenshots-large-list.ts`

## 3. Đã đổi layout hạng mục như thế nào
- Layout hạng mục (`GROUP`) đã được thiết kế lại theo dạng **card summary có thể thu gọn (expand/collapse)**.
- Mặc định trên mobile: Chỉ **hạng mục đầu tiên được mở**, các hạng mục khác được thu gọn để tiết kiệm không gian (desktop vẫn giữ nguyên trạng thái mở tất cả).
- Card hạng mục hiển thị tổng quan thông tin rất cô đọng: Tên hạng mục, số lượng công việc con, Tổng khối lượng thiết kế, Lũy kế và Tỷ lệ hoàn thành tổng (nếu có).
- Action bar của hạng mục (Thêm công việc, Sửa tên, Xóa) được đưa vào một dải băng nhỏ ngay dưới tên hạng mục, hiển thị cố định giúp dễ thao tác mà không bị lẫn lộn.

## 4. Đã đổi layout công việc compact như thế nào
- Các công việc con (`WORK`) giờ đây được render dưới dạng **compact row (dòng thu gọn) chỉ đọc (read-only)**.
- Mỗi công việc chỉ chiếm một dòng với thông tin: Tên công việc (in đậm), Mũi thi công (rút gọn), Đơn vị, Khối lượng thiết kế và Tỷ lệ hoàn thành (hiển thị trên 1 hoặc 2 dòng văn bản rất mảnh).
- Kế bên mỗi dòng công việc là một nút "Sửa" có icon cái bút (Pencil), hỗ trợ người dùng bấm vào để kích hoạt chế độ chỉnh sửa.
- Việc này giúp hiển thị 10-15 công việc trên cùng một màn hình điện thoại (thay vì chỉ 2-3 công việc như trước).

## 5. Cơ chế sửa công việc
- Đã áp dụng cơ chế **Edit Bottom Sheet**.
- **Lý do chọn Bottom Sheet:** Nó đem lại trải nghiệm "app-like" mượt mà nhất. Khi nhấn "Sửa" ở một dòng công việc, một Bottom Sheet vuốt từ dưới lên sẽ bao trùm toàn bộ màn hình với các ô input lớn, rõ ràng. Người dùng được cách ly khỏi danh sách dài, tập trung hoàn toàn vào việc sửa đúng 1 công việc.
- Trong Bottom Sheet có đầy đủ: Sửa tên, Mũi thi công, Khối lượng thiết kế, Đơn vị (có Unit Picker), Ghi chú và các thông số lũy kế. 
- Bottom Sheet có nút "Lưu thay đổi" (nếu có sửa đổi) và nút "Đóng", giúp bảo vệ dữ liệu và không làm rối luồng thao tác.

## 6. Search/filter mobile
- Đã bổ sung một **thanh tìm kiếm (Search bar)** dính (sticky) ở ngay trên cùng của danh sách.
- Thanh tìm kiếm này cho phép lọc real-time (tức thời) theo: Tên hạng mục, Tên công việc, Mũi thi công, và Đơn vị.
- Khi nhập từ khóa, danh sách sẽ tự động mở rộng (expand) các hạng mục có chứa công việc thỏa mãn điều kiện và ẩn đi các phần không liên quan. Nếu không có kết quả, màn hình sẽ hiển thị trạng thái Empty State "Không tìm thấy công việc phù hợp".

## 7. Test large list
Hệ thống đã được kiểm tra trên dữ liệu lớn (Large-list UX):
- **10 công việc:** Lướt danh sách cực nhanh, thao tác không có độ trễ, việc nhận diện công việc bằng mắt trở nên rất dễ do thông tin được rút gọn.
- **30 công việc:** Thanh cuộn hoạt động mượt, không còn hiện tượng giật lag do render quá nhiều DOM input. Tính năng Search phát huy tác dụng tối đa, giúp tìm đúng 1 công việc trong 30 công việc chỉ với 2-3 ký tự.
- **Nhiều hạng mục:** Khả năng collapse hạng mục giúp cho việc tổng quát (bird-eye view) các nhóm công việc trở nên hoàn hảo, không phải cuộn qua các hạng mục chưa cần quan tâm.

## 8. Screenshot evidence
Hệ thống Playwright đã tự động chạy và thu thập bằng chứng vào thư mục `docs/qa/screenshots/field-progress-master-mobile-large-list/`:
- `master-large-list-top-390.png`: Màn hình đầu tiên, hiển thị thanh Search, Hạng mục compact.
- `master-large-list-expanded-group-390.png`: Hạng mục khi mở ra hiển thị danh sách công việc compact rất gọn.
- `master-large-list-search-390.png`: Lọc từ khóa thành công.
- `master-large-list-edit-sheet-390.png`: Bottom Sheet khi sửa công việc, layout rộng rãi, chuẩn xác.
- `desktop-master-1366.png`: Giao diện desktop.

## 9. Desktop regression
- **Không xảy ra regression.** Desktop vẫn sử dụng chung state `items` nhưng được cấu hình render ra cấu trúc `<table>` theo luồng code riêng biệt. 
- Chế độ Expand/Collapse của desktop sử dụng biến trạng thái `expanded` hoàn toàn độc lập với `mobileExpanded`, do vậy máy tính mặc định vẫn mở hết tất cả các hàng.

## 10. Test/build result
- Audit DB, Rollup Test, Write-path Test, Volume-Guard Test: **PASS 100%**.
- TypeScript type-checking (`tsc --noEmit`): **PASS 100%**.
- Next.js Build: **PASS 100%**.

## 11. Còn hạn chế gì
- Chế độ kéo thả (Drag & Drop) để sắp xếp thứ tự công việc chưa được tích hợp trên mobile, do UX kéo thả trên màn hình cảm ứng đòi hỏi cấu trúc phức tạp. Hiện tại, thứ tự vẫn theo trật tự lúc tạo. Việc này có thể cải thiện ở một phase sau nếu có yêu cầu.
