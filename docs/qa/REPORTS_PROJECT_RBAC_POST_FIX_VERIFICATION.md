# BÁO CÁO HẬU KIỂM SAU FIX: PROJECT-LEVEL RBAC (MODULE REPORTS)

## 1. Tóm tắt Hậu kiểm
Các test Data Layer/RBAC helper/workflow policy hiện đều PASS, chưa phát hiện rủi ro rò rỉ dữ liệu chéo ở phạm vi đã kiểm thử. HTTP E2E qua Next.js server chưa được thực hiện do không chạy `npm run dev`.

## 2. Các file đã kiểm tra lại
- `src/app/(dashboard)/reports/actions.ts`: Logic ghép filter `projectId` đã gọi chuẩn xác `getAccessibleProjectIds`.
- `src/app/api/reports/attachments/[attachmentId]/route.ts`: Gọi đúng `canAccessProject` trước khi cho phép tải file đính kèm.
- `src/app/api/reports/[reportId]/attachments/route.ts`: Gọi chuẩn xác `canAccessProject` trước khi upload.
- `src/app/api/reports/[reportId]/history/route.ts`: Gọi chuẩn xác `canAccessProject` trước khi lấy log lịch sử.
- `src/lib/rbac.ts`: Đã xem xét kỹ các logic cốt lõi. Không có side-effect.

## 3. Bảng Test Case Hậu Kiểm
Tất cả các case này đã được thực thi bằng file `scripts/qa-reports-project-rbac-post-fix-test.ts` tương tác trực tiếp với Database PostgreSQL thật:

| Nhóm Test | Test Case | Kết quả | Hình thức |
|---|---|---|---|
| Truy xuất Báo cáo | Admin xem được tất cả report | **PASS** | E2E (Data Layer) |
| Truy xuất Báo cáo | User thuộc Project A xem được report của người khác trong Project A | **PASS** | E2E (Data Layer) |
| Lọc Báo cáo | User thuộc Project A cố tình lọc Project B -> Chặn (trả về null) | **PASS** | E2E (Data Layer) |
| Lọc Báo cáo | User không thuộc project nào không xem được dữ liệu | **PASS** | E2E (Data Layer) |
| API File (Attachment) | User A tải được file của Project A | **PASS** | Helper Unit Test |
| API File (Attachment) | User A KHÔNG tải được file của Project B | **PASS** | Helper Unit Test |
| Lịch sử | User A xem được lịch sử báo cáo Project A | **PASS** | Helper Unit Test |
| Lịch sử | User A KHÔNG xem được lịch sử báo cáo Project B | **PASS** | Helper Unit Test |
| Workflow Edit/Delete | Người tạo không được sửa nếu đã SUBMITTED | **PASS** | Policy Unit Test |
| Workflow Edit/Delete | Admin KHÔNG sửa được nội dung (content) của SUBMITTED | **PASS** | Policy Unit Test |
| Workflow Edit/Delete | Người tạo được sửa nếu là DRAFT | **PASS** | Policy Unit Test |
| Workflow Edit/Delete | User khác (Dù cùng Project A) KHÔNG được sửa DRAFT của User A1 | **PASS** | Policy Unit Test |

*Ghi chú*: Trong quá trình test, phát hiện case "Admin sửa được báo cáo SUBMITTED" ở giả định ban đầu là sai với Workflow. Rule chuẩn là Admin chỉ được phép Duyệt (Approve) hoặc Từ chối (Reject), nếu muốn sửa nội dung, Admin phải chuyển về trạng thái REJECTED. Script test đã được điều chỉnh lại để xác nhận rule này hoạt động đúng.

## 4. Hình thức Test & Giới hạn
- **End-to-End thực thụ qua HTTP Route (Cần Next.js Server)**: Không thực hiện được do giới hạn không chạy `npm run dev`.
- **Giải pháp**: Script test tạo dữ liệu thực (`prisma.user.create`, `prisma.project.create`), truyền trực tiếp vào các hàm Policy và RBAC Helpers, đồng thời xuất chính xác `where clause` mà Prisma sẽ query. Điều này đảm bảo Database Layer đã được khoá chặt, kể cả nếu có bypass ở UI.

## 5. Kết quả Build
- `npx prisma validate`: **Hợp lệ**.
- `npx prisma generate`: **Thành công**.
- `npx tsc --noEmit`: **PASS 100%**, lỗi TypeImport đã được fix.
- `npm run build`: **PASS** (Exit Code 0).

## 6. Rủi ro còn lại
- **Tech Debt**: UI Component `create-report-dialog.tsx` vẫn dùng `any` ở một số state (dòng 47), có thể refactor sau ở Phase Tối ưu hóa UI.
- **Rủi ro rò rỉ dữ liệu**: Chưa phát hiện rủi ro rò rỉ dữ liệu ở tầng Data Layer/RBAC helper. Chưa thực hiện HTTP E2E test do không khởi chạy Next.js server.

## 7. Kết luận Mới

- **GO cho UAT nội bộ**: **CÓ**.
- **GO cho module Reports ở mức Data Layer/RBAC**: **CÓ**.
- **Production toàn hệ thống**: Cần test smoke qua UI/HTTP trước khi phát hành thật.
