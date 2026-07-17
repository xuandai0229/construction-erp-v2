# Báo cáo quét dữ liệu đầu vào và an toàn lưu trữ dài hạn

**Ngày thực hiện:** 17/07/2026  
**Phạm vi:** `construction-erp-v2`, cơ sở dữ liệu QA hiện hành.  
**Nguyên tắc:** Không reset database, không xóa công trình cũ, không ghi đè dữ liệu ngoài phạm vi công trình dữ liệu mẫu.

## Kết quả chính

- Đã tạo công trình dữ liệu mô phỏng nghiệp vụ: **`QA-TUHIEP-5F-001`**, trạng thái `ACTIVE`, ngân sách tham chiếu **68.500.000.000 VND**.
- Dữ liệu được tạo nhằm kiểm thử luồng thực tế, không phải hồ sơ pháp lý hay dữ liệu tài chính thật.
- Kiểm tra độc lập đạt **41/41** điều kiện; kiểm tra cuối cùng xác nhận tệp vật lý tồn tại và tồn kho khớp sổ giao dịch.
- Đã sửa lỗi giữ tài liệu: tác vụ dọn thùng rác không còn xóa vĩnh viễn chỉ sau 7 ngày mà dùng đúng thời hạn `documentRetentionYears` trong cài đặt hệ thống (hiện là 10 năm).
- Đã phát hiện và khắc phục ở source lỗi tương thích bảng phê duyệt: database hiện hữu yêu cầu `entityType` và `entityId`, nên các luồng tạo phê duyệt giờ tự điền hai trường này.

## Dữ liệu đầu vào của ứng dụng

| Nhóm | Dữ liệu nhập chính |
| --- | --- |
| Công trình | Mã, tên, chủ đầu tư, địa điểm, trạng thái, ngày bắt đầu/kết thúc, mô tả; schema có thêm ngân sách. |
| Thành viên và quyền | Tài khoản, họ tên, email, vai trò hệ thống, vai trò trong công trình, trạng thái hoạt động. |
| Vị trí thi công | Cây dự án/khối nhà/tầng/khu vực, mã vị trí, tên, mô tả, thứ tự hiển thị. |
| Khối lượng/tiến độ | Mẫu tiến độ, nhóm/công việc, mã công việc, tổ đội, đơn vị, khối lượng thiết kế, trạng thái, ghi chú; nhật ký ngày gồm khối lượng, ngày, vấn đề, đề xuất và trạng thái duyệt. |
| Báo cáo hiện trường | Loại ngày/tuần, ngày báo cáo, thời tiết, nhân công, thiết bị, vật tư, chất lượng, sự cố, kiến nghị, dòng khối lượng và tệp đính kèm. |
| Tài liệu | Thư mục, tệp vật lý, tên hiển thị, loại, metadata, trạng thái duyệt, phiên bản, người tải lên/duyệt. |
| Vật tư | Danh mục mã/tên/đơn vị/nhóm, tồn tối thiểu, giao dịch nhập/xuất, yêu cầu vật tư và các dòng vật tư theo công việc. |
| Phê duyệt | Mã, loại, ưu tiên, tiêu đề, mô tả, hạn xử lý, nguồn liên kết, người đề nghị/quyết định và trạng thái. |
| Công việc | Tiêu đề, mô tả, ưu tiên, hạn, người thực hiện/kiểm tra/phê duyệt và vòng đời tác vụ. Tác vụ không được chèn thẳng bằng seed vì phải đi qua workflow/API có kiểm soát phiên bản. |

Các module hợp đồng/thanh toán không có model CRUD hiện hành tương ứng trong schema, nên không tạo dữ liệu giả cho các phần này.

## Dữ liệu đã tạo

| Hạng mục | Số lượng |
| --- | ---: |
| Thành viên công trình | 5 |
| Thư mục / tài liệu | 10 / 12 |
| Báo cáo / dòng báo cáo / tệp đính kèm | 12 / 62 / 5 |
| Mẫu tiến độ / hạng mục / nhật ký khối lượng | 1 / 34 / 34 |
| Phiếu yêu cầu vật tư / dòng vật tư | 4 / 7 |
| Vị trí thi công | 3 |
| Danh mục vật tư / tồn kho / giao dịch | 5 / 5 / 5 |
| Yêu cầu vật tư theo tiến độ | 1 |
| Phê duyệt / thông báo | 2 / 1 |

