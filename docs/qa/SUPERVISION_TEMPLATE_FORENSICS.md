# Giám định biểu mẫu tuần Giám sát

## Nguồn và phương pháp kiểm tra

- `D:/FileCty/Trưởng ban giám sát_Quang/2.1 BÁO CÁO KẾT QUẢ TUẦN.docx`
- `D:/FileCty/Trưởng ban giám sát_Quang/2.2 KẾ HOẠCH TUẦN TIẾP THEO.docx`

Đã đọc trực tiếp cấu trúc DOCX bằng `python-docx`. Microsoft Word trên máy Windows cũng đã được kiểm tra và dùng qua COM automation ở chế độ chỉ đọc để xuất mẫu Báo cáo kết quả tuần thành PDF 4 trang. PDF tham chiếu nằm tại `docs/qa/artifacts/supervision-weekly-result-reference/reference-word.pdf`.

Mẫu có một section A4 ngang (841,9 × 595,3 pt), lề bốn phía 42,55 pt (15 mm), font chính Times New Roman. Các bảng dùng đường kẻ đầy đủ, hàng tiêu đề nền xám. Việc có bản PDF do chính Microsoft Word render đã loại bỏ blocker renderer được ghi trong báo cáo cũ.

## Bản đồ biểu mẫu: Báo cáo kết quả tuần

1. Khối hành chính hai cột: tên công ty/số báo cáo và quốc hiệu/địa điểm-ngày tháng.
2. Tiêu đề `BÁO CÁO KẾT QUẢ TUẦN`, Kính gửi, Chức vụ và thời gian báo cáo.
3. Mục `I. Kết quả thực hiện trong tuần`: bảng 4 cột; Thứ Hai đến Chủ nhật; trong mỗi ngày có Sáng/Chiều/Tối.
4. Mục `II. Công tác kiểm tra điều kiện chuyển bước thi công`: bảng 6 cột.
5. Mục `III. Công tác đo, kiểm tra khối lượng đã thi công`: bảng 5 cột.
6. Mẫu nhảy từ III sang `V. Tiến độ tổng và thực tế`; không tự thêm mục IV.
7. Mục V là bảng 5 cột; vùng chữ ký hai cột nằm cuối phần Báo cáo kết quả tuần.

## Chiều rộng bảng lịch trong DOCX

| Biểu mẫu | Các cột (inch) |
| --- | --- |
| Kết quả tuần | 1,575 / 3,150 / 3,544 / 2,244 |
| Kế hoạch tuần sau | 1,575 / 2,560 / 3,150 / 3,228 |

Hàng dữ liệu trong mẫu không có chiều cao cố định. Bản in của hệ thống vì vậy dùng chiều cao tự động, tách bảng thành các đoạn có header lặp lại và ngắt trang có kiểm soát để không cắt tiếng Việt hoặc tạo trang trắng.

## Trường động và ánh xạ dữ liệu

| Vị trí mẫu | Nguồn dữ liệu |
| --- | --- |
| Số báo cáo | `SupervisionWeeklyDossier.reportNumber` |
| Địa điểm, ngày tháng | `place` và kỳ báo cáo; không hard-code năm |
| Kính gửi, chức vụ | `recipientName`, `recipientTitle` |
| Từ ngày/đến ngày | `weekStart`, `weekEnd` |
| Buổi được chọn | `SupervisionWeeklyShiftSelection` |
| Công việc từng buổi | nhiều `SupervisionWeeklyEntry`, theo `entryDate`, `shift`, `sortOrder` |
| Công trình/hạng mục | reference nullable và snapshot tên, `manualText`, `displayText`, `inputMode` |
| Mục II | `SupervisionWeeklyTransition` |
| Mục III | `SupervisionWeeklyQuantity` |
| Mục V | `SupervisionWeeklyProgress` |
| Chữ ký người lập | người tạo hồ sơ |

## Kết quả đối chiếu trực quan

- PDF runtime cuối: `docs/qa/artifacts/supervision-weekly-result-table-editor/result-report.pdf`.
- Năm trang PDF runtime đã render thành PNG tại `docs/qa/artifacts/supervision-weekly-result-table-editor/pdf-pages-production-final/` và đã được xem trực tiếp.
- Ba trang đầu là Báo cáo kết quả tuần; trang 3 chứa Chủ nhật, các bảng II/III/V và chữ ký. Hai trang sau giữ nguyên Kế hoạch tuần tiếp theo.
- Bản runtime giữ A4 ngang, Times New Roman, đúng thứ tự I/II/III/V và đúng số cột 4/6/5/5; không có checkbox, nút thao tác, cột thừa, nội dung bị cắt hoặc trang trắng bất thường.
- Không tuyên bố giống DOCX ở mức pixel. Khác biệt chủ yếu là hệ thống chia trang động theo lượng dữ liệu, trong khi DOCX gốc là tài liệu tĩnh 4 trang.
