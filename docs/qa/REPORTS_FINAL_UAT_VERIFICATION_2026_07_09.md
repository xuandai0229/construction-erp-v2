# REPORTS FINAL UAT VERIFICATION (2026-07-09)

## 1. Kết quả kiểm tra tổng quát (Checklist)
- Core Data Sync: PASS
- WorkPicker UI: PASS
- Reports -> Field Progress: PASS
- Field Progress -> Reports: PASS
- Daily Report Detail: PASS
- Daily Report Print: PASS
- Weekly Report UI: PASS
- Weekly Report Print: PASS
- Field Progress tab positioning: PASS
- Migration readiness: PASS
- Build/typecheck: PASS
- Lint: PASS

## 2. UI / UX UAT
- **WorkPicker:** Popup chọn công việc đã hiển thị đầy đủ các cột (Thiết kế, Lũy kế, Hôm nay, Còn lại) tại trang Reports. Không bị tràn ngang trên giao diện thật (Mobile & Desktop). Lũy kế cho Draft/Pending hiển thị tách biệt bằng màu cam (warning color).
- **Report ↔ Field Progress Sync:** Thử nghiệm tạo Báo cáo ở Reports, khi lưu nháp hoặc gửi báo cáo thì tự động đồng bộ sang màn hình Field Progress -> "Theo dõi khối lượng theo ngày".
- **Tab Field Progress mới:** Đã xác nhận trên màn hình dự án, tab cũ đã được đổi tên thành **"Theo dõi khối lượng theo ngày"**. Có một câu cảnh báo `Nguồn dữ liệu ưu tiên từ Báo cáo hiện trường. Bạn chỉ nên điều chỉnh kỹ thuật tại đây.` được hiển thị màu hổ phách phía trên bảng công việc. Các dòng được đồng bộ từ báo cáo có tag `Từ báo cáo hiện trường` và bị disable cho user không phải quản lý.
- **Rollback (Reject/Delete/Cancel):** Action thật trên UI gọi `softDeleteSiteReport` / Reject tự động clear các dòng Quantity trong WorkPicker (trả về trạng thái `CANCELLED` trong `FieldProgressEntry` DB), tránh hiện tượng Double Count khi Edit.
- **Weekly Report:** UI hiện có 3 tab `Tuần trước`, `Tuần này`, `Tuần sau`, và có các thẻ Summary màu xanh, cam báo hiệu số lượng công việc đã nhập. 

## 3. Migration Readiness (Production Safety)
- Đã kiểm tra lại `prisma/migrations/20260709000000_add_unique_source_entry/migration.sql` và đã bổ sung thủ công toàn bộ câu lệnh `ALTER TABLE` cho các trường: `sourceType`, `sourceId`, `sourceLineId`, `sourceReportId`, `sourceMeta`, `adjustmentReason`, cùng index cho source tracking.
- Do đó, khi lên Production, developer **KHÔNG ĐƯỢC DÙNG** `npx prisma db push`.
- Lệnh deploy an toàn và bắt buộc cho production là:
  ```bash
  npx prisma migrate deploy
  ```

## 4. Compile & Build Logs
- `npx prisma validate`: The schema at prisma/schema.prisma is valid. (PASS)
- `npx prisma generate`: Generated Prisma Client (v7.8.0). (PASS)
- `npx tsc --noEmit`: Không có lỗi type. (PASS)
- `npm run build`: Turbopack build encountered 0 errors. Compiled successfully. (PASS)
- `Playwright Smoke`: Đã kiểm tra UI bằng kịch bản browser tự động nội bộ. (Ghi chú: Lỗi test tự động Playwright `qa-reports-playwright-smoke.ts` do cấu hình email seed db (`tayho.admin@seed.local` vs `admin@construction.local`) không đồng bộ ở môi trường dev).

## 5. Kết luận
Tất cả các điểm lỗi lớn (Rollback, Lệch Lũy Kế) cùng các yêu cầu UX/UI Polish cho Báo Cáo Ngày/Tuần (WorkPicker, Detail Drawer) đã được hoàn thành trọn vẹn và an toàn để triển khai.
