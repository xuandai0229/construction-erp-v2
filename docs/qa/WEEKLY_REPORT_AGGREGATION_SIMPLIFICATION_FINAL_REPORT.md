# WEEKLY REPORT AGGREGATION SIMPLIFICATION – FINAL REPORT

## Status

**PASS CÓ ĐIỀU KIỆN**. Mã nguồn đã chuyển sang tổng hợp trực tiếp, build production thành công; corrective migration chưa được áp dụng vào QA.

## Evidence

| Check | Command | Exit code | Result |
| --- | --- | ---: | --- |
| Database inventory | `npx tsx scripts/qa/inspect-executive-weekly-report-database.ts` | 0 | Bốn bảng legacy tồn tại nhưng đều có 0 dòng; migration `20260727170000_add_executive_weekly_report` đã áp dụng. |
| Production build and typecheck | `npm run build` | 0 | Không còn route `/reports/executive`; có `/reports/field/weekly-summary` và `/api/reports/weekly-summary/export`. |
| Prisma migrate status | `npx prisma migrate status` | 1 | Blocked: sandbox chặn Prisma tải schema engine. |

## Delivered changes

- Gỡ card “Báo cáo họp tuần”, switcher, routes, wizard, service, tests và task integration của phân hệ cũ.
- Nút `Tổng hợp báo cáo tuần` chỉ hiển thị ở tab báo cáo tuần của `/reports/field` cho `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`.
- Tuần được định danh bằng Thứ Hai–Chủ Nhật tại múi giờ Việt Nam; route xem dùng `weekStart`.
- Tổng hợp chỉ đọc `SiteReport.type = WEEKLY`, ưu tiên `APPROVED`, rồi `SUBMITTED`, và vẫn liệt kê công trình chưa nộp.
- Route xem và export Word đều kiểm tra RBAC ở server; không tạo bản ghi tổng hợp.
- Corrective migration `20260728110000_remove_executive_weekly_reports` xóa đúng bốn bảng legacy cùng enum khi được triển khai.

## Remaining conditions

- Chưa chạy corrective migration trên QA/production.
- Chưa chạy Playwright runtime; không có screenshot hoặc tệp export QA được lưu.
- Migration cũ đã áp dụng phải được giữ nguyên trong migration history khi triển khai corrective migration.

## Production decision

**NO-GO cho đến khi** kiểm tra migration được thực hiện trong môi trường có Prisma engine, corrective migration được review/applied, và Playwright runtime xác nhận RBAC, in/PDF, Word export.
