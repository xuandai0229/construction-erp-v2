# Daily Progress Cleanup Pre Snapshot 2026-07-04

- Thời điểm: 2026-07-04T07:17:38.550Z
- Project: cmr5p2iwm0009r4wk51lwxhjy / CT-TAYHO-2026-001 / Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ
- Template active đầu tiên: seed_87a9d712eb36935a93d1298ba6
- FieldProgressItem: total=28, WORK=20, GROUP=8, NOTE=0
- Active FieldProgressEntry: 0
- SiteReport active liên quan: 15
- SiteReport QA-tag active: 1
- Entry có marker [SOURCE:SITE_REPORT:...]: 0
- Duplicate active entry cùng project/date/item: 0

## Phân tích model và quan hệ

| Model/Bảng | Vai trò | Có được xóa không | Lý do | Cách xử lý an toàn |
|---|---|---|---|---|
| Project | Công trình cha, scope cleanup theo code | Không | Giữ nguyên dữ liệu thật | Chỉ lookup project code |
| FieldProgressTemplate | Template bảng khối lượng của project | Không | Là cấu trúc baseline | Chỉ đọc template active |
| FieldProgressItem | Bảng khối lượng gốc/baseline: WORK/GROUP/NOTE, designQuantity | Không | User cấm xóa baseline | Chỉ audit design/remaining |
| FieldProgressEntry | Dữ liệu khối lượng nhập theo ngày | Có, trong scope project test | Có deletedAt; cleanup để reset entered/approved/submitted | Soft-delete active entries của project |
| SiteReport | Header báo cáo ngày/tuần | Chỉ QA-tag | Không xóa report thật không tag | Soft-delete/cancel report có tag QA cũ |
| SiteReportLine | Dòng khối lượng của report | Theo report QA-tag | Cascade theo report nếu hard-delete nhưng ở đây dùng soft-delete report | Không xóa report không tag; line cũ chỉ ghi nhận |
| SiteReportPhoto | Ảnh legacy theo report | Không trực tiếp | Không cần chạm dữ liệu thật | Chỉ ghi nhận |
| SiteReportAttachment | Ảnh/file upload report | Không trực tiếp | Không xóa file/report thật | Chỉ ghi nhận; upload dummy nếu UI cho phép |
| AuditLog | Lịch sử tạo/gửi/xóa report | Không | Phục vụ truy vết | Không cleanup |

### Trả lời nhanh

1. Bảng khối lượng gốc: `FieldProgressItem` (`itemType=WORK` là công việc nhập khối lượng, `GROUP` là nhóm).
2. Dữ liệu khối lượng nhập theo ngày: `FieldProgressEntry`.
3. Khi gửi/duyệt báo cáo ngày, `SiteReportLine` được sync sang `FieldProgressEntry` qua marker `[SOURCE:SITE_REPORT:<reportId>]`; báo cáo tuần không sync.
4. Khối lượng đã duyệt đang tính từ `FieldProgressEntry.status = APPROVED` và `deletedAt = null`.
5. Khối lượng còn lại trong picker đang tính `designQuantity - approved(APPROVED trước ngày) - sameDay(DRAFT/SUBMITTED/APPROVED/REVISION_REQUESTED trong ngày)`; audit sau cleanup tính theo active entries.
6. Xóa/soft-delete `FieldProgressEntry` không tự làm report cũ sync lại; chỉ sync lại nếu gọi submit/approve/reject/cancel transition trên report cũ.
7. Report cũ có thể gây sai nếu entry nguồn của nó còn active; snapshot liệt kê report và marker để xử lý.
8. Marker nguồn cần tìm trong `FieldProgressEntry.note` dạng `[SOURCE:SITE_REPORT:...]`.
9. Duplicate hợp lệ phải theo `fieldProgressItemId` trong cùng report/ngày, không theo `quantityToday`.
10. Prisma schema hiện không có unique constraint trên `projectId + date + itemId`; chỉ có index riêng lẻ.

## FieldProgressEntry theo status

| Status | Count |
|---|---:|
| DRAFT | 0 |
| SUBMITTED | 0 |
| APPROVED | 0 |
| REJECTED | 0 |
| REVISION_REQUESTED | 0 |
| CANCELLED | 0 |

## FieldProgressEntry theo ngày

| Ngày | Count |
|---|---:|

## Tổng approved/submitted theo item

