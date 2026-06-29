# VIETNAMESE_DIACRITICS_DATA_FIX_REPORT

Ngày thực hiện: 2026-06-27

## 1. Kết quả Chuẩn hóa Dữ liệu

Dựa trên kết quả Audit, toàn bộ quy trình chuẩn hóa tiếng Việt có dấu đã được thực hiện an toàn trên DB của công trình `HN-TH-2026-001`.

- **Số trường phát hiện không dấu**: 53
- **Số trường đã được khắc phục**: Toàn bộ 53 trường.
- **Trạng thái Mojibake (Lỗi font)**: 0 (Kiểm thử QA cho thấy dữ liệu hoàn toàn sạch, không có ký tự lạ UTF-8 hiển thị sai).

## 2. Chi tiết các Model & Field đã sửa

1. **Project**: `name`, `investor`, `location`, `description`.
2. **User**: Bổ sung chức danh và tên có dấu cho toàn bộ user (VD: *Giám đốc dự án phụ trách tổng thể*).
3. **DocumentFolder**: `name` (VD: *Hợp đồng*, *Bản vẽ*).
4. **Document**: `displayName` (VD: *Hồ sơ bản vẽ thiết kế thi công*).
5. **MaterialItem**: `name` (VD: *Thép D10 Hòa Phát*, *Đá 1x2*, *Cát vàng sông Lô*).
6. **Supplier**: `name` và `address` (VD: *Công ty Cổ phần Đầu tư Tây Hồ Xanh*, *Tập đoàn Hòa Phát*).
7. **Contract**: `name` (VD: *Hợp đồng tổng thầu thi công xây dựng*).
8. **PaymentRequest**: `title`, `notes`, `rejectedReason` (VD: *Thanh toán vật tư thép đợt 2*).
9. **SiteReport**: `summary`, `quality` (VD: *Nghiệm thu cốt thép dầm sàn*).
10. **ApprovalRequest**: `title`, `description`.

## 3. Dữ liệu Kỹ Thuật (Không Sửa)

Các trường sau đã được cố ý giữ nguyên định dạng không dấu/ASCII để bảo đảm tính ổn định của hệ thống:
- `Project.code`: `HN-TH-2026-001`
- `Document.storagePath` & `Document.fileName`: Đường dẫn vật lý và tên file tĩnh được sinh tự động.
- `User.email`: `hanoi.pm@construction.local`, v.v.
- Các mã kỹ thuật: `HDTC-HNTH...`, `HSTT-HNTH...`.

## 4. Tác động tới Folder Name & Permission

- **Đã đổi tên folder**: Các folder như "01. Hop dong", "02. Ban ve" đã được chuẩn hóa thành "01. Hợp đồng", "02. Bản vẽ".
- **Tính toàn vẹn Permission**: Chức năng Document Upload/Permission vẫn hoạt động chính xác vì logic trong `src/lib/documents/permissions.ts` đã sử dụng hàm `normalizeFolderName` (chuyển tiếng Việt có dấu về không dấu trước khi so sánh từ khóa).

## 5. Tác động tới Storage & Download

- **Không đổi** `storagePath` và `fileName`.
- File vật lý trong thư mục `storage/` không bị đổi tên. Chức năng Download API (được fix sử dụng `LocalStorageProvider` ở Task trước) vẫn tải file xuống chính xác.
- Đã sửa thêm lỗi TypeScript (`Buffer` casting) cho API download để Turbopack biên dịch thành công 100%.

## 6. Kết quả Kiểm thử (QA & Build)

Các lệnh sau đã chạy và nhận kết quả **PASS**:
1. `npx prisma validate` & `npx prisma generate`: Cập nhật schema an toàn.
2. `npx tsc --noEmit`: Code không có lỗi TypeScript (Đã fix lỗi liên quan đến `Document.title -> displayName`, `MaterialRequest.notes -> note`).
3. `node scripts/fix-seed-text.js`: Replace text trực tiếp trên seed script cũ, đảm bảo seed script idempotency.
4. `npx tsx scripts/update-hanoi-vietnamese-diacritics.ts`: Update dữ liệu DB real-time.
5. `npx tsx scripts/qa-hanoi-project-data-check.ts`: Script kiểm định đã tự động lọc tìm tiếng Việt và **0 lỗi mojibake**. Passed 27/27 checks.
6. `npm run build`: Hoàn thành, sinh production build thành công (Exit code 0).

## 7. Rủi ro còn lại

Không có rủi ro kỹ thuật nào về dữ liệu.
Tuy nhiên, khi người dùng (User) tự nhập liệu từ UI vào hệ thống sau này, không có validator ép buộc họ phải gõ tiếng Việt có dấu. Đây là vấn đề thuộc về thói quen người dùng, không phải lỗi hệ thống.

## 8. Hướng dẫn Test Tay (Manual UAT)

Bạn có thể chạy `npm run dev` và đăng nhập bằng tài khoản `hanoi.pm@construction.local` (MK: `HanoiSeed@2026!`), sau đó kiểm tra cảm quan hiển thị trên UI tại các màn hình:
- `/dashboard`: Tên dự án và danh sách công việc.
- `/projects`: Danh sách dự án tiếng Việt có dấu.
- `/documents`: Các thư mục và tên hồ sơ hiển thị chuyên nghiệp.
- `/materials`: Danh mục vật tư rõ ràng (VD: Cát, Đá, Xi măng).
- `/reports` & `/projects/[id]/field-progress/summary`: Nội dung nhật ký, khối lượng công việc hàng ngày hiển thị hoàn hảo.
- `/contracts` & `/accounting` & `/approvals`: Phiếu thanh toán, Hợp đồng, Đề nghị phê duyệt.
