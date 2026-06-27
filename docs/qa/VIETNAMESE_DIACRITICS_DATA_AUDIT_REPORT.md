# VIETNAMESE_DIACRITICS_DATA_AUDIT_REPORT

Ngày thực hiện: 2026-06-27

## 1. Tổng quan
Đã thực hiện quét tự động dữ liệu liên quan đến dự án `HN-TH-2026-001`. Mục tiêu là xác định các trường văn bản hiển thị trên UI cần được bổ sung dấu tiếng Việt (hiện đang là tiếng Việt không dấu).

- **Tổng số trường (fields) đã quét**: 186
- **Số trường cần thêm dấu**: 53
- **Số trường bị bỏ qua (kỹ thuật/mã)**: 38
- **Số trường bị Mojibake (lỗi font)**: 0

## 2. Danh sách dữ liệu không dấu cần sửa
Các model và trường chính cần chuẩn hóa dấu tiếng Việt bao gồm:
1. **Project**: `name` (Cong trinh...), `investor` (Cong ty...), `location` (So 88 duong...).
2. **User/ProjectMember**: `name` của seed user (Nguyen Duc Anh - Giam doc du an, v.v.).
3. **MaterialItem**: `name` (Thep D10 Hoa Phat, Xi mang Bim Son, Cat vang song Lo, Da 1x2, Day dien...).
4. **Contract**: `name` (Hop dong tong thau..., Hop dong cung cap...).
5. **Supplier**: `name` (Tap doan Hoa Phat, Cong ty Xi mang Bim Son, Tong cong ty Viglacera...), `address` (Thanh Hoa, Ha Noi...).
6. **PaymentRequest**: `title` (Dot 2 - Hoan thanh coc va mong, Thanh toan vat tu thep...).
7. **SiteReport**: `summary`, `quality` (Duy tri thi cong..., Cac hang muc nghiem thu...).
8. **DocumentFolder/Document**: `name`, `title` (Ban ve, Hop dong, Nghiem thu, v.v.).
9. **ChatMessage**: Nội dung chat liên quan đến công trình Hà Nội.

## 3. Danh sách dữ liệu không được sửa (Mã Kỹ Thuật)
Các trường sau đang dùng tiếng Việt không dấu hoặc chuỗi định danh đặc thù và đã được loại trừ khỏi quá trình chuẩn hóa để tránh ảnh hưởng đến logic của ứng dụng:
- `Project.code`: HN-TH-2026-001
- `Document.fileName`, `Document.storagePath`, `Document.objectKey`: Chứa đường dẫn vật lý và key trên storage.
- `MaterialItem.code`, `Contract.contractNo`, `PaymentRequest.requestCode`.
- `User.email`: hanoi.pm@construction.local, v.v.

## 4. Dữ liệu lỗi Encoding/Mojibake
- **Kết quả**: 0 (Không tìm thấy chuỗi bị hỏng font như `CÃ´ng`). Dữ liệu hiện đang ở chuẩn tiếng Việt không dấu (ASCII tinh khiết).

## 5. Chiến lược sửa an toàn
Để đạt tiêu chuẩn hoàn thành, chiến lược sửa bao gồm 2 bước:
1. **Cập nhật Seed Script**: Sửa toàn bộ text hiển thị trong mảng dữ liệu seed của `scripts/seed-hanoi-full-project.ts` để đảm bảo những lần seed sau, dữ liệu sinh ra sẽ đúng 100% tiếng Việt có dấu.
2. **Update Dữ liệu Hiện Tại**: Thay vì phải xoá trắng DB và chạy lại seed (gây mất dữ liệu người dùng test, nếu có), tôi sẽ tạo script `scripts/update-hanoi-vietnamese-diacritics.ts` để đọc và cập nhật các bảng `Project`, `User`, `MaterialItem`, `Contract`, `Supplier`, `PaymentRequest`, `SiteReport`, v.v. tương ứng. Script này sẽ map dữ liệu không dấu cũ thành có dấu mới, sử dụng hàm string replace.
3. **Mã Path/ObjectKey**: Tuyệt đối giữ nguyên không thay đổi các cột `storagePath`, `fileName`, và các ID.

## 6. Rủi ro về Tên Thư Mục (Folder Name)
- Nếu thay đổi `DocumentFolder.name` (VD: từ "01. Hop dong" sang "01. Hợp đồng"), điều này có thể ảnh hưởng đến logic check quyền nếu quyền upload được gán cứng theo chuỗi (ASCII). 
- Tuy nhiên, trong file `src/lib/documents/permissions.ts` đã có hàm `normalizeFolderName` khử dấu tiếng Việt trước khi so khớp keywords: `name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()`. Do đó, việc đổi tên thư mục sang có dấu hoàn toàn an toàn về mặt logic phân quyền.

## 7. Kết luận
- **Phán quyết**: **An toàn để tiến hành sửa.**
- Code logic và Storage objectKeys không bị ảnh hưởng. Sẽ tiến hành cập nhật seed script và script map dữ liệu cho DB ngay sau báo cáo này.
