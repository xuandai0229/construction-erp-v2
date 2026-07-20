# Audit data flow — Báo cáo kết quả tuần Giám sát

## Phạm vi và nguồn chuẩn

- Route: `/supervision/weekly/[id]/edit` và `/supervision/weekly/[id]/preview`.
- Nguồn mẫu cao nhất: `D:/FileCty/Trưởng ban giám sát_Quang/2.1 BÁO CÁO KẾT QUẢ TUẦN.docx`.
- Microsoft Word đã xuất mẫu thành PDF 4 trang để kiểm tra trực quan. Mẫu có 1 section A4 ngang, kích thước 841,9 × 595,3 pt, lề bốn phía 42,55 pt, 6 bảng, font chính Times New Roman.
- Thứ tự mẫu giữ nguyên: I, II, III, V; không có mục IV.

## Bản đồ data flow trước khi sửa

| Phần mẫu | UI hiện tại | Server action | Prisma model | Preview field | Kết luận |
| --- | --- | --- | --- | --- | --- |
| Thông tin chung | `reportNumber`, `place`, `recipientName`, `recipientTitle`; kỳ chỉ hiển thị gián tiếp | `saveSupervisionWeeklyDossier` cập nhật dossier và tăng `lockVersion` | `SupervisionWeeklyDossier` | Header đọc dossier | Đúng model; cần trình bày ngày Việt Nam gọn và giữ kỳ read-only khi không còn draft |
| I. Kết quả thực hiện trong tuần | 7 ngày × 3 card Sáng/Chiều/Tối; mỗi card chứa nhiều `EntryCard` | Xóa rồi tạo lại toàn bộ `SupervisionWeeklyEntry` trong transaction | `SupervisionWeeklyEntry` | `schedule("RESULT")` nhóm theo `entryDate`, `shift` | Dữ liệu entry có cấu trúc và hỗ trợ nhiều công trình/buổi, nhưng UI sai mẫu; không lưu được checkbox buổi rỗng |
| I — công trình/hạng mục | Mỗi entry có `inputMode`, project, work item hoặc nhập tự do | Kiểm tra scope từng `projectId`; `getSupervisionWeeklyWorkItems` tải hạng mục theo project | `projectId`, `projectNameSnapshot`, `workItemId`, `workItemNameSnapshot`, `manualText`, `displayText`, `inputMode` | Chỉ in `displayText` | Mapping cơ bản đúng; project selector toàn app không được dùng trong query weekly. Cần tái sử dụng picker cho mọi bảng và bảo đảm snapshot được tạo nhất quán |
| II. Điều kiện chuyển bước | Textarea Observation với category “Điều kiện chuyển bước thi công” | Chỉ lưu `observations`; không lưu `transitions` | UI dùng sai `SupervisionWeeklyObservation`; model `SupervisionWeeklyTransition` tồn tại nhưng thiếu các field khối lượng | Preview chỉ in observation dưới dạng đoạn văn sau Mục III | Sai toàn tuyến. Cần bảng 6 cột, mở rộng Transition additive và lưu/đọc trực tiếp |
| III. Đo, kiểm tra khối lượng | Bảng 6 cột gồm cột Đơn vị và Kết luận | Lưu `SupervisionWeeklyQuantity`; tự tính `verified - reported` | `SupervisionWeeklyQuantity` | In 6 cột, có Kết luận | Đúng model nhưng sai cấu trúc mẫu. Cần 5 cột; đơn vị nằm trong ô giá trị, không in Kết luận |
| V. Tiến độ tổng và thực tế | Textarea Observation với category “Tiến độ tổng và thực tế” | Chỉ lưu `observations`; không lưu `progressRows` | UI dùng sai `SupervisionWeeklyObservation`; `SupervisionWeeklyProgress` chưa được dùng | Preview chỉ in observation dưới dạng đoạn văn | Sai toàn tuyến. Cần bảng 5 cột và thêm field mức chậm/loại mức chậm additive |
| Tồn tại/kiến nghị | Textarea được gộp trong khối “II, V” | Lưu Observation RESULT | `SupervisionWeeklyObservation` | In như note | Không thuộc mẫu Báo cáo kết quả tuần. Không hiển thị trong UI mới; dữ liệu legacy phải giữ nguyên, không xóa âm thầm |
| Autosave | Debounce 900 ms, hiển thị saving/saved/error | Transaction + optimistic `lockVersion` | Dossier + các bảng con | Reload đọc lại database | Có nền tảng nhưng chưa có Retry rõ ràng và chưa đưa Transition/Progress/shift selection vào cùng transaction |
| Workflow | Lưu trước rồi submit/review/approve/lock | Kiểm tra role/status; submit yêu cầu người nhận/chức vụ | Status/timestamps/revision | Preview đọc hồ sơ theo quyền | Cần chặn submit khi autosave còn pending/error và chạy validation có vị trí lỗi |