Các trạng thái quan trọng đều có dữ liệu mẫu: báo cáo nháp, đã gửi, đã duyệt, bị từ chối; nhật ký khối lượng nháp/đã gửi/đã duyệt; yêu cầu vật tư với các mức ưu tiên và trạng thái khác nhau.

## Kiểm tra tính toàn vẹn

- Không có khối lượng nhật ký nào hoặc tổng lũy kế nào vượt khối lượng thiết kế.
- Tất cả 12 tài liệu và 5 tệp đính kèm báo cáo đều có tệp vật lý tại storage thuộc riêng phạm vi công trình dữ liệu mẫu.
- Tồn kho của 5 vật tư khớp tổng giao dịch nhập kho dữ liệu mẫu.
- Quan hệ thư mục–tài liệu, báo cáo–dòng báo cáo, yêu cầu–dòng vật tư và tiến độ–vị trí đều hợp lệ.
- TypeScript kiểm tra thành công sau thay đổi source.

## Kiểm tra nguy cơ mất dữ liệu theo thời gian

### Đã sửa

Trước khi sửa, endpoint cron và hai script dọn thùng rác dùng ngưỡng cố định **7 ngày** cho tài liệu/thư mục đã xóa mềm. Điều này mâu thuẫn với cài đặt hệ thống `documentRetentionYears = 10` và có thể làm mất tài liệu sớm.

Hiện tại, cả ba đường chạy dùng thời hạn cấu hình này; khi cài đặt là 10 năm, tài liệu/thư mục xóa mềm vẫn có thể khôi phục trong thời gian đó. Xóa vĩnh viễn trực tiếp vẫn chỉ dành cho System Admin.

### Vẫn cần vận hành hạ tầng

- Cấu hình hiện có ghi `automaticBackup = true`, tần suất `daily`, thời hạn dữ liệu 7 năm.
- Trong source đã quét, đây là **cấu hình**; không thấy tác vụ sao lưu database/storage thực thi trực tiếp trong repository. Vì vậy không thể khẳng định backup hạ tầng đang chạy chỉ dựa vào cài đặt UI.
- Để đảm bảo dữ liệu nhiều năm không mất, cần kiểm tra riêng job backup PostgreSQL, backup thư mục/object storage, thời gian giữ bản sao và diễn tập restore định kỳ.
- Xóa công trình từ UI hiện là xóa mềm. Không tìm thấy cron xóa vĩnh viễn công trình trong source đã quét; các dữ liệu con vẫn bị ẩn khi công trình bị xóa mềm.

## Tương thích phê duyệt

Database hiện hành có hai cột legacy bắt buộc `entityType` và `entityId` mà schema source trước đó chưa mô tả. Điều này làm luồng tạo phê duyệt có nguy cơ lỗi runtime. Source hiện đã:

1. Mô tả hai trường tương thích trong Prisma schema.
2. Tự gán từ nguồn liên kết hoặc từ loại/mã phê duyệt khi tạo mới.
3. Cập nhật luồng tạo phê duyệt từ yêu cầu vật tư.
4. Có migration tương thích chỉ bổ sung/backfill có điều kiện, không xóa cột hay record.

Migration chưa được triển khai lên database dùng chung vì thao tác schema cần phê duyệt riêng. Database QA hiện hành đã có sẵn hai cột này nên source đã tạo/kiểm tra được dữ liệu phê duyệt trong môi trường hiện tại.

## Khuyến nghị vận hành

1. Xác nhận backup database và storage thực sự chạy mỗi ngày, có cảnh báo khi thất bại.
2. Lưu backup ngoài máy chủ ứng dụng và diễn tập khôi phục tối thiểu mỗi quý.
3. Chỉ triển khai migration phê duyệt trong cửa sổ bảo trì được phê duyệt.
4. Không dùng script reset/wipe diện rộng cho môi trường có dữ liệu nghiệp vụ.
5. Khi cần tạo tác vụ, dùng giao diện/API của module Công việc để giữ đúng lịch sử và kiểm soát phiên bản.

