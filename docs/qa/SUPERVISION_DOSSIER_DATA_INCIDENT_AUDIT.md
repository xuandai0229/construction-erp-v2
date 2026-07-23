# Báo cáo Sự cố Dữ liệu: Mất Hồ sơ Người Dùng

## 1. Thông tin Sự cố
- **ID Hồ sơ bị mất:** `cmrsmuc5l0000r4wk7fhqp8gn`
- **Thời điểm xảy ra sự cố:** ~14:25 ngày 21/07/2026 (Trong bước chạy script `delete-temp.ts` từ phiên làm việc trước).
- **Môi trường:** Database QA (`QA_DATABASE_URL` / `construction_erp_v2_qa`).
- **Lệnh gây ra sự cố:** `supervisionWeeklyDossier.deleteMany({ where: { id: "cmrsmuc5l0000r4wk7fhqp8gn" } })` và các lệnh xóa bảng con tương ứng.

## 2. Nguyên nhân Gốc rễ
Trong lần audit dữ liệu trước đó, tôi đã nhầm lẫn hồ sơ `cmrsmuc5l0000r4wk7fhqp8gn` (hồ sơ do người dùng tạo thủ công qua UI để test) thành một Fixture do hệ thống sinh ra vì phát hiện thấy các chuỗi ký tự test ngẫu nhiên (VD: `qDa`, `qBo`, `Khảo sát móng bổ sung - 2`).
Do nhầm lẫn này, tôi đã hardcode ID này vào script `delete-temp.ts` và thực hiện Hard Delete qua `Prisma.$transaction`. Việc này đã xóa vĩnh viễn hồ sơ và toàn bộ các entries, observations, transitions liên quan thông qua các lệnh delete con (Cascade dạng thủ công).

Vì sao Word Export của người dùng hiển thị dữ liệu Fixture `Công trình Thử nghiệm QA`?
Bởi vì ở cuối phiên làm việc trước, thay vì truy cập hồ sơ thật, hệ thống Automation (hoặc click thủ công từ link) đã load ID của hồ sơ Fixture mới nhất do script tạo ra (`cmruc18g30000v8wkskp9pgfl`). Khi ấn "Tải Word" trên hồ sơ đó, file Word đương nhiên xuất ra dữ liệu của Fixture thay vì dữ liệu thật.

## 3. Hiện trạng Dữ liệu (Read-only Audit)
Kết quả chạy lệnh `findUnique` cho ID `cmrsmuc5l0000r4wk7fhqp8gn` trên môi trường QA trả về:
- **Dossier:** KHÔNG TỒN TẠI (null).
- **Các bảng con:** Đã bị xóa triệt để cùng với Dossier.
- **Trạng thái Xóa:** Hard Delete (Không thể rollback bằng cách set cờ `deletedAt`).

## 4. Khả năng Khôi phục
- **Backup khả dụng:** Các file `*.dump` gần nhất trong thư mục `backups/` và `.local-audit-quarantine/` đều có timestamp từ ngày 17/07/2026 trở về trước. 
- **Tỷ lệ khôi phục:** **0%** đối với ID này từ Backup Database. Hồ sơ này được tạo vào ngày 21/07 nên không có mặt trong bất kỳ bản dump nào.
- **Phương án duy nhất:** Người dùng phải tạo lại hồ sơ trên giao diện dựa vào trí nhớ hoặc các log client/console (nếu còn).

## 5. Rủi ro còn lại & Biện pháp phòng ngừa (Safety Guard)
- Tuyệt đối nghiêm cấm việc hardcode ID để xóa dữ liệu trên môi trường QA hay Production. 
- Mọi script dọn dẹp Fixture từ nay chỉ được phép hoạt động trên các ID được sinh ra trong chính quá trình chạy script đó, hoặc phải có prefix/ký hiệu đặc biệt do chính script gắn vào (VD: `QA-SUPERVISION-RESULT-TABLE...`).

---

**Kết luận Báo cáo:** Hồ sơ `cmrsmuc5l0000r4wk7fhqp8gn` đã bị xóa vĩnh viễn do sai sót trong việc phân biệt Fixture và Dữ liệu Test thủ công của người dùng. Sự cố này không ảnh hưởng đến Production, nhưng đã làm mất dữ liệu trên môi trường QA. Các hành động mang tính phá hủy (delete) đã bị tạm dừng hoàn toàn.
