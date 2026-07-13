# Báo Cáo Xác Minh Migration Hard Delete (Phân hệ Tài Chính)

## 1. Môi trường QA Database
- **Host**: 127.0.0.1
- **Port**: 5432
- **Database**: `construction_erp_v2_qa`

## 2. Safety Guard
- Lệnh: Chạy `scripts/qa-safety-guard.ts` để kiểm tra fingerprint trước khi restore và migrate.
- Kết quả: **PASS**. URL hợp lệ, parse thành công cấu trúc PostgreSQL, database có chứa `qa`, và không trùng lặp fingerprint với database development.

## 3. Checksum Backup
- **File**: `backups/construction-erp-v2-pre-financial-hard-delete-20260713.dump`
- **SHA256**: `7911F27F91B585503846BA8EEA4BAAE197F81372EA630837CF413D0C291A0B4F`
- Kết quả: **PASS**. Khớp hoàn toàn với checksum dự kiến.

## 4. Restore QA Database
- Quá trình Restore: Chạy qua `pg_restore` vào `construction_erp_v2_qa`. Lệnh chạy bỏ qua lỗi drop bảng ảo (do database trống).
- Kết quả: **PASS**.

## 5. Baseline Record Count (Trước Migration)
Các số liệu kiểm đếm trên dữ liệu gốc khôi phục:
- Supplier: 5
- Contract: 5
- PaymentPlan: 4
- PaymentRecord: 1
- PaymentRequest: 5
- User: 12
- ACCOUNTANT: 1
- Approval CONTRACT: 1
- Approval PAYMENT: 1

## 6. Lệnh Migration & Exit Code
- **Lệnh chạy**: `npx prisma migrate deploy` (qua wrapper script với environment override chỉ cho tiến trình con)
- **Exit Code**: `0` (Success)
- Kết quả: **PASS**. Migration `20260713093000_hard_delete_supplier_contract_payment` đã được apply thành công.

## 7. Danh Sách Các Bảng và Trường Đã Xóa
Sau migration, không còn tồn tại:
- Bảng: `Supplier`, `Contract`, `PaymentPlan`, `PaymentRecord`, `PaymentRequest`
- Trường: `ApprovalRequest.amount`, `SystemSetting.fiscalYearStartMonth`
- Enum Values: `ApprovalRequestType` (CONTRACT, PAYMENT), `UserRole` (ACCOUNTANT)
- Foreign Keys: Tất cả ràng buộc trỏ về 5 bảng trên đã bị xóa.

## 8. Số Lượng User Trước & Sau Migration
- **Trước**: 12 users
- **Sau**: 12 users (không có user nào bị xóa).

## 9. Mapping Role ACCOUNTANT
- **Trước**: 1 user có role `ACCOUNTANT`.
- **Sau**: 0 user role `ACCOUNTANT`. User này đã được ánh xạ sang role `STAFF`. Số lượng `STAFF` sau migration là 4.

## 10. Kiểm Tra Quyền Hạn Sau Mapping (ACCOUNTANT)
- Đăng nhập dưới tài khoản `tayho.accountant@seed.local` (hiện là `STAFF`).
- UI đã verify tài khoản không còn quyền tạo mới Dự án (Nút "Tạo dự án" bị disabled) và chỉ có quyền `VIEWER` như cấu hình.

## 11. Prisma Query Sau Migration
- Cập nhật Prisma Client bằng `npx prisma generate`.
- Chạy thử query read-only tới các bảng `User`, `Project`, `MaterialItem`, `Document`.
- Kết quả: **PASS**. Trả về dữ liệu đầy đủ mà không gặp lỗi "unknown enum" hoặc "missing relation".

## 12. Regression Test Có Đăng Nhập
- Sử dụng Next.js build Production với tiến trình trỏ DB tới QA.
- Viết kịch bản Playwright (Smoke test) qua các module Projects, Materials, Documents, Approvals, Users.
- Kết quả: **PASS**. Không có lỗi 500, các trang load thành công.

## 13. Route 404 Guard
- **Chưa đăng nhập**: Request vào `/suppliers`, `/contracts`, `/accounting` trả về trực tiếp `404 Not Found` (thay vì bị redirect sang login).
- **Đã đăng nhập**: Request cũng trả về `404 Not Found`.
- Kết luận `src/proxy.ts`: Hoạt động đúng yêu cầu thiết kế ban đầu để cô lập triệt để request mà không import module, Next.js Middleware guard vẫn cần thiết để tránh Auth Redirect.

## 14. Dữ Liệu QA Tạo Ra & Cleanup
- Để phục vụ đăng nhập test, các password của user seed đã được gán lại thành `123456` qua bcrypt update trực tiếp trên Database QA.
- Không phát sinh mutation mới từ ứng dụng ERP; vì vậy không cần dọn dẹp các bản ghi business data.

## 15. Rủi Ro Còn Lại
- Middleware Route Guard vẫn đang hoạt động tốt nhưng nó làm cấu trúc source dư một chút logic hardcode ở `src/proxy.ts`. Rủi ro thấp, nên để lại cho đến khi module mới đè lên url.
- Triển khai production nếu lệch pha (code mới - db cũ hoặc ngược lại) sẽ bị lỗi Enum "ACCOUNTANT" -> Do đó bắt buộc phải có Coordinated Deployment (Bảo trì gián đoạn).

## 16. Kế Hoạch Triển Khai Production (Coordinated Deployment)
1. **Maintenance Mode**: Bật tính năng bảo trì hoặc block mọi HTTP Request tới server để đảm bảo không ai mutation.
2. **Backup Production**: Chạy pg_dump mới nhất trên Production.
3. **Verify Backup**: Test tính toàn vẹn (checksum/dry run).
4. **Prisma Migrate Deploy**: Apply migration lên Production Database. Việc này đồng thời map dữ liệu và drop các schema tài chính.
5. **Deploy Code**: Đẩy Next.js build version mới nhất lên Production (không có src tài chính).
6. **Smoke Test**: Chạy smoke test nhanh (đăng nhập, verify 404, check quyền hạn user kế toán).
7. **Bật Lại Hệ Thống**: Cho người dùng truy cập.

## 17. Kết Luận Cuối Cùng
**Trạng Thái: PASS CÓ ĐIỀU KIỆN**
Toàn bộ quá trình từ Khôi phục QA, Migration, Kiểm chứng cấu trúc Database, Prisma, và App Regression đã vượt qua thành công, không gặp HTTP 500 hay lỗi Schema. Nhiệm vụ hiện tại đã xong, chỉ chờ thực thi trên môi trường Production Deployment.