| Code | Hạng mục | Công việc | ĐVT | Design | Approved | Submitted/Pending | Remaining | Percent | Status |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| FP-CB-001 | Chuẩn bị công trường | Lắp dựng hàng rào tôn và cổng công trường | m | 180 | 0 | 0 | 180 | 0% | COMPLETED |
| FP-CB-002 | Chuẩn bị công trường | Lắp đặt nhà tạm, kho bãi, biển báo | m2 | 240 | 0 | 0 | 240 | 0% | IN_PROGRESS |
| FP-CB-003 | Chuẩn bị công trường | Định vị tim trục và mốc cao độ | điểm | 48 | 0 | 0 | 48 | 0% | COMPLETED |
| FP-M-001 | Móng | Khoan cọc D800 sâu 42m | cọc | 68 | 0 | 0 | 68 | 0% | IN_PROGRESS |
| FP-M-002 | Móng | Bê tông cọc khoan nhồi M300 | m3 | 1620 | 0 | 0 | 1620 | 0% | IN_PROGRESS |
| FP-M-003 | Móng | Đào đất hố móng | m3 | 11800 | 0 | 0 | 11800 | 0% | IN_PROGRESS |
| FP-M-004 | Móng | Cốt thép đài móng và dầm móng | kg | 285000 | 0 | 0 | 285000 | 0% | PLANNED |
| FP-H-001 | Tầng hầm | Bê tông lót đáy tầng hầm | m3 | 360 | 0 | 0 | 360 | 0% | PLANNED |
| FP-H-002 | Tầng hầm | Chống thấm đáy và vách tầng hầm | m2 | 4200 | 0 | 0 | 4200 | 0% | PLANNED |
| FP-H-003 | Tầng hầm | Cốp pha vách tầng hầm B2-B1 | m2 | 5200 | 0 | 0 | 5200 | 0% | PLANNED |
| FP-KC-001 | Kết cấu thân | Cốt thép cột/vách tầng 1-3 | kg | 215000 | 0 | 0 | 215000 | 0% | PLANNED |
| FP-KC-002 | Kết cấu thân | Cốp pha sàn tầng 1-3 | m2 | 9400 | 0 | 0 | 9400 | 0% | PLANNED |
| FP-KC-003 | Kết cấu thân | Bê tông sàn tầng 1-3 | m3 | 1780 | 0 | 0 | 1780 | 0% | PLANNED |
| FP-XT-001 | Xây trát | Xây tường gạch AAC | m2 | 8200 | 0 | 0 | 8200 | 0% | PLANNED |
| FP-XT-002 | Xây trát | Tô trát tường trong | m2 | 15800 | 0 | 0 | 15800 | 0% | PLANNED |
| FP-MEP-001 | MEP điện nước | Ống cấp thoát nước âm sàn | m | 3150 | 0 | 0 | 3150 | 0% | PLANNED |
| FP-MEP-002 | MEP điện nước | Ống luồn dây điện và hộp chờ | m | 6100 | 0 | 0 | 6100 | 0% | PLANNED |
| FP-HT-001 | Hoàn thiện | Sơn bả hoàn thiện | m2 | 21600 | 0 | 0 | 21600 | 0% | PLANNED |
| FP-HT-002 | Hoàn thiện | Lắp đặt cửa nhôm kính | m2 | 1980 | 0 | 0 | 1980 | 0% | PLANNED |
| FP-NT-001 | Nghiệm thu bàn giao | Nghiệm thu hoàn thành và bàn giao | hồ sơ | 1 | 0 | 0 | 1 | 0% | PLANNED |

## Top 20 item bất thường

| Code | Công việc | Design | Approved | Submitted/Pending | Remaining | Percent | Status | Lỗi |
|---|---|---:|---:|---:|---:|---:|---|---|
| Không có |  | 0 | 0 | 0 | 0 | 0% |  | PASS |

## Report có tag QA cũ

| Report id | Mã | Type | Status | Date | Lines | Attachments |
|---|---|---|---|---|---:|---:|
| cmr612b5e0017gwwkukyz4v52 | bb4a5d59-d19c-47c2-ba0d-d7f85646906d | DAILY | DRAFT | 2026-07-04T01:30:00.000Z | 2 | 0 |

## Entry có marker nguồn báo cáo

| Entry id | Item | Date | Status | Quantity | Marker/note |
|---|---|---|---|---:|---|
| Không có |  |  |  | 0 |  |

## Duplicate active entry cùng project/date/item

| Project | Item | Entry date | Count |
|---|---|---|---:|
| Không có |  |  | 0 |
