# Báo cáo runtime — Báo cáo tuần Giám sát

## Kết luận

**DONE: runtime và các kiểm tra chính đã pass trên local QA.**

## Nguyên nhân gốc

`schema.prisma` và Prisma Client đều đã có model `SupervisionWeeklyDossier`, nhưng migration `20260720143000_supervision_weekly_rebuild` chưa được áp vào database mà Next.js runtime sử dụng. Vì vậy `findMany()` được sinh từ schema hợp lệ nhưng PostgreSQL chưa có bảng `public."SupervisionWeeklyDossier"`; build pass không chứng minh được runtime pass.

## Database target đã xác minh

- Nguồn cấu hình: `.env` (không có `.env.local` được dùng).
- Host: `127.0.0.1`; port: `5432`.
- Database: `construction_erp_v2_qa`; schema: `public`.
- Đây là PostgreSQL local có tên QA, vì vậy được phép nâng cấp theo quy trình migration. Không dùng production, không in connection string hoặc bí mật.
- `prisma.config.ts`, Prisma CLI và Next dev server đều dùng `DATABASE_URL` từ `.env`.

## Migration và schema thực tế

Trước deploy, truy vấn chỉ đọc `_prisma_migrations`, `to_regclass` và `information_schema.tables` cho kết quả:

- Migration không có trong history: `NOT_IN_HISTORY`.
- `to_regclass('public."SupervisionWeeklyDossier"')` là `null`.
- Không có tám bảng Supervision Weekly mới.

Đã chạy thành công (exit code 0):

```text
npx prisma migrate deploy
```

Migration được áp: `20260720143000_supervision_weekly_rebuild`. Sau deploy:

- `npx prisma migrate status`: `Database schema is up to date!`.
- Migration history là `APPLIED`, không có log lỗi hay rollback.
- `to_regclass` trả về `"SupervisionWeeklyDossier"`.
- Tám bảng hiện diện trong `public`: `SupervisionWeeklyDossier`, `Entry`, `Quantity`, `Transition`, `Progress`, `Observation`, `Attachment`, `Revision`.
- Đã đối chiếu cột dossier: `id`, `reportNumber`, `weekStart`, `weekEnd`, `status`, `version`, `lockVersion`, `updatedAt`, `deletedAt`, `createdById` và các cột relation/timestamp liên quan.

Migration chỉ tạo enum, bảng, index và foreign key mới; không có `DROP`, `TRUNCATE`, reset, sửa migration history hay xóa dữ liệu/legacy table/role.

## Sửa code bổ sung

- Thêm readiness guard 30 giây cho phân hệ bằng `to_regclass` chỉ đọc. UI phân biệt: đang tải, chưa áp migration, không kết nối được database, thiếu quyền database và lỗi chưa xác định; không trả danh sách rỗng giả.
- Guard chỉ chuyển trạng thái thiếu bảng thành `MIGRATION_NOT_APPLIED`; lỗi kết nối/quyền được phân loại riêng và lỗi kỹ thuật vẫn được log ở server.
- Khởi động lại Next dev server sau `prisma generate`; không xóa source hoặc dữ liệu. Không cần xóa `.next`.
- Sửa mapping ngày calendar của editor để không dịch ngày do `toISOString()`; đây là lỗi thực tế làm autosave/lịch bị lệch sau reload.
- Bỏ `catch(() => null)` ở trang editor để không che lỗi database/authorization không liên quan.

## Runtime/Playwright thực tế

Đã chạy `scripts/qa/verify-supervision-weekly-runtime.ts` bằng Playwright headless trên Next dev server local, với session tạm thời ký từ một tài khoản QA `SUPERVISION_HEAD` đang hoạt động. Script không in token, danh tính hoặc connection string.

Kết quả PASS:

- `/supervision/weekly` trả HTTP 200, hiển thị danh sách, không có page error/console error trong luồng test.
- `SUPERVISION_HEAD` tạo hồ sơ QA, thêm một dòng lịch thủ công, autosave, reload editor và đọc lại dữ liệu đã lưu.
- Danh sách đọc lại đúng hồ sơ QA trước cleanup.
- Kiểm tra trực tiếp lại bản ghi/entry trong database; sau đó cleanup bằng `deletedAt` (soft-delete), không hard-delete.
- Một tài khoản role không được cấp quyền bị redirect từ `/supervision/weekly` sang `/dashboard`.
- Các route hồi quy `/dashboard`, `/projects`, `/reports`, `/materials`, `/documents` đều trả HTTP 200 trong cùng session QA.

Ảnh Playwright: `docs/qa/SUPERVISION_WEEKLY_RUNTIME_PLAYWRIGHT.png`.

## Kiểm tra hồi quy

| Lệnh | Kết quả |
| --- | --- |
| `npx prisma validate` | PASS, exit 0 |
| `npx prisma generate` | PASS, exit 0 |
| `npx prisma migrate status` | PASS, schema up to date |
| `npx tsc --noEmit` | PASS, exit 0 |
| Scoped ESLint (`src/app/(dashboard)/supervision/weekly`, `src/components/supervision-weekly`, `src/lib/supervision-weekly`) | PASS, exit 0 |
| `npx tsx --test tests/supervision-weekly/date.test.ts` | PASS, 2/2 |
| `npm run build` | PASS, exit 0 |

Build còn một warning cũ ở `src/app/api/reports/attachments/[attachmentId]/route.ts` về traced filesystem của Turbopack; không thuộc module Giám sát và không chặn build/runtime.

## Rủi ro còn lại

- Báo cáo tiếp theo đã dùng Microsoft Word COM để render DOCX tham chiếu và đã kiểm tra trực quan preview/PDF runtime. Kết quả chi tiết nằm tại `docs/qa/SUPERVISION_WEEKLY_RESULT_TABLE_EDITOR_FINAL_REPORT.md`.
- Không tuyên bố pixel-perfect; cấu trúc A4 ngang, thứ tự mục, số cột và data flow editor → database → reload → preview → PDF đã được kiểm thử đầy đủ.
