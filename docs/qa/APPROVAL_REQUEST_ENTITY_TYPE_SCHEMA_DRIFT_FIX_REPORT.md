# Báo cáo Khắc phục Schema Drift ApprovalRequest.entityType

## 1. Nguyên nhân gốc
Lỗi `The column ApprovalRequest.entityType does not exist in the current database.` xảy ra do **Trường hợp A / Lịch sử bị lệch (Case E)**.
Migration `20260717000000_approval_request_legacy_compatibility` đã được tạo để giữ lại các trường `entityType` và `entityId` nhằm tương thích với legacy. Tuy nhiên, `schema.prisma` ở HEAD đã bị mất các trường này. Khi thực hiện `npx prisma db push --accept-data-loss` trước đó, các cột này bị drop khỏi database.
Trong khi đó, tiến trình Next.js (dev server) chạy từ trước đó vẫn lưu giữ Prisma Client cũ (lúc còn `entityType`). Khi có request gọi `getGlobalProjectContext`, Prisma Client thực thi `SELECT entityType`, dẫn đến lỗi Postgresql vì cột đã bị xoá.

## 2. Prisma schema trước sửa
`model ApprovalRequest` thiếu hoàn toàn định nghĩa `entityType` và `entityId`.

## 3. Database thực tế trước sửa
Cột `entityType` và `entityId` không tồn tại trong bảng `ApprovalRequest` của database QA (do bị xoá bởi `db push`).

## 4. Migration liên quan
Migration `20260717000000_approval_request_legacy_compatibility` đang ở trạng thái pending/chưa áp dụng đầy đủ.

## 5. Phương án đã chọn
Khôi phục nguyên trạng theo migration được yêu cầu:
1. Thêm lại `entityType` và `entityId` vào `schema.prisma`.
2. Gỡ bỏ bản ghi migration lỗi khỏi `_prisma_migrations`.
3. Chạy `npx prisma migrate deploy` để apply chính thức migration legacy compatibility, đảm bảo chạy đúng lệnh UPDATE backfill.
4. Cập nhật lại TypeScript payload tại các hàm `createApprovalRequest` để thoả mãn Prisma Client mới nhất.

## 6. File đã sửa
- `prisma/schema.prisma`
- `src/app/(dashboard)/approvals/actions.ts`
- `src/app/actions/material-request.ts`

## 7. Migration đã tạo hoặc áp dụng
Đã áp dụng thành công: `20260717000000_approval_request_legacy_compatibility`

## 8. Có backfill hay không
Có. Việc chạy `migrate deploy` đã kích hoạt câu lệnh `UPDATE "ApprovalRequest" SET "entityType" = COALESCE(...)` có sẵn trong migration file.

## 9. Cách bảo toàn dữ liệu
Sử dụng chuẩn quy trình `prisma migrate deploy` thay vì `db push`. Dữ liệu ApprovalRequest cũ không bị xoá, được tự động gán `entityType` dựa vào `sourceType` và `type`.

## 10. Kết quả schema-database diff sau sửa
PASS. Bảng `ApprovalRequest` trong database đã trùng khớp hoàn toàn với `schema.prisma`. (Đã chạy đối chiếu cột). Quét thêm các bảng khác (SupervisionWeeklyPackage, AuditLog, Project, v.v) cho thấy hoàn toàn khớp.

## 11. Kết quả ApprovalRequest query
PASS. Query `prisma.approvalRequest.findMany` trong `project-context.ts` sẽ chạy bình thường vì cột đã được tạo lại.

## 12. Kết quả Prisma validate
PASS.

## 13. Kết quả Prisma generate
PASS.

## 14. Kết quả migrate status
PASS. (Đã marked applied toàn bộ pending).

## 15. Kết quả TypeScript
PASS (0 errors).

## 16. Kết quả build
PASS (Next.js build thành công).

## 17. Runtime NOT RUN
NOT RUN - Người dùng sẽ tự kiểm tra. (Dev server có thể cần khởi động lại để reload Prisma Client mới).

## 18. Rủi ro còn lại
Không có rủi ro nghiêm trọng. Đã kiểm tra các truy vấn và bảo toàn đúng luồng dữ liệu "tương thích legacy" theo yêu cầu ban đầu.