## Mapping chi tiết Mục I

| Dữ liệu editor | Field Prisma |
| --- | --- |
| Ngày của nhóm hàng | `SupervisionWeeklyEntry.entryDate` |
| Sáng/Chiều/Tối | `SupervisionWeeklyEntry.shift` |
| Thứ tự nhiều việc trong cùng buổi | `SupervisionWeeklyEntry.sortOrder` |
| Chế độ nguồn | `SupervisionWeeklyEntry.inputMode` |
| Công trình | `projectId`, `projectNameSnapshot` |
| Hạng mục có sẵn | `workItemId`, `workItemNameSnapshot` |
| Hạng mục/công việc nhập tay | `manualText` |
| Chuỗi bất biến dùng để hiển thị/in | `displayText` |
| Nội dung kiểm tra | `inspectionContent` |
| Kết quả | `result` |

Một buổi có nhiều công việc bằng nhiều `SupervisionWeeklyEntry` có cùng `entryDate` và `shift`, khác `sortOrder`. Không dùng project ở header làm project chung cho tuần.

## Kiểm tra dữ liệu local QA trước thay đổi

Truy vấn chỉ đọc ngày 20/07/2026:

- 6 dossier.
- 4 `SupervisionWeeklyEntry` loại `RESULT`.
- 0 Quantity, 0 Transition, 0 Progress và 0 Observation loại `RESULT`.

Không có dữ liệu legacy Mục II/V trên local QA cần chuyển đổi. Tuy vậy implementation mới vẫn phải giữ Observation RESULT cũ ở chế độ chỉ đọc nếu xuất hiện ở môi trường khác và tuyệt đối không xóa chúng trong autosave.

## Khoảng trống schema và quyết định

1. Checkbox buổi được tích nhưng chưa có entry không thể suy ra sau reload. Cần model additive tối thiểu lưu `dossierId + documentType + entryDate + shift` với unique constraint.
2. `SupervisionWeeklyTransition` thiếu khối lượng báo cáo/kiểm tra, đơn vị riêng, giá trị text và chênh lệch. Cần thêm field nullable; giữ nguyên field legacy.
3. `SupervisionWeeklyProgress` thiếu mức chậm và loại mức chậm ngày/phần trăm. Cần thêm field nullable và enum additive.
4. Không thay đổi/xóa bảng, migration hoặc dữ liệu hiện có. Migration mới chỉ được phép `CREATE TYPE`, `CREATE TABLE`, `ADD COLUMN`, index và foreign key additive.

## Data flow mục tiêu

```text
Table-first editor
  → Zod validation có vị trí ngày/buổi/mục/dòng
  → một Server Action transaction + lockVersion
  → Entry / ShiftSelection / Transition / Quantity / Progress
  → reload cùng các bảng Prisma
  → shared print mapping
  → preview A4 ngang / browser PDF
```

Preview phải đọc trực tiếp `entries`, `transitions`, `quantities`, `progressRows`; Observation RESULT legacy chỉ hiển thị cảnh báo/khối lưu trữ, không được giả làm Mục II hoặc V.
